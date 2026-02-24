from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'routes_intl_secret_key_2024')
JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

WORKFLOW_STAGES = [
    "Incoming", "Employer Submission", "Interview", "Offer Letter",
    "Signed Offer", "Outgoing Attestation", "Dataflow Processing",
    "Prometric Preparation", "Prometric Done", "Return", "Medical",
    "VFS", "VISA", "Exit"
]

# ===== Models =====
class LoginRequest(BaseModel):
    username: str
    password: str

class StaffCreate(BaseModel):
    username: str
    password: str
    full_name: str

class CandidateCreate(BaseModel):
    name: str
    passport_number: str
    application_id: Optional[str] = None

class IncomingCreate(BaseModel):
    candidate_id: str
    candidate_name: str
    documents: List[str]
    date: str
    staff_name: str

class OutgoingCreate(BaseModel):
    candidate_id: str
    candidate_name: str
    destination: str
    date: str
    remarks: Optional[str] = ""

class ReturnCreate(BaseModel):
    candidate_id: str
    candidate_name: str
    return_date: str
    remarks: Optional[str] = ""

class ExitCreate(BaseModel):
    candidate_id: str
    candidate_name: str
    documents: List[str]
    exit_date: str

class PaymentCreate(BaseModel):
    candidate_id: str
    candidate_name: str
    transaction_id: str
    date: str
    account_holder: str
    amount: float
    notes: Optional[str] = ""

class StageUpdate(BaseModel):
    stage: str
    status: str
    notes: Optional[str] = ""

class LockStageRequest(BaseModel):
    stage: str
    lock: bool

class DueDateUpdate(BaseModel):
    stage: str
    due_date: str

class QuickActionRequest(BaseModel):
    stage: str
    action: str
    due_date: Optional[str] = None
    remarks: Optional[str] = None
    lock: Optional[bool] = None

# ===== Auth helpers =====
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(data: dict) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc).timestamp() + 86400}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_staff_or_admin(user=Depends(get_current_user)):
    if user["role"] not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return user

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# ===== Startup =====
@app.on_event("startup")
async def startup():
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": hash_password("admin"),
            "role": "admin",
            "full_name": "System Admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info("Default admin user created")

# ===== Auth Routes =====
@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    ip = get_client_ip(request)
    user = await db.users.find_one({"username": req.username}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "action": "login_failed",
            "username": req.username,
            "ip_address": ip,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": "Invalid credentials"
        })
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"id": user["id"], "role": user["role"]})
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "login_success",
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "ip_address": ip,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"]
        }
    }

@api_router.post("/auth/logout")
async def logout(request: Request, user=Depends(get_current_user)):
    ip = get_client_ip(request)
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "logout",
        "user_id": user["id"],
        "username": user["username"],
        "ip_address": ip,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "role": user["role"], "full_name": user["full_name"]}

# ===== Admin Routes =====
@api_router.get("/admin/dashboard-stats")
async def get_dashboard_stats(user=Depends(require_admin)):
    total = await db.candidates.count_documents({})
    stage_counts = {}
    for stage in WORKFLOW_STAGES:
        count = await db.candidates.count_documents({"current_stage": stage})
        stage_counts[stage] = count
    staff_count = await db.users.count_documents({"role": "staff"})
    pending_payments = await db.payments.count_documents({"approved": False})
    approved_payments = await db.payments.count_documents({"approved": True})
    return {
        "total_candidates": total,
        "stage_counts": stage_counts,
        "staff_count": staff_count,
        "pending_payments": pending_payments,
        "approved_payments": approved_payments
    }

@api_router.get("/admin/staff")
async def list_staff(user=Depends(require_admin)):
    staff = await db.users.find({"role": "staff"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return staff

@api_router.post("/admin/staff")
async def create_staff(req: StaffCreate, user=Depends(require_admin)):
    existing = await db.users.find_one({"username": req.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    staff_data = {
        "id": str(uuid.uuid4()),
        "username": req.username,
        "password_hash": hash_password(req.password),
        "role": "staff",
        "full_name": req.full_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(staff_data)
    return {"id": staff_data["id"], "username": req.username, "full_name": req.full_name, "role": "staff"}

@api_router.delete("/admin/staff/{staff_id}")
async def delete_staff(staff_id: str, user=Depends(require_admin)):
    result = await db.users.delete_one({"id": staff_id, "role": "staff"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted"}

@api_router.get("/admin/audit-logs")
async def get_audit_logs(user=Depends(require_admin)):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return logs

@api_router.get("/admin/search")
async def global_search(q: str, user=Depends(require_admin)):
    candidates = await db.candidates.find(
        {"name": {"$regex": q, "$options": "i"}}, {"_id": 0}
    ).to_list(100)
    results = []
    for candidate in candidates:
        cid = candidate["id"]
        incoming = await db.incoming_register.find({"candidate_id": cid}, {"_id": 0}).to_list(100)
        outgoing = await db.outgoing_register.find({"candidate_id": cid}, {"_id": 0}).to_list(100)
        returns = await db.return_register.find({"candidate_id": cid}, {"_id": 0}).to_list(100)
        exits = await db.exit_register.find({"candidate_id": cid}, {"_id": 0}).to_list(100)
        payments = await db.payments.find({"candidate_id": cid}, {"_id": 0}).to_list(100)
        results.append({
            **candidate,
            "incoming_records": incoming,
            "outgoing_records": outgoing,
            "return_records": returns,
            "exit_records": exits,
            "payment_records": payments
        })
    return results

@api_router.put("/admin/candidates/{candidate_id}/unlock-stage")
async def admin_unlock_stage(candidate_id: str, req: LockStageRequest, user=Depends(require_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    locked_stages = candidate.get("locked_stages", [])
    if req.lock:
        if req.stage not in locked_stages:
            locked_stages.append(req.stage)
    else:
        locked_stages = [s for s in locked_stages if s != req.stage]
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"locked_stages": locked_stages, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Stage {req.stage} {'locked' if req.lock else 'unlocked'}"}

# ===== Candidate Routes =====
@api_router.get("/candidates")
async def list_candidates(user=Depends(require_staff_or_admin)):
    candidates = await db.candidates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return candidates

@api_router.post("/candidates")
async def create_candidate(req: CandidateCreate, user=Depends(require_staff_or_admin)):
    app_id = req.application_id or f"APP-{uuid.uuid4().hex[:8].upper()}"
    candidate = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "passport_number": req.passport_number,
        "application_id": app_id,
        "current_stage": "Incoming",
        "current_stage_index": 0,
        "stages_completed": [],
        "locked_stages": [],
        "stage_details": {},
        "created_by": user["id"],
        "created_by_name": user.get("full_name", user["username"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.candidates.insert_one(candidate)
    candidate.pop("_id", None)
    return candidate

@api_router.get("/candidates/search/{name}")
async def search_candidates(name: str, user=Depends(require_staff_or_admin)):
    candidates = await db.candidates.find(
        {"name": {"$regex": name, "$options": "i"}}, {"_id": 0}
    ).to_list(50)
    return candidates

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, user=Depends(require_staff_or_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@api_router.get("/candidates/{candidate_id}/full")
async def get_candidate_full(candidate_id: str, user=Depends(require_staff_or_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    incoming = await db.incoming_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    outgoing = await db.outgoing_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    returns = await db.return_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    exits = await db.exit_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    payments = await db.payments.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    return {
        **candidate,
        "incoming_records": incoming,
        "outgoing_records": outgoing,
        "return_records": returns,
        "exit_records": exits,
        "payment_records": payments
    }

@api_router.put("/candidates/{candidate_id}/stage")
async def update_stage(candidate_id: str, req: StageUpdate, user=Depends(require_staff_or_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if req.stage in candidate.get("locked_stages", []) and user["role"] != "admin":
        raise HTTPException(status_code=403, detail=f"Stage '{req.stage}' is locked. Only admin can edit.")
    stage_details = candidate.get("stage_details", {})
    stage_details[req.stage] = {
        "status": req.status,
        "notes": req.notes or "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("full_name", user["username"])
    }
    stages_completed = candidate.get("stages_completed", [])
    current_stage_index = candidate.get("current_stage_index", 0)
    if req.status == "completed" and req.stage not in stages_completed:
        stages_completed.append(req.stage)
        stage_idx = WORKFLOW_STAGES.index(req.stage) if req.stage in WORKFLOW_STAGES else -1
        if stage_idx >= current_stage_index and stage_idx + 1 < len(WORKFLOW_STAGES):
            current_stage_index = stage_idx + 1
    new_stage = WORKFLOW_STAGES[current_stage_index] if current_stage_index < len(WORKFLOW_STAGES) else "Completed"
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {
            "stage_details": stage_details,
            "stages_completed": stages_completed,
            "current_stage": new_stage,
            "current_stage_index": current_stage_index,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Stage updated", "current_stage": new_stage}

@api_router.put("/candidates/{candidate_id}/lock-stage")
async def lock_stage(candidate_id: str, req: LockStageRequest, user=Depends(require_staff_or_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    locked_stages = candidate.get("locked_stages", [])
    stages_completed = candidate.get("stages_completed", [])
    stage_details = candidate.get("stage_details", {})
    current_stage_index = candidate.get("current_stage_index", 0)
    if req.lock:
        if req.stage not in locked_stages:
            locked_stages.append(req.stage)
        if req.stage not in stages_completed:
            stages_completed.append(req.stage)
            stage_details[req.stage] = {
                "status": "completed",
                "notes": "Marked as already done",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user.get("full_name", user["username"])
            }
        stage_idx = WORKFLOW_STAGES.index(req.stage) if req.stage in WORKFLOW_STAGES else -1
        if stage_idx >= current_stage_index and stage_idx + 1 < len(WORKFLOW_STAGES):
            current_stage_index = stage_idx + 1
    else:
        if user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admin can unlock stages")
        locked_stages = [s for s in locked_stages if s != req.stage]
    new_stage = WORKFLOW_STAGES[current_stage_index] if current_stage_index < len(WORKFLOW_STAGES) else "Completed"
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {
            "locked_stages": locked_stages,
            "stages_completed": stages_completed,
            "stage_details": stage_details,
            "current_stage": new_stage,
            "current_stage_index": current_stage_index,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": f"Stage {req.stage} {'locked' if req.lock else 'unlocked'}"}

# ===== Register Routes =====
@api_router.post("/incoming")
async def create_incoming(req: IncomingCreate, user=Depends(require_staff_or_admin)):
    record = {
        "id": str(uuid.uuid4()),
        "candidate_id": req.candidate_id,
        "candidate_name": req.candidate_name,
        "documents": req.documents,
        "date": req.date,
        "staff_name": req.staff_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incoming_register.insert_one(record)
    record.pop("_id", None)
    await db.candidates.update_one(
        {"id": req.candidate_id},
        {"$set": {
            "stage_details.Incoming": {
                "status": "completed", "documents": req.documents,
                "date": req.date, "staff_name": req.staff_name,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$addToSet": {"stages_completed": "Incoming"}}
    )
    return record

@api_router.get("/incoming/{candidate_id}")
async def get_incoming(candidate_id: str, user=Depends(require_staff_or_admin)):
    records = await db.incoming_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    return records

@api_router.post("/outgoing")
async def create_outgoing(req: OutgoingCreate, user=Depends(require_staff_or_admin)):
    incoming = await db.incoming_register.find({"candidate_id": req.candidate_id}, {"_id": 0}).to_list(100)
    documents = []
    for inc in incoming:
        documents.extend(inc.get("documents", []))
    record = {
        "id": str(uuid.uuid4()),
        "candidate_id": req.candidate_id,
        "candidate_name": req.candidate_name,
        "documents": documents,
        "destination": req.destination,
        "date": req.date,
        "remarks": req.remarks or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.outgoing_register.insert_one(record)
    record.pop("_id", None)
    await db.candidates.update_one(
        {"id": req.candidate_id},
        {"$set": {
            "stage_details.Outgoing Attestation": {
                "status": "completed", "destination": req.destination,
                "date": req.date, "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$addToSet": {"stages_completed": "Outgoing Attestation"}}
    )
    return record

@api_router.get("/outgoing/{candidate_id}")
async def get_outgoing(candidate_id: str, user=Depends(require_staff_or_admin)):
    records = await db.outgoing_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    return records

@api_router.post("/return")
async def create_return(req: ReturnCreate, user=Depends(require_staff_or_admin)):
    outgoing = await db.outgoing_register.find({"candidate_id": req.candidate_id}, {"_id": 0}).to_list(100)
    incoming = await db.incoming_register.find({"candidate_id": req.candidate_id}, {"_id": 0}).to_list(100)
    record = {
        "id": str(uuid.uuid4()),
        "candidate_id": req.candidate_id,
        "candidate_name": req.candidate_name,
        "incoming_details": incoming,
        "outgoing_details": outgoing,
        "return_date": req.return_date,
        "remarks": req.remarks or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.return_register.insert_one(record)
    record.pop("_id", None)
    await db.candidates.update_one(
        {"id": req.candidate_id},
        {"$set": {
            "stage_details.Return": {
                "status": "completed", "return_date": req.return_date,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$addToSet": {"stages_completed": "Return"}}
    )
    return record

@api_router.get("/return/{candidate_id}")
async def get_return(candidate_id: str, user=Depends(require_staff_or_admin)):
    records = await db.return_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    return records

@api_router.post("/exit")
async def create_exit(req: ExitCreate, user=Depends(require_staff_or_admin)):
    payments = await db.payments.find({"candidate_id": req.candidate_id, "approved": True}, {"_id": 0}).to_list(100)
    if not payments:
        raise HTTPException(status_code=400, detail="Payment not approved. Exit not allowed.")
    record = {
        "id": str(uuid.uuid4()),
        "candidate_id": req.candidate_id,
        "candidate_name": req.candidate_name,
        "documents": req.documents,
        "payment_status": "approved",
        "exit_date": req.exit_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exit_register.insert_one(record)
    record.pop("_id", None)
    stage_idx = len(WORKFLOW_STAGES) - 1
    await db.candidates.update_one(
        {"id": req.candidate_id},
        {"$set": {
            "current_stage": "Exit",
            "current_stage_index": stage_idx,
            "stage_details.Exit": {
                "status": "completed", "exit_date": req.exit_date,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$addToSet": {"stages_completed": "Exit"}}
    )
    return record

@api_router.get("/exit/{candidate_id}")
async def get_exit(candidate_id: str, user=Depends(require_staff_or_admin)):
    records = await db.exit_register.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    return records

# ===== Payment Routes =====
@api_router.get("/payments/{candidate_id}")
async def get_payments(candidate_id: str, user=Depends(require_staff_or_admin)):
    payments = await db.payments.find({"candidate_id": candidate_id}, {"_id": 0}).to_list(100)
    return payments

@api_router.post("/payments")
async def add_payment(req: PaymentCreate, user=Depends(require_admin)):
    payment = {
        "id": str(uuid.uuid4()),
        "candidate_id": req.candidate_id,
        "candidate_name": req.candidate_name,
        "transaction_id": req.transaction_id,
        "date": req.date,
        "account_holder": req.account_holder,
        "amount": req.amount,
        "notes": req.notes or "",
        "approved": False,
        "approved_by": None,
        "approved_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment)
    payment.pop("_id", None)
    return payment

@api_router.put("/payments/{payment_id}/approve")
async def approve_payment(payment_id: str, user=Depends(require_admin)):
    result = await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "approved": True,
            "approved_by": user.get("full_name", user["username"]),
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment approved"}

@api_router.put("/payments/{payment_id}/reject")
async def reject_payment(payment_id: str, user=Depends(require_admin)):
    result = await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"approved": False, "approved_by": None, "approved_at": None}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment rejected"}

ALERT_STAGES = ["Dataflow Processing", "Prometric Preparation", "Outgoing Attestation", "Medical", "VFS", "VISA"]

# ===== Notification & Due Date Routes =====
@api_router.get("/notifications")
async def get_notifications(user=Depends(require_staff_or_admin)):
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc)
    overdue = 0
    due_soon = 0
    on_track = 0
    pending_files = 0
    waiting_actions = 0
    alerts = []
    for c in candidates:
        sd = c.get("stage_details", {})
        completed = c.get("stages_completed", [])
        current = c.get("current_stage", "")
        cid = c["id"]
        cname = c["name"]
        for stage_name in ALERT_STAGES:
            detail = sd.get(stage_name, {})
            if detail.get("due_date"):
                try:
                    due = datetime.fromisoformat(detail["due_date"])
                    if due.tzinfo is None:
                        due = due.replace(tzinfo=timezone.utc)
                    diff = (due - now).days
                    if stage_name in completed:
                        on_track += 1
                    elif diff < 0:
                        overdue += 1
                        alerts.append({"type": "overdue", "candidate_id": cid, "candidate_name": cname, "stage": stage_name, "message": f"Overdue by {abs(diff)} day(s)", "days": diff})
                    elif diff <= 3:
                        due_soon += 1
                        alerts.append({"type": "due_soon", "candidate_id": cid, "candidate_name": cname, "stage": stage_name, "message": f"Due in {diff} day(s)", "days": diff})
                    else:
                        on_track += 1
                except Exception:
                    pass
        inc_count = await db.incoming_register.count_documents({"candidate_id": cid})
        if inc_count == 0 and current == "Incoming":
            pending_files += 1
            alerts.append({"type": "pending", "candidate_id": cid, "candidate_name": cname, "stage": "Incoming", "message": "Pending incoming documents"})
        if "Outgoing Attestation" in completed and "Dataflow Processing" not in completed and current != "Completed":
            waiting_actions += 1
            alerts.append({"type": "waiting", "candidate_id": cid, "candidate_name": cname, "stage": "Dataflow", "message": "Dataflow not started"})
        if "Dataflow Processing" in completed and "Prometric Done" not in completed and current != "Completed":
            waiting_actions += 1
            alerts.append({"type": "waiting", "candidate_id": cid, "candidate_name": cname, "stage": "Prometric", "message": "Prometric pending"})
        if "Outgoing Attestation" in completed and "Return" not in completed:
            out_c = await db.outgoing_register.count_documents({"candidate_id": cid})
            ret_c = await db.return_register.count_documents({"candidate_id": cid})
            if out_c > 0 and ret_c == 0:
                alerts.append({"type": "waiting", "candidate_id": cid, "candidate_name": cname, "stage": "Return", "message": "Attestation not returned"})
        if current in ["Medical", "VFS", "VISA", "Exit"]:
            pay_c = await db.payments.count_documents({"candidate_id": cid, "approved": True})
            if pay_c == 0:
                waiting_actions += 1
                alerts.append({"type": "pending", "candidate_id": cid, "candidate_name": cname, "stage": "Payment", "message": "Payment pending before exit"})
        visa_d = sd.get("VISA", {})
        if visa_d.get("status") == "in_progress" and visa_d.get("updated_at"):
            try:
                upd = datetime.fromisoformat(visa_d["updated_at"])
                if upd.tzinfo is None:
                    upd = upd.replace(tzinfo=timezone.utc)
                dw = (now - upd).days
                if dw > 30:
                    alerts.append({"type": "overdue", "candidate_id": cid, "candidate_name": cname, "stage": "VISA", "message": f"VISA waiting {dw} days"})
            except Exception:
                pass
    priority_map = {"overdue": 0, "due_soon": 1, "pending": 2, "waiting": 3}
    alerts.sort(key=lambda a: priority_map.get(a.get("type", ""), 4))
    return {
        "counts": {"overdue": overdue, "due_soon": due_soon, "on_track": on_track, "pending_files": pending_files, "waiting_actions": waiting_actions, "total": overdue + due_soon + pending_files + waiting_actions},
        "alerts": alerts[:50]
    }

@api_router.put("/candidates/{candidate_id}/quick-action")
async def quick_action(candidate_id: str, req: QuickActionRequest, user=Depends(require_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    sd = candidate.get("stage_details", {})
    completed = candidate.get("stages_completed", [])
    locked = candidate.get("locked_stages", [])
    idx = candidate.get("current_stage_index", 0)
    if req.stage not in sd:
        sd[req.stage] = {}
    sd[req.stage]["status"] = req.action
    sd[req.stage]["updated_at"] = datetime.now(timezone.utc).isoformat()
    sd[req.stage]["updated_by"] = user.get("full_name", user["username"])
    if req.due_date:
        sd[req.stage]["due_date"] = req.due_date
    if req.remarks is not None:
        sd[req.stage]["notes"] = req.remarks
    if req.action == "completed" and req.stage not in completed:
        completed.append(req.stage)
        si = WORKFLOW_STAGES.index(req.stage) if req.stage in WORKFLOW_STAGES else -1
        if si >= idx and si + 1 < len(WORKFLOW_STAGES):
            idx = si + 1
    if req.lock is True and req.stage not in locked:
        locked.append(req.stage)
    elif req.lock is False:
        locked = [s for s in locked if s != req.stage]
    new_stage = WORKFLOW_STAGES[idx] if idx < len(WORKFLOW_STAGES) else "Completed"
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"stage_details": sd, "stages_completed": completed, "locked_stages": locked, "current_stage": new_stage, "current_stage_index": idx, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"{req.stage} -> {req.action}", "current_stage": new_stage}

@api_router.put("/candidates/{candidate_id}/due-date")
async def update_due_date(candidate_id: str, req: DueDateUpdate, user=Depends(require_staff_or_admin)):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    sd = candidate.get("stage_details", {})
    if req.stage not in sd:
        sd[req.stage] = {}
    sd[req.stage]["due_date"] = req.due_date
    sd[req.stage]["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"stage_details": sd, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Due date set for {req.stage}"}

# ===== Public Routes =====
@api_router.get("/public/track")
async def track_candidate(q: str):
    candidate = await db.candidates.find_one(
        {"$or": [
            {"passport_number": {"$regex": q, "$options": "i"}},
            {"application_id": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {
        "name": candidate["name"],
        "application_id": candidate["application_id"],
        "current_stage": candidate["current_stage"],
        "current_stage_index": candidate.get("current_stage_index", 0),
        "stages_completed": candidate.get("stages_completed", []),
        "stages": WORKFLOW_STAGES
    }

@api_router.get("/workflow-stages")
async def get_workflow_stages():
    return {"stages": WORKFLOW_STAGES}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

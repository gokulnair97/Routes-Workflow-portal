import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Plus, LogOut, Plane, Search, FileText, Package, ArrowRight,
  ArrowLeftRight, DoorOpen, Settings, Lock, CheckCircle2, Circle,
  AlertTriangle, Users, X, ChevronDown, Bell
} from "lucide-react";

const STAGES = [
  "Incoming", "Employer Submission", "Interview", "Offer Letter",
  "Signed Offer", "Outgoing Attestation", "Dataflow Processing",
  "Prometric Preparation", "Prometric Done", "Return", "Medical",
  "VFS", "VISA", "Exit",
];

const LOCK_CHECKBOXES = [
  { label: "Already Attestation Done", stage: "Outgoing Attestation" },
  { label: "Already Dataflow Done", stage: "Dataflow Processing" },
  { label: "Already Prometric Done", stage: "Prometric Done" },
  { label: "Documents Already Received", stage: "Return" },
];

// ===== STAFF NOTIFICATION WIDGET =====
const StaffNotificationBar = () => {
  const [notif, setNotif] = useState({ counts: {}, alerts: [] });
  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    api.get("/notifications").then((r) => setNotif(r.data)).catch(() => {});
    const interval = setInterval(() => {
      api.get("/notifications").then((r) => setNotif(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const counts = notif.counts || {};
  const total = counts.total || 0;
  const alerts = notif.alerts || [];
  const items = [
    { label: "Overdue", value: counts.overdue || 0, color: "bg-red-50 text-red-600" },
    { label: "Due Soon", value: counts.due_soon || 0, color: "bg-amber-50 text-amber-600" },
    { label: "On Track", value: counts.on_track || 0, color: "bg-emerald-50 text-emerald-600" },
    { label: "Pending", value: counts.pending_files || 0, color: "bg-slate-100 text-slate-600" },
    { label: "Waiting", value: counts.waiting_actions || 0, color: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="mb-8">
      <Card className="p-4 rounded-2xl border-slate-100" data-testid="staff-notification-widget">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-blue-600" /> Smart Alerts
          </h3>
          {alerts.length > 0 && (
            <button onClick={() => setShowBell(!showBell)} className="text-[10px] text-blue-600 font-medium" data-testid="staff-toggle-alerts">
              {showBell ? "Hide" : `${alerts.length} alerts`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {items.map((item, i) => (
            <div key={i} className={`p-2.5 rounded-lg ${item.color} text-center`}>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-[9px] mt-0.5 opacity-70 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
        {showBell && alerts.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
            {alerts.slice(0, 10).map((a, i) => (
              <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                a.type === "overdue" ? "bg-red-50 text-red-700" :
                a.type === "due_soon" ? "bg-amber-50 text-amber-700" :
                "bg-blue-50 text-blue-600"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  a.type === "overdue" ? "bg-red-500" : a.type === "due_soon" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <span className="font-medium truncate">{a.candidate_name}</span>
                <span className="opacity-60 truncate flex-1">{a.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ===== STAFF BELL ICON =====
const StaffBellIcon = () => {
  const [notif, setNotif] = useState({ counts: {} });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/notifications").then((r) => setNotif(r.data)).catch(() => {});
  }, []);

  const total = notif?.counts?.total || 0;
  const alerts = notif?.alerts || [];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} data-testid="staff-bell-btn" className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
        <Bell className="w-4.5 h-4.5" strokeWidth={1.5} />
        {total > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] px-1 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{total > 99 ? "99+" : total}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-100 shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900">Notifications</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {alerts.length > 0 ? alerts.slice(0, 10).map((a, i) => (
                <div key={i} className={`px-3 py-2.5 border-b border-slate-50 last:border-0 ${a.type === "overdue" ? "bg-red-50/50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${a.type === "overdue" ? "bg-red-500" : a.type === "due_soon" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <span className="text-[11px] font-medium text-slate-800 truncate">{a.candidate_name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-3.5">{a.message}</p>
                </div>
              )) : <div className="p-6 text-center text-[11px] text-slate-400">No alerts</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ===== Candidate Search Dropdown =====
const CandidateSearchDropdown = ({ onSelect, selected, onClear, testIdPrefix }) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);

  const search = async (val) => {
    setTerm(val);
    if (val.length < 2) { setResults([]); return; }
    try { const r = await api.get(`/candidates/search/${encodeURIComponent(val)}`); setResults(r.data); } catch {}
  };

  if (selected) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl mb-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">{selected.name}</p>
          <p className="text-xs text-blue-500 font-mono">{selected.application_id} | {selected.passport_number}</p>
        </div>
        <button onClick={() => { onClear(); setTerm(""); }} className="text-blue-400 hover:text-blue-600" data-testid={`${testIdPrefix}-clear`}><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="relative mb-4">
      <Input data-testid={`${testIdPrefix}-search`} placeholder="Search candidate by name..." value={term} onChange={(e) => search(e.target.value)} className="h-11 rounded-xl bg-white" />
      {results.length > 0 && (
        <div className="search-dropdown">
          {results.map((c) => (
            <button key={c.id} onClick={() => { onSelect(c); setResults([]); setTerm(c.name); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0" data-testid={`${testIdPrefix}-opt-${c.id}`}>
              <span className="font-medium text-slate-900">{c.name}</span>
              <span className="text-slate-400 ml-2 text-xs">{c.passport_number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== CANDIDATES TAB =====
const CandidatesTab = () => {
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState({ name: "", passport_number: "", application_id: "" });
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    try { const r = await api.get("/candidates"); setCandidates(r.data); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/candidates", form); toast.success("Candidate created"); setForm({ name: "", passport_number: "", application_id: "" }); setShowForm(false); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-900">Candidates</h3>
        <Button data-testid="add-candidate-btn" size="sm" onClick={() => setShowForm(!showForm)} className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] text-xs h-9"><Plus className="w-3 h-3 mr-1" /> New Candidate</Button>
      </div>
      {showForm && (
        <Card className="p-5 rounded-2xl border-slate-100 mb-6">
          <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label className="text-xs text-slate-500">Full Name</Label><Input data-testid="cand-name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="h-10 rounded-lg" required /></div>
            <div><Label className="text-xs text-slate-500">Passport Number</Label><Input data-testid="cand-passport" value={form.passport_number} onChange={(e) => setForm({...form, passport_number: e.target.value})} className="h-10 rounded-lg" required /></div>
            <div><Label className="text-xs text-slate-500">Application ID (auto)</Label><Input data-testid="cand-appid" value={form.application_id} onChange={(e) => setForm({...form, application_id: e.target.value})} className="h-10 rounded-lg" placeholder="Leave empty for auto" /></div>
            <div><Button type="submit" data-testid="create-cand-btn" className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs">Create</Button></div>
          </form>
        </Card>
      )}
      <div className="space-y-2">
        {candidates.map((c) => (
          <Card key={c.id} className="p-4 rounded-xl border-slate-100 card-hover" data-testid={`cand-row-${c.id}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-400 font-mono">{c.application_id} | {c.passport_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] rounded-md">{c.current_stage}</Badge>
                {c.locked_stages?.length > 0 && <Lock className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
          </Card>
        ))}
        {candidates.length === 0 && <p className="text-sm text-slate-400 text-center py-10">No candidates yet. Create one to get started.</p>}
      </div>
    </div>
  );
};

// ===== INCOMING TAB =====
const IncomingTab = () => {
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState("");
  const [date, setDate] = useState("");
  const { user } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error("Select a candidate");
    const docList = docs.split("\n").map((d) => d.trim()).filter(Boolean);
    if (docList.length === 0) return toast.error("Add at least one document");
    try {
      await api.post("/incoming", { candidate_id: selected.id, candidate_name: selected.name, documents: docList, date, staff_name: user.full_name });
      toast.success("Incoming record created");
      setSelected(null); setDocs(""); setDate("");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-5">Incoming Register</h3>
      <CandidateSearchDropdown testIdPrefix="incoming" onSelect={setSelected} selected={selected} onClear={() => setSelected(null)} />
      {selected && (
        <Card className="p-5 rounded-2xl border-slate-100">
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs text-slate-500">Date</Label><Input data-testid="incoming-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg" required /></div>
            <div>
              <Label className="text-xs text-slate-500">Document List (one per line)</Label>
              <textarea data-testid="incoming-docs" value={docs} onChange={(e) => setDocs(e.target.value)} rows={5} className="w-full mt-1 p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" placeholder={"Passport Copy\nDegree Certificate\nNursing License\nPolice Clearance"} required />
            </div>
            <div><Label className="text-xs text-slate-500">Staff Name</Label><Input value={user.full_name} disabled className="h-10 rounded-lg bg-slate-100 text-slate-500" /></div>
            <Button type="submit" data-testid="submit-incoming-btn" className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs">Submit Incoming Record</Button>
          </form>
        </Card>
      )}
    </div>
  );
};

// ===== OUTGOING TAB =====
const OutgoingTab = () => {
  const [selected, setSelected] = useState(null);
  const [incomingDocs, setIncomingDocs] = useState([]);
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSelect = async (c) => {
    setSelected(c);
    try { const r = await api.get(`/incoming/${c.id}`); const allDocs = r.data.flatMap((d) => d.documents); setIncomingDocs(allDocs); }
    catch { setIncomingDocs([]); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error("Select a candidate");
    try {
      await api.post("/outgoing", { candidate_id: selected.id, candidate_name: selected.name, destination, date, remarks });
      toast.success("Outgoing record created");
      setSelected(null); setIncomingDocs([]); setDestination(""); setDate(""); setRemarks("");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-5">Outgoing Register</h3>
      <CandidateSearchDropdown testIdPrefix="outgoing" onSelect={handleSelect} selected={selected} onClear={() => { setSelected(null); setIncomingDocs([]); }} />
      {selected && (
        <Card className="p-5 rounded-2xl border-slate-100">
          {incomingDocs.length > 0 && (
            <div className="mb-5">
              <Label className="text-xs text-slate-500 mb-2 block">Auto-Fetched Documents (from Incoming)</Label>
              <div className="p-3 bg-blue-50/50 rounded-xl space-y-1">
                {incomingDocs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-blue-800">
                    <FileText className="w-3 h-3 text-blue-400" />{d}
                  </div>
                ))}
              </div>
            </div>
          )}
          {incomingDocs.length === 0 && <p className="text-xs text-amber-600 mb-4 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No incoming documents found for this candidate.</p>}
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs text-slate-500">Destination</Label><Input data-testid="outgoing-destination" value={destination} onChange={(e) => setDestination(e.target.value)} className="h-10 rounded-lg" placeholder="e.g. Saudi Arabia, UAE" required /></div>
            <div><Label className="text-xs text-slate-500">Date</Label><Input data-testid="outgoing-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg" required /></div>
            <div><Label className="text-xs text-slate-500">Remarks</Label><Input data-testid="outgoing-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-10 rounded-lg" /></div>
            <Button type="submit" data-testid="submit-outgoing-btn" className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs">Submit Outgoing Record</Button>
          </form>
        </Card>
      )}
    </div>
  );
};

// ===== RETURN TAB =====
const ReturnTab = () => {
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({ incoming: [], outgoing: [] });
  const [returnDate, setReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSelect = async (c) => {
    setSelected(c);
    try {
      const [inc, out] = await Promise.all([api.get(`/incoming/${c.id}`), api.get(`/outgoing/${c.id}`)]);
      setDetails({ incoming: inc.data, outgoing: out.data });
    } catch { setDetails({ incoming: [], outgoing: [] }); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error("Select a candidate");
    try {
      await api.post("/return", { candidate_id: selected.id, candidate_name: selected.name, return_date: returnDate, remarks });
      toast.success("Return record created");
      setSelected(null); setDetails({ incoming: [], outgoing: [] }); setReturnDate(""); setRemarks("");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-5">Return Register</h3>
      <CandidateSearchDropdown testIdPrefix="return" onSelect={handleSelect} selected={selected} onClear={() => { setSelected(null); setDetails({ incoming: [], outgoing: [] }); }} />
      {selected && (
        <Card className="p-5 rounded-2xl border-slate-100">
          {(details.incoming.length > 0 || details.outgoing.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-600 mb-2">Incoming Details</p>
                {details.incoming.map((r, i) => (
                  <div key={i} className="text-xs text-slate-500 space-y-0.5">
                    <p>Date: {r.date}</p>
                    <p>Docs: {r.documents?.join(", ")}</p>
                  </div>
                ))}
                {details.incoming.length === 0 && <p className="text-xs text-slate-400">No records</p>}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-600 mb-2">Outgoing Details</p>
                {details.outgoing.map((r, i) => (
                  <div key={i} className="text-xs text-slate-500 space-y-0.5">
                    <p>Date: {r.date}</p>
                    <p>Destination: {r.destination}</p>
                    <p>Docs: {r.documents?.join(", ")}</p>
                  </div>
                ))}
                {details.outgoing.length === 0 && <p className="text-xs text-slate-400">No records</p>}
              </div>
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs text-slate-500">Return Date</Label><Input data-testid="return-date" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-10 rounded-lg" required /></div>
            <div><Label className="text-xs text-slate-500">Remarks</Label><Input data-testid="return-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-10 rounded-lg" /></div>
            <Button type="submit" data-testid="submit-return-btn" className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs">Submit Return Record</Button>
          </form>
        </Card>
      )}
    </div>
  );
};

// ===== EXIT TAB =====
const ExitTab = () => {
  const [selected, setSelected] = useState(null);
  const [incomingDocs, setIncomingDocs] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [exitDate, setExitDate] = useState("");

  const handleSelect = async (c) => {
    setSelected(c);
    try {
      const [inc, pay] = await Promise.all([api.get(`/incoming/${c.id}`), api.get(`/payments/${c.id}`)]);
      const docs = inc.data.flatMap((d) => d.documents);
      setIncomingDocs(docs);
      const approved = pay.data.some((p) => p.approved);
      setPaymentStatus(approved ? "approved" : "pending");
    } catch { setIncomingDocs([]); setPaymentStatus("pending"); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error("Select a candidate");
    try {
      await api.post("/exit", { candidate_id: selected.id, candidate_name: selected.name, documents: incomingDocs, exit_date: exitDate });
      toast.success("Exit record created");
      setSelected(null); setIncomingDocs([]); setPaymentStatus(null); setExitDate("");
    } catch (err) { toast.error(err.response?.data?.detail || "Payment not approved. Exit not allowed."); }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-5">Exit Register</h3>
      <CandidateSearchDropdown testIdPrefix="exit" onSelect={handleSelect} selected={selected} onClear={() => { setSelected(null); setIncomingDocs([]); setPaymentStatus(null); }} />
      {selected && (
        <Card className="p-5 rounded-2xl border-slate-100">
          {paymentStatus === "pending" && (
            <div className="p-4 bg-red-50 rounded-xl mb-5 flex items-start gap-3" data-testid="exit-payment-error">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Payment not approved. Exit not allowed.</p>
                <p className="text-xs text-red-500 mt-1">Contact admin to approve payment before proceeding.</p>
              </div>
            </div>
          )}
          {paymentStatus === "approved" && (
            <div className="p-4 bg-emerald-50 rounded-xl mb-5 flex items-center gap-3" data-testid="exit-payment-ok">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">Payment approved. Exit allowed.</p>
            </div>
          )}
          {incomingDocs.length > 0 && (
            <div className="mb-5">
              <Label className="text-xs text-slate-500 mb-2 block">Documents to Exit</Label>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                {incomingDocs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700"><FileText className="w-3 h-3 text-slate-400" />{d}</div>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div><Label className="text-xs text-slate-500">Exit Date</Label><Input data-testid="exit-date" type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="h-10 rounded-lg" required /></div>
            <Button type="submit" data-testid="submit-exit-btn" disabled={paymentStatus !== "approved"} className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs disabled:opacity-50">Submit Exit Record</Button>
          </form>
        </Card>
      )}
    </div>
  );
};

// ===== STAGES TAB =====
const StagesTab = () => {
  const [selected, setSelected] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [stageNotes, setStageNotes] = useState("");
  const [activeStage, setActiveStage] = useState(null);
  const { user } = useAuth();

  const handleSelect = async (c) => {
    setSelected(c);
    try { const r = await api.get(`/candidates/${c.id}`); setCandidate(r.data); } catch {}
  };
  const refreshCandidate = async () => {
    if (!selected) return;
    try { const r = await api.get(`/candidates/${selected.id}`); setCandidate(r.data); } catch {}
  };
  const updateStage = async (stage, status) => {
    try {
      await api.put(`/candidates/${selected.id}/stage`, { stage, status, notes: stageNotes });
      toast.success(`${stage} marked as ${status}`);
      setStageNotes(""); setActiveStage(null); refreshCandidate();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const toggleLock = async (stage, lock) => {
    try {
      await api.put(`/candidates/${selected.id}/lock-stage`, { stage, lock });
      toast.success(`${stage} ${lock ? "locked" : "unlocked"}`);
      refreshCandidate();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-5">Stage Management</h3>
      <CandidateSearchDropdown testIdPrefix="stages" onSelect={handleSelect} selected={selected} onClear={() => { setSelected(null); setCandidate(null); }} />
      {candidate && (
        <>
          <Card className="p-5 rounded-2xl border-slate-100 mb-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              {LOCK_CHECKBOXES.map((cb) => {
                const isLocked = candidate.locked_stages?.includes(cb.stage);
                const isCompleted = candidate.stages_completed?.includes(cb.stage);
                return (
                  <div key={cb.stage} className="flex items-center gap-3">
                    <Checkbox
                      data-testid={`lock-${cb.stage.replace(/\s+/g, "-").toLowerCase()}`}
                      checked={isLocked || isCompleted}
                      disabled={isLocked && user?.role !== "admin"}
                      onCheckedChange={(checked) => toggleLock(cb.stage, checked)}
                    />
                    <span className="text-sm text-slate-700">{cb.label}</span>
                    {isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 rounded-2xl border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Pipeline Progress</h4>
            <div className="space-y-2">
              {STAGES.map((stage, i) => {
                const done = candidate.stages_completed?.includes(stage);
                const current = candidate.current_stage === stage;
                const locked = candidate.locked_stages?.includes(stage);
                const detail = candidate.stage_details?.[stage];
                const isActive = activeStage === stage;
                return (
                  <div key={stage} data-testid={`stage-row-${i}`}>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        current ? "bg-blue-50 border border-blue-100" :
                        done ? "bg-emerald-50/50" :
                        "hover:bg-slate-50"
                      }`}
                      onClick={() => setActiveStage(isActive ? null : stage)}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        done ? "bg-emerald-500 text-white" : current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-medium">{i + 1}</span>}
                      </div>
                      <span className={`text-sm flex-1 ${done ? "text-emerald-700 font-medium" : current ? "text-blue-700 font-semibold" : "text-slate-500"}`}>
                        {stage}
                      </span>
                      {locked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                      {detail?.status && <Badge variant="outline" className="text-[10px] rounded-md">{detail.status}</Badge>}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isActive ? "rotate-180" : ""}`} />
                    </div>
                    {isActive && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                        <div className="p-4 ml-9 space-y-3">
                          {detail && (
                            <div className="text-xs text-slate-500 space-y-1">
                              {detail.notes && <p>Notes: {detail.notes}</p>}
                              {detail.updated_by && <p>Updated by: {detail.updated_by}</p>}
                              {detail.updated_at && <p>At: {new Date(detail.updated_at).toLocaleString()}</p>}
                            </div>
                          )}
                          {(!locked || user?.role === "admin") && (
                            <div className="space-y-2">
                              <Input data-testid={`stage-notes-${i}`} placeholder="Notes (optional)" value={activeStage === stage ? stageNotes : ""} onChange={(e) => setStageNotes(e.target.value)} className="h-9 text-xs rounded-lg" />
                              <div className="flex gap-2">
                                <Button size="sm" data-testid={`stage-progress-${i}`} onClick={() => updateStage(stage, "in_progress")} className="h-8 text-[10px] rounded-lg bg-blue-500 hover:bg-blue-600">In Progress</Button>
                                <Button size="sm" data-testid={`stage-complete-${i}`} onClick={() => updateStage(stage, "completed")} className="h-8 text-[10px] rounded-lg bg-emerald-500 hover:bg-emerald-600">Complete</Button>
                              </div>
                            </div>
                          )}
                          {locked && user?.role !== "admin" && <p className="text-xs text-amber-600 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked. Only admin can edit.</p>}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// ===== MAIN STAFF DASHBOARD =====
export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="staff-dashboard">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A56DB] flex items-center justify-center">
              <Plane className="w-4 h-4 text-white -rotate-45" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Routes International</p>
              <p className="text-[10px] text-slate-400">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StaffBellIcon />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-900">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="staff-logout-btn" className="rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 h-9 px-3">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <StaffNotificationBar />
        <Tabs defaultValue="candidates">
          <TabsList className="bg-white border border-slate-100 rounded-xl p-1 mb-8 flex-wrap h-auto gap-1" data-testid="staff-tabs">
            <TabsTrigger value="candidates" data-testid="tab-candidates" className="rounded-lg text-xs data-[state=active]:bg-[#1A56DB] data-[state=active]:text-white"><Users className="w-3.5 h-3.5 mr-1.5" />Candidates</TabsTrigger>
            <TabsTrigger value="incoming" data-testid="tab-incoming" className="rounded-lg text-xs data-[state=active]:bg-[#1A56DB] data-[state=active]:text-white"><Package className="w-3.5 h-3.5 mr-1.5" />Incoming</TabsTrigger>
            <TabsTrigger value="outgoing" data-testid="tab-outgoing" className="rounded-lg text-xs data-[state=active]:bg-[#1A56DB] data-[state=active]:text-white"><ArrowRight className="w-3.5 h-3.5 mr-1.5" />Outgoing</TabsTrigger>
            <TabsTrigger value="return" data-testid="tab-return" className="rounded-lg text-xs data-[state=active]:bg-[#1A56DB] data-[state=active]:text-white"><ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />Return</TabsTrigger>
            <TabsTrigger value="exit" data-testid="tab-exit" className="rounded-lg text-xs data-[state=active]:bg-[#1A56DB] data-[state=active]:text-white"><DoorOpen className="w-3.5 h-3.5 mr-1.5" />Exit</TabsTrigger>
            <TabsTrigger value="stages" data-testid="tab-stages" className="rounded-lg text-xs data-[state=active]:bg-[#1A56DB] data-[state=active]:text-white"><Settings className="w-3.5 h-3.5 mr-1.5" />Stages</TabsTrigger>
          </TabsList>
          <TabsContent value="candidates"><CandidatesTab /></TabsContent>
          <TabsContent value="incoming"><IncomingTab /></TabsContent>
          <TabsContent value="outgoing"><OutgoingTab /></TabsContent>
          <TabsContent value="return"><ReturnTab /></TabsContent>
          <TabsContent value="exit"><ExitTab /></TabsContent>
          <TabsContent value="stages"><StagesTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

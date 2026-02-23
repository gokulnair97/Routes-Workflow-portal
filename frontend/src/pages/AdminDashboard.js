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
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, Search, CreditCard, Users, FileText, LogOut, Plus,
  Trash2, CheckCircle2, XCircle, Clock, Shield, Lock, Unlock, Eye,
  ChevronRight, Plane, Menu, X, Package, ArrowRight, CircleDot
} from "lucide-react";

const STAGES = [
  "Incoming", "Employer Submission", "Interview", "Offer Letter",
  "Signed Offer", "Outgoing Attestation", "Dataflow Processing",
  "Prometric Preparation", "Prometric Done", "Return", "Medical",
  "VFS", "VISA", "Exit",
];

const SidebarItem = ({ icon: Icon, label, active, onClick, testId }) => (
  <button data-testid={testId} onClick={onClick} className={`sidebar-item w-full ${active ? "active" : ""}`}>
    <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
    <span>{label}</span>
  </button>
);

// ===== OVERVIEW =====
const Overview = ({ stats }) => (
  <div className="animate-fade-in">
    <h2 className="text-xl font-bold text-slate-900 mb-6">Dashboard</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Total Candidates", value: stats.total_candidates, color: "bg-blue-50 text-blue-700", icon: Users },
        { label: "Staff Members", value: stats.staff_count, color: "bg-emerald-50 text-emerald-700", icon: Shield },
        { label: "Pending Payments", value: stats.pending_payments, color: "bg-amber-50 text-amber-700", icon: Clock },
        { label: "Approved Payments", value: stats.approved_payments, color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
      ].map((s, i) => (
        <Card key={i} className="p-5 rounded-2xl border-slate-100 card-hover" data-testid={`stat-card-${i}`}>
          <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
            <s.icon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{s.value ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">{s.label}</p>
        </Card>
      ))}
    </div>
    <Card className="p-5 rounded-2xl border-slate-100">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Pipeline Distribution</h3>
      <div className="space-y-2">
        {STAGES.map((stage) => {
          const count = stats.stage_counts?.[stage] || 0;
          const total = stats.total_candidates || 1;
          return (
            <div key={stage} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-36 truncate">{stage}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / total) * 100}%`, transition: "width 0.5s ease" }} />
              </div>
              <span className="text-xs font-medium text-slate-600 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </Card>
  </div>
);

// ===== GLOBAL SEARCH =====
const SearchSection = () => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
      setSelected(null);
    } catch { toast.error("Search failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Global Candidate Search</h2>
      <div className="flex gap-2 mb-6">
        <Input data-testid="admin-search-input" placeholder="Search by candidate name..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} className="h-11 rounded-xl bg-white" />
        <Button data-testid="admin-search-btn" onClick={doSearch} disabled={loading} className="h-11 px-5 rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF]">
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {results.length > 0 && !selected && (
        <div className="space-y-2 mb-6">
          {results.map((c) => (
            <Card key={c.id} className="p-4 rounded-xl border-slate-100 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all" onClick={() => setSelected(c)} data-testid={`search-result-${c.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{c.application_id} | {c.passport_number}</p>
                </div>
                <Badge variant="outline" className="text-xs">{c.current_stage}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
      {selected && <FlowchartView candidate={selected} onBack={() => setSelected(null)} />}
      {results.length === 0 && q && !loading && <p className="text-sm text-slate-400 text-center py-10">No results found</p>}
    </div>
  );
};

const FlowchartView = ({ candidate, onBack }) => {
  const c = candidate;
  const flowSteps = [
    { name: "Incoming", records: c.incoming_records, dateField: "date", icon: Package },
    { name: "Outgoing", records: c.outgoing_records, dateField: "date", icon: ArrowRight },
    { name: "Return", records: c.return_records, dateField: "return_date", icon: ArrowRight },
    { name: "Exit", records: c.exit_records, dateField: "exit_date", icon: CheckCircle2 },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1" data-testid="flowchart-back-btn">
        <ChevronRight className="w-3 h-3 rotate-180" /> Back to results
      </button>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
        <p className="text-xs text-slate-400 font-mono">{c.application_id} | Passport: {c.passport_number}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 rounded-2xl border-slate-100">
          <h4 className="text-sm font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-blue-600" /> Document Flow
          </h4>
          <div className="relative">
            <div className="timeline-line" />
            <div className="space-y-6">
              {flowSteps.map((step, i) => {
                const has = step.records && step.records.length > 0;
                return (
                  <div key={i} className="relative flex gap-4">
                    <div className={`w-8 h-8 rounded-full z-10 flex items-center justify-center shrink-0 ${has ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{step.name}</p>
                      {has ? step.records.map((r, j) => (
                        <div key={j} className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                          <p>Date: {r[step.dateField] || "N/A"}</p>
                          {r.documents && <p>Docs: {r.documents.join(", ")}</p>}
                          {r.destination && <p>Destination: {r.destination}</p>}
                          {r.remarks && <p>Remarks: {r.remarks}</p>}
                        </div>
                      )) : <p className="text-xs text-slate-400 mt-1">Pending</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Separator className="my-5" />
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Full Pipeline</h4>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => {
              const done = c.stages_completed?.includes(s);
              const current = c.current_stage === s;
              const locked = c.locked_stages?.includes(s);
              return (
                <span key={s} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${
                  done ? "bg-emerald-50 text-emerald-700" : current ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-400"
                }`}>
                  {locked && <Lock className="w-2.5 h-2.5" />} {s}
                </span>
              );
            })}
          </div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-100">
          <h4 className="text-sm font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" /> Payment Records
          </h4>
          {c.payment_records && c.payment_records.length > 0 ? (
            <div className="space-y-3">
              {c.payment_records.map((p) => (
                <div key={p.id} className={`p-3 rounded-xl border ${p.approved ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-600">{p.transaction_id}</span>
                    <Badge variant="outline" className={`text-[10px] ${p.approved ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}`}>
                      {p.approved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><span className="text-slate-400">Amount:</span> ${p.amount}</div>
                    <div><span className="text-slate-400">Date:</span> {p.date}</div>
                    <div><span className="text-slate-400">Holder:</span> {p.account_holder}</div>
                    {p.approved_by && <div><span className="text-slate-400">By:</span> {p.approved_by}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 text-center py-8">No payment records</p>}
        </Card>
      </div>
    </motion.div>
  );
};

// ===== PAYMENTS =====
const PaymentSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedCand, setSelectedCand] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ transaction_id: "", date: "", account_holder: "", amount: "", notes: "" });
  const [showForm, setShowForm] = useState(false);

  const searchCandidates = async (term) => {
    if (term.length < 2) { setCandidates([]); return; }
    try { const r = await api.get(`/candidates/search/${encodeURIComponent(term)}`); setCandidates(r.data); } catch {}
  };
  const selectCandidate = async (c) => {
    setSelectedCand(c); setCandidates([]); setSearchTerm(c.name);
    try { const r = await api.get(`/payments/${c.id}`); setPayments(r.data); } catch {}
  };
  const addPayment = async (e) => {
    e.preventDefault();
    if (!selectedCand) return toast.error("Select a candidate first");
    try {
      await api.post("/payments", { ...form, amount: parseFloat(form.amount), candidate_id: selectedCand.id, candidate_name: selectedCand.name });
      toast.success("Payment added");
      setForm({ transaction_id: "", date: "", account_holder: "", amount: "", notes: "" });
      setShowForm(false);
      const r = await api.get(`/payments/${selectedCand.id}`); setPayments(r.data);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const handleApprove = async (id) => {
    try { await api.put(`/payments/${id}/approve`); toast.success("Payment approved"); const r = await api.get(`/payments/${selectedCand.id}`); setPayments(r.data); }
    catch { toast.error("Failed"); }
  };
  const handleReject = async (id) => {
    try { await api.put(`/payments/${id}/reject`); toast.success("Payment rejected"); const r = await api.get(`/payments/${selectedCand.id}`); setPayments(r.data); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Payment Approval</h2>
      <div className="relative mb-6">
        <Input data-testid="payment-search-input" placeholder="Search candidate..." value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); searchCandidates(e.target.value); if (!e.target.value) setSelectedCand(null); }}
          className="h-11 rounded-xl bg-white" />
        {candidates.length > 0 && !selectedCand && (
          <div className="search-dropdown">
            {candidates.map((c) => (
              <button key={c.id} onClick={() => selectCandidate(c)} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm" data-testid={`payment-cand-${c.id}`}>
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-slate-400 ml-2 text-xs">{c.passport_number}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedCand && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedCand.name}</p>
              <p className="text-xs text-slate-400 font-mono">{selectedCand.application_id}</p>
            </div>
            <Button data-testid="add-payment-btn" size="sm" onClick={() => setShowForm(!showForm)} className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] text-xs h-9">
              <Plus className="w-3 h-3 mr-1" /> Add Payment
            </Button>
          </div>
          {showForm && (
            <Card className="p-5 rounded-2xl border-slate-100 mb-6">
              <form onSubmit={addPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs text-slate-500">Transaction ID</Label><Input data-testid="payment-txn-id" value={form.transaction_id} onChange={(e) => setForm({...form, transaction_id: e.target.value})} className="h-10 rounded-lg" required /></div>
                <div><Label className="text-xs text-slate-500">Date</Label><Input data-testid="payment-date" type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="h-10 rounded-lg" required /></div>
                <div><Label className="text-xs text-slate-500">Account Holder</Label><Input data-testid="payment-holder" value={form.account_holder} onChange={(e) => setForm({...form, account_holder: e.target.value})} className="h-10 rounded-lg" required /></div>
                <div><Label className="text-xs text-slate-500">Amount</Label><Input data-testid="payment-amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="h-10 rounded-lg" required /></div>
                <div className="sm:col-span-2"><Label className="text-xs text-slate-500">Notes</Label><Input data-testid="payment-notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="h-10 rounded-lg" /></div>
                <div className="sm:col-span-2"><Button type="submit" data-testid="submit-payment-btn" className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs">Submit Payment</Button></div>
              </form>
            </Card>
          )}
          <div className="space-y-3">
            {payments.map((p) => (
              <Card key={p.id} className="p-4 rounded-xl border-slate-100" data-testid={`payment-row-${p.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-mono text-slate-600">{p.transaction_id}</span>
                    <span className="text-xs text-slate-400 ml-3">{p.date}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${p.approved ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-amber-300 text-amber-700 bg-amber-50"}`}>
                    {p.approved ? "Approved" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span>{p.account_holder}</span> <span className="font-semibold text-slate-900 ml-2">${p.amount}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {!p.approved && <Button size="sm" data-testid={`approve-${p.id}`} onClick={() => handleApprove(p.id)} className="h-7 px-3 text-[10px] rounded-lg bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>}
                    {p.approved && <Button size="sm" variant="outline" data-testid={`reject-${p.id}`} onClick={() => handleReject(p.id)} className="h-7 px-3 text-[10px] rounded-lg border-red-200 text-red-600 hover:bg-red-50"><XCircle className="w-3 h-3 mr-1" />Reject</Button>}
                  </div>
                </div>
              </Card>
            ))}
            {payments.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No payments recorded</p>}
          </div>
        </>
      )}
    </div>
  );
};

// ===== STAFF MANAGEMENT =====
const StaffSection = () => {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "" });
  const [showForm, setShowForm] = useState(false);

  const loadStaff = useCallback(async () => {
    try { const r = await api.get("/admin/staff"); setStaff(r.data); } catch {}
  }, []);
  useEffect(() => { loadStaff(); }, [loadStaff]);

  const createStaff = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/staff", form); toast.success("Staff created"); setForm({ username: "", password: "", full_name: "" }); setShowForm(false); loadStaff(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const deleteStaff = async (id) => {
    try { await api.delete(`/admin/staff/${id}`); toast.success("Staff deleted"); loadStaff(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Staff Management</h2>
        <Button data-testid="add-staff-btn" size="sm" onClick={() => setShowForm(!showForm)} className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] text-xs h-9">
          <Plus className="w-3 h-3 mr-1" /> Add Staff
        </Button>
      </div>
      {showForm && (
        <Card className="p-5 rounded-2xl border-slate-100 mb-6">
          <form onSubmit={createStaff} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label className="text-xs text-slate-500">Full Name</Label><Input data-testid="staff-name" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="h-10 rounded-lg" required /></div>
            <div><Label className="text-xs text-slate-500">Username</Label><Input data-testid="staff-username" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="h-10 rounded-lg" required /></div>
            <div><Label className="text-xs text-slate-500">Password</Label><Input data-testid="staff-password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="h-10 rounded-lg" required /></div>
            <div><Button type="submit" data-testid="create-staff-btn" className="rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] h-10 text-xs">Create Staff</Button></div>
          </form>
        </Card>
      )}
      <div className="space-y-2">
        {staff.map((s) => (
          <Card key={s.id} className="p-4 rounded-xl border-slate-100 flex items-center justify-between" data-testid={`staff-row-${s.id}`}>
            <div>
              <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
              <p className="text-xs text-slate-400">@{s.username}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => deleteStaff(s.id)} data-testid={`delete-staff-${s.id}`} className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </Card>
        ))}
        {staff.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No staff members</p>}
      </div>
    </div>
  );
};

// ===== AUDIT LOGS =====
const AuditSection = () => {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setLogs(r.data)).catch(() => {}); }, []);

  const actionColor = (action) => {
    if (action === "login_success") return "bg-emerald-50 text-emerald-700";
    if (action === "login_failed") return "bg-red-50 text-red-700";
    if (action === "logout") return "bg-slate-100 text-slate-600";
    return "bg-blue-50 text-blue-700";
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Audit Logs</h2>
      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id} className="p-4 rounded-xl border-slate-100" data-testid={`audit-log-${log.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${actionColor(log.action)} text-[10px] rounded-md border-0`}>{log.action}</Badge>
                <span className="text-sm text-slate-900 font-medium">{log.username || "Unknown"}</span>
                {log.role && <span className="text-xs text-slate-400">({log.role})</span>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                <p className="text-[10px] text-slate-300 font-mono">{log.ip_address}</p>
              </div>
            </div>
          </Card>
        ))}
        {logs.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No logs yet</p>}
      </div>
    </div>
  );
};

// ===== MAIN ADMIN DASHBOARD =====
export default function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [stats, setStats] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/admin/dashboard-stats").then((r) => setStats(r.data)).catch(() => {});
  }, [section]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { id: "overview", icon: LayoutDashboard, label: "Dashboard" },
    { id: "search", icon: Search, label: "Candidate Search" },
    { id: "payments", icon: CreditCard, label: "Payments" },
    { id: "staff", icon: Users, label: "Staff" },
    { id: "audit", icon: FileText, label: "Audit Logs" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="admin-dashboard">
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A56DB] flex items-center justify-center">
              <Plane className="w-4 h-4 text-white -rotate-45" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Routes Intl.</p>
              <p className="text-[10px] text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <SidebarItem key={item.id} icon={item.icon} label={item.label} active={section === item.id}
              onClick={() => { setSection(item.id); setSidebarOpen(false); }} testId={`nav-${item.id}`} />
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-slate-900">{user?.full_name}</p>
            <p className="text-[10px] text-slate-400">{user?.role}</p>
          </div>
          <button onClick={handleLogout} data-testid="admin-logout-btn" className="sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-btn" className="text-slate-600"><Menu className="w-5 h-5" /></button>
          <span className="font-bold text-sm text-slate-900">Admin</span>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-5xl">
          {section === "overview" && <Overview stats={stats} />}
          {section === "search" && <SearchSection />}
          {section === "payments" && <PaymentSection />}
          {section === "staff" && <StaffSection />}
          {section === "audit" && <AuditSection />}
        </main>
      </div>
    </div>
  );
}

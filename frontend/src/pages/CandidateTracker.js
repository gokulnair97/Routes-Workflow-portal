import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, CheckCircle2, Circle, Plane, ArrowLeft } from "lucide-react";
import api from "@/lib/api";

const STAGES = [
  "Incoming", "Employer Submission", "Interview", "Offer Letter",
  "Signed Offer", "Outgoing Attestation", "Dataflow Processing",
  "Prometric Preparation", "Prometric Done", "Return", "Medical",
  "VFS", "VISA", "Exit",
];

export default function CandidateTracker() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/public/track?q=${encodeURIComponent(query.trim())}`);
      setResult(res.data);
    } catch {
      setResult(null);
      toast.error("Candidate not found. Check your Passport Number or Application ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="candidate-tracker-page">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A56DB] flex items-center justify-center">
              <Plane className="w-4 h-4 text-white -rotate-45" />
            </div>
            <span className="font-bold text-sm text-slate-900">Routes International</span>
          </div>
          <a href="/login" data-testid="tracker-login-link" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Staff Login
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Track Your Application
          </h2>
          <p className="text-slate-400 text-sm">
            Enter your Passport Number or Application ID
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-12">
          <Input
            data-testid="track-search-input"
            placeholder="e.g. APP-1A2B3C4D or passport number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 rounded-xl bg-white border-slate-200 text-sm"
          />
          <Button
            type="submit"
            data-testid="track-search-btn"
            disabled={loading}
            className="h-12 px-5 rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] shrink-0"
          >
            <Search className="w-4 h-4" />
          </Button>
        </form>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="p-6 sm:p-8 rounded-2xl border-slate-100 shadow-sm" data-testid="track-result-card">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold text-slate-900">{result.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{result.application_id}</p>
                  <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {result.current_stage}
                  </div>
                </div>

                <div className="space-y-1">
                  {STAGES.map((stage, i) => {
                    const done = result.stages_completed?.includes(stage);
                    const current = result.current_stage === stage;
                    return (
                      <div
                        key={stage}
                        data-testid={`track-stage-${i}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${current ? "bg-blue-50" : done ? "bg-emerald-50/50" : ""}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          done ? "bg-emerald-500 text-white" :
                          current ? "bg-blue-600 text-white" :
                          "bg-slate-100 text-slate-300"
                        }`}>
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                            current ? <Circle className="w-3 h-3 fill-current" /> :
                            <span className="text-[10px] font-medium">{i + 1}</span>}
                        </div>
                        <span className={`text-sm ${done ? "text-emerald-700 font-medium" : current ? "text-blue-700 font-semibold" : "text-slate-400"}`}>
                          {stage}
                        </span>
                        {current && <span className="ml-auto text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">In Progress</span>}
                        {done && <span className="ml-auto text-[10px] text-emerald-600 font-medium">Done</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 p-4 bg-blue-50/60 rounded-xl text-center">
                  <p className="text-xs text-blue-600">
                    Your application is being processed. We will keep you updated.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {searched && !result && !loading && (
          <div className="text-center py-16 text-slate-300 text-sm">
            No candidate found. Please verify your details.
          </div>
        )}
      </main>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, User, Eye, EyeOff, ArrowLeft, Plane } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Please fill in all fields");
    setBusy(true);
    try {
      const user = await login(username, password);
      toast.success(`Welcome, ${user.full_name}`);
      navigate(user.role === "admin" ? "/admin" : "/staff");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <div className="hidden lg:block lg:w-[58%] relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/6129581/pexels-photo-6129581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Healthcare professional"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-blue-800/40" />
        <div className="relative z-10 flex flex-col justify-between h-full p-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center">
              <Plane className="w-4 h-4 text-white -rotate-45" />
            </div>
            <span className="text-white/90 font-semibold text-sm tracking-wide">Routes International</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Empowering Global Nursing Careers
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Streamlined recruitment workflow management for international healthcare professionals.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Plane className="w-5 h-5 text-blue-600 -rotate-45" />
            <span className="font-bold text-slate-900">Routes International</span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" data-testid="login-title">
                  {isAdmin ? "Admin Access" : "Staff Portal"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAdmin ? "Restricted access" : "Sign in to continue"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Username</Label>
              <Input
                data-testid="login-username-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-xl bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  data-testid="login-password-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl bg-white border-slate-200 pr-10 focus:border-blue-500 focus:ring-blue-100"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              data-testid="login-submit-btn"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-[#1A56DB] hover:bg-[#1E40AF] text-white font-medium shadow-lg shadow-blue-500/20"
            >
              {busy ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              data-testid="track-application-link"
              onClick={() => navigate("/track")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Track your application
            </button>
          </div>

          <div className="mt-16 flex justify-center">
            <button
              data-testid="admin-toggle-btn"
              onClick={() => { setIsAdmin(!isAdmin); setUsername(""); setPassword(""); }}
              className="text-[11px] text-slate-300 hover:text-slate-400 transition-colors"
            >
              {isAdmin ? (
                <span className="flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Staff login</span>
              ) : "Admin"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

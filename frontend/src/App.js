import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import CandidateTracker from "@/pages/CandidateTracker";
import LoadingPage from "@/pages/LoadingPage";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splashShown"));

  useEffect(() => {
    if (showSplash) {
      sessionStorage.setItem("splashShown", "true");
    }
  }, [showSplash]);

  if (showSplash) return <LoadingPage onComplete={() => setShowSplash(false)} />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/staff"} replace /> : <LoginPage />} />
      <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/staff/*" element={<ProtectedRoute allowedRoles={["admin", "staff"]}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/track" element={<CandidateTracker />} />
      <Route path="/" element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/staff"} replace /> : <Navigate to="/track" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

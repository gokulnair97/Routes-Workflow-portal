import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plane, Stethoscope, ArrowRight } from "lucide-react";

const STEPS = [
  "Incoming", "Submission", "Interview", "Offer",
  "Signed", "Outgoing", "Dataflow", "Prometric",
  "Done", "Return", "Medical", "VFS", "VISA", "Exit",
];

export default function LoadingPage({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3200);
    const t4 = setTimeout(() => setPhase(4), 5800);
    const t5 = setTimeout(() => setPhase(5), 6600);
    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    const interval = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(interval); return 100; } return p + 1.5; });
    }, 40);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase < 2) return;
    STEPS.forEach((_, i) => {
      setTimeout(() => setActiveStep(i), 500 + i * 180);
    });
  }, [phase]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center overflow-hidden" data-testid="loading-page">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-white" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

      <div className="relative z-10 flex flex-col items-center px-6 max-w-lg w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center mb-14"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Routes International
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="text-slate-400 mt-2 text-sm tracking-wide"
          >
            Nurse Recruitment Workflow System
          </motion.p>
        </motion.div>

        <div className="relative w-full max-w-xs h-28 mb-10">
          <motion.div
            initial={{ x: -120, opacity: 0 }}
            animate={phase >= 1 ? { x: -20, opacity: 1 } : {}}
            transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-1/2 top-1/2 -translate-y-1/2"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={phase >= 2 ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#1A56DB] flex items-center justify-center shadow-xl shadow-blue-600/20">
              <Building2 className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>

          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ x: 0, opacity: 0, scale: 0.8 }}
                animate={{ x: 160, opacity: [0, 1, 1, 0.8, 0], scale: 1 }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
                className="absolute left-1/2 top-1/3 -translate-y-1/2"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50/80 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-blue-500 -rotate-45" strokeWidth={1.5} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-xs mb-8">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-1 mb-10 flex-wrap justify-center">
          {STEPS.map((step, i) => (
            <motion.div
              key={step}
              initial={{ scale: 0.8, opacity: 0.3 }}
              animate={i <= activeStep ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
              transition={{ duration: 0.25 }}
              className={`w-2 h-2 rounded-full ${i <= activeStep ? "bg-blue-500" : "bg-slate-200"}`}
              title={step}
            />
          ))}
        </div>

        <AnimatePresence>
          {phase >= 4 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-blue-600 font-medium text-base mb-8 text-center"
            >
              Your Global Nursing Career Starts Here
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 5 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onComplete}
              data-testid="loading-enter-btn"
              className="px-8 py-3 bg-[#1A56DB] text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:bg-[#1E40AF] flex items-center gap-2 text-sm"
            >
              Enter <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

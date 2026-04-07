import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CrisisFloater() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);

  const handleSOS = () => {
    setIsTriggered(true);
    // Logic to notify MedPod Dispatcher would go here
    setTimeout(() => {
      alert("🚨 SOS TRIGGERED: MedPod Dispatcher notified. EV Ambulance dispatched.");
      setIsTriggered(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <div className="fixed bottom-24 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-100 p-6 overflow-hidden"
          >
            <div className="relative z-10">
              <h3 className="text-red-600 font-black text-xl mb-2 flex items-center gap-2">
                <span>🆘</span> CRISIS SHIELD
              </h3>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                Emergency access to MedPod Dispatcher & Human-in-the-loop support.
              </p>
              
              <button
                onClick={handleSOS}
                disabled={isTriggered}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${
                  isTriggered 
                    ? "bg-red-100 text-red-400 cursor-not-allowed" 
                    : "bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700"
                }`}
              >
                {isTriggered ? (
                  <>
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      SIGNALING...
                    </motion.span>
                  </>
                ) : (
                  "TRIGGER SOS"
                )}
              </button>
              
              <p className="mt-4 text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                Mothership Protocol V.1.0
              </p>
            </div>
            
            {/* Apple-style background glow */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-red-50 to-white/0 opacity-50 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-2 transition-all ${
          isOpen 
            ? "bg-white border-red-200 text-red-600 rotate-45" 
            : "bg-red-600 border-red-500 text-white"
        }`}
      >
        <span className="text-2xl font-bold">{isOpen ? "×" : "🆘"}</span>
      </motion.button>
    </div>
  );
}

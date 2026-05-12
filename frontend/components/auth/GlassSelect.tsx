import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface GlassSelectProps {
  label: string;
  id: string;
  options: string[];
  required?: boolean;
}

export function GlassSelect({ label, id, options, required }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-2 relative" ref={ref}>
      {/* Hidden input to pass value natively with form submit */}
      <input type="hidden" name={id} id={id} value={selected} required={required} />
      
      <label
        className={`text-[11px] font-medium tracking-[0.06em] uppercase transition-colors ${open || selected ? "text-slate-800 dark:text-white/70" : "text-slate-500 dark:text-white/40"}`}
      >
        {label}
      </label>
      
      <div 
        onClick={() => setOpen(!open)}
        className={`w-full relative flex items-center justify-between cursor-pointer outline-none text-[14px] px-4 py-[13px] rounded-[4px] transition-all duration-300 ${open ? "border border-black/20 bg-black/[0.04] shadow-[0_0_15px_rgba(0,0,0,0.03)] dark:border-white/20 dark:bg-white/[0.04] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)]" : "border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02] shadow-none"}`}
      >
        <span className={selected ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-white/40"}>
          {selected || "Select an institution/class..."}
        </span>
        
        {/* Custom arrow indicator */}
        <div className="pointer-events-none opacity-50 text-slate-800 dark:text-white flex items-center justify-center transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Subtle glowing left accent line on focus */}
        <motion.div
           initial={{ scaleY: 0, opacity: 0 }}
           animate={{ scaleY: open ? 1 : 0, opacity: open ? 1 : 0 }}
           className="absolute left-0 top-0 bottom-0 w-px origin-center bg-gradient-to-b from-transparent via-slate-400 dark:via-white/60 to-transparent"
        />
      </div>

      <AnimatePresence>
        {open && (
           <motion.div
             initial={{ opacity: 0, y: -10, scale: 0.98 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: -5, scale: 0.98 }}
             transition={{ duration: 0.15 }}
             className="absolute top-[100%] left-0 right-0 mt-2 z-50 rounded-[8px] overflow-hidden backdrop-blur-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#0f0f0f]/95 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]"
           >
             <div className="max-h-[220px] overflow-y-auto outline-none flex flex-col p-1.5 gap-0.5" style={{ scrollbarWidth: "thin" }}>
               {options.length === 0 && (
                  <div className="px-3 py-3 text-[13px] text-slate-500 dark:text-white/40 italic text-center">No options available</div>
               )}
               {options.map((opt) => (
                 <div
                   key={opt}
                   onClick={() => { setSelected(opt); setOpen(false); }}
                   className={`flex items-center justify-between px-3 py-2.5 rounded-[4px] cursor-pointer transition-colors text-[13px] ${selected === opt ? "bg-black/5 text-slate-900 font-medium dark:bg-white/10 dark:text-white" : "text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`}
                 >
                   <span className="truncate">{opt}</span>
                   {selected === opt && <Check className="w-3.5 h-3.5 text-slate-800 dark:text-white/80 shrink-0" />}
                 </div>
               ))}
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

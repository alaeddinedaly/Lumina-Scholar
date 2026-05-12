"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const QUERIES = [
  "Show revenue by route for Q3 2024",
  "Which drivers had delay events this week?",
  "Compare fleet utilization: north vs south region",
  "Anomalies in the last 48 hours by vehicle type"
];

const mockData = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 550 },
  { name: 'Thu', value: 200 },
  { name: 'Fri', value: 600 },
  { name: 'Sat', value: 450 },
  { name: 'Sun', value: 380 },
];

export default function CommandBar() {
  const [queryIndex, setQueryIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [state, setState] = useState<"IDLE" | "THINKING" | "RESPONDED">("IDLE");

  // Typewriter effect
  useEffect(() => {
    if (state !== "IDLE" || isFocused) return;
    
    let currentText = "";
    const targetText = QUERIES[queryIndex];
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex < targetText.length) {
        currentText += targetText[charIndex];
        setTypewriterText(currentText);
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          if (state === "IDLE" && !isFocused) {
            setQueryIndex((prev) => (prev + 1) % QUERIES.length);
            setTypewriterText("");
          }
        }, 3000);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [queryIndex, state, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setState("THINKING");
    setTypewriterText("");
    
    setTimeout(() => {
      setState("RESPONDED");
      
      // Reset after 6s
      setTimeout(() => {
        setState("IDLE");
        setQueryIndex((prev) => (prev + 1) % QUERIES.length);
        setTypewriterText("");
      }, 6000);
      
    }, 1400);
  };

  return (
    <div className="w-full max-w-2xl mx-auto z-10 relative flex flex-col items-center">
      <form 
        onSubmit={handleSubmit}
        className={cn(
          "w-full glass-card h-14 md:h-16 flex items-center px-4 transition-all duration-300 relative",
          isFocused ? "shadow-[0_0_0_1px_#00f2ff,0_0_24px_rgba(0,242,255,0.2)]" : "shadow-lg"
        )}
      >
        <Search className="w-5 h-5 text-slate-600 dark:text-white/50 mr-3" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white !text-[16px] placeholder:text-slate-500 dark:placeholder:text-white/30"
          placeholder={state === "IDLE" ? typewriterText + "|" : ""}
          onFocus={() => { setIsFocused(true); setTypewriterText(""); }}
          onBlur={() => setIsFocused(false)}
          disabled={state !== "IDLE"}
        />
        {state === "THINKING" && (
          <div className="flex gap-1 items-center px-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-accent-cyan"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </div>
        )}
        {state === "IDLE" && (
          <button 
            type="submit" 
            className="text-xs bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 px-3 py-1.5 rounded text-slate-600 dark:text-white/80 transition-colors"
          >
            Enter ↵
          </button>
        )}
      </form>

      <AnimatePresence>
        {state === "RESPONDED" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full mt-4 glass-card p-6 border-accent-violet/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-accent-cyan">
                <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" /> Generating Output
              </h3>
              <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-slate-600 dark:text-white/60">4 rows returned in 23ms</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mock SQL */}
              <div className="p-4 bg-slate-50 dark:bg-black/40 rounded border border-black/5 dark:border-white/5 font-mono text-xs text-slate-700 dark:text-white/80">
                <span className="text-accent-violet">SELECT</span> route_id, <span className="text-accent-violet">SUM</span>(revenue)<br/>
                <span className="text-accent-violet">FROM</span> shipments<br/>
                <span className="text-accent-violet">WHERE</span> date <span className="text-accent-violet">&gt;=</span> <span className="text-green-400">&apos;2024-07-01&apos;</span><br/>
                <span className="text-accent-violet">GROUP BY</span> route_id<br/>
                <span className="text-accent-violet">ORDER BY</span> revenue <span className="text-accent-violet">DESC</span>
              </div>
              
              {/* Bar Chart Embed */}
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData}>
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="#00f2ff" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

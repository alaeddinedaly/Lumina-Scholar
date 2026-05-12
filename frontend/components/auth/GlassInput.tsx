import React, { useState } from "react";
import { motion } from "framer-motion";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function GlassInput({ label, id, ...props }: GlassInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-[11px] font-medium tracking-[0.06em] uppercase transition-colors ${focused ? "text-slate-800 dark:text-white/70" : "text-slate-500 dark:text-white/40"}`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`w-full bg-transparent outline-none text-[14px] text-slate-900 dark:text-white px-4 py-[13px] rounded-[4px] transition-all duration-300 ${focused ? "border border-black/20 bg-black/[0.04] shadow-[0_0_15px_rgba(0,0,0,0.03)] dark:border-white/20 dark:bg-white/[0.04] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)]" : "border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02] shadow-none"}`}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {/* Subtle glowing left accent line on focus */}
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          className="absolute left-0 top-0 bottom-0 w-px origin-center bg-gradient-to-b from-transparent via-slate-400 dark:via-white/60 to-transparent"
          style={{
            background: "var(--tw-gradient-stops)",
          }}
        />
      </div>
    </div>
  );
}

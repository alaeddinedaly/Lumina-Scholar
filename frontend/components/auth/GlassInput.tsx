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
        className="text-[11px] font-medium tracking-[0.06em] uppercase transition-colors"
        style={{ color: focused ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="w-full bg-transparent outline-none text-[14px] text-white px-4 py-[13px] rounded-[4px] transition-all duration-300"
          style={{
            background: focused ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
            border: focused
              ? "1px solid rgba(255,255,255,0.2)"
              : "1px solid rgba(255,255,255,0.08)",
            boxShadow: focused ? "0 0 15px rgba(255,255,255,0.03)" : "none",
          }}
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
          className="absolute left-0 top-0 bottom-0 w-px origin-center"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.6), transparent)",
          }}
        />
      </div>
    </div>
  );
}

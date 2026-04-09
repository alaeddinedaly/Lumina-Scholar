"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassInput } from "@/components/auth/GlassInput";
import { ArrowRight } from "lucide-react";

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[460px] p-[2px] rounded-[12px] relative overflow-hidden"
    >
      {/* ── Animated Border ── */}
      <div className="absolute inset-0 pointer-events-none rounded-[12px] z-0 isolate">
        <motion.div
          className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
          style={{
            background: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.02) 60%, transparent 100%)",
          }}
          animate={{ rotate: -360 }} // Reverse rotation for sign up
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 p-8 md:p-10 rounded-[11px] backdrop-blur-xl flex flex-col gap-8"
        style={{
          background: "rgba(10, 10, 10, 0.65)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.8)",
        }}>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-semibold tracking-tight text-[#f0f0f2]">
            Create a workspace
          </h1>
          <p className="text-[14px] text-white/40 font-light leading-relaxed">
            Configure your event-driven environment and invite your team.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="flex-1">
              <GlassInput
                id="firstName"
                type="text"
                label="First Name"
                placeholder="Ada"
                required
              />
            </div>
            <div className="flex-1">
              <GlassInput
                id="lastName"
                type="text"
                label="Last Name"
                placeholder="Lovelace"
                required
              />
            </div>
          </div>

          <GlassInput
            id="workspace"
            type="text"
            label="Workspace Name"
            placeholder="Acme Corp"
            required
          />

          <GlassInput
            id="email"
            type="email"
            label="Work Email"
            placeholder="ada@acme.com"
            required
          />
          <GlassInput
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            required
          />

          <p className="text-[11px] text-white/30 font-light mt-1">
            By creating an account, you agree to our <a href="#" className="underline hover:text-white/60 transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-white/60 transition-colors">Privacy Policy</a>.
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="group mt-2 relative w-full px-5 py-[13px] text-[13px] font-medium tracking-[0.05em] 
                       rounded-[4px] overflow-hidden transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              background: "#eeeef0",
              color: "#080808",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = "#ffffff"; }}
            onMouseLeave={e => { if (!isLoading) e.currentTarget.style.background = "#eeeef0"; }}
          >
            {isLoading ? (
              <motion.div
                className="w-4 h-4 border-2 border-[#080808]/20 border-t-[#080808] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <>
                Initialize Workspace
                <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] uppercase tracking-[0.1em] text-white/30">Or sign up with</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* OAuth */}
        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[4px] border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-[13px] text-white/70 hover:text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
            </svg>
            GitHub
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[4px] border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-[13px] text-white/70 hover:text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>

      </div>
    </motion.div>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, History, BarChart2 } from "lucide-react";

// Reusing the beautiful 3D background from auth for the main app
const AuthScene = dynamic(() => import("@/components/auth/AuthScene"), { ssr: false });

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAnalysisActive = pathname.includes("/upload") || pathname.includes("/schema") || pathname.includes("/query");
  const isHistoryActive = pathname.includes("/history");

  return (
    <div className="relative min-h-screen flex w-full overflow-hidden" style={{ background: "#050505" }}>
      {/* ── Grain overlay ── */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── 3D Background Canvas ── */}
      <div className="fixed inset-0 z-[0]">
        {/* Vignette so the UI components stand out */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(5,5,5,0.85) 100%)",
          }}
        />
        <AuthScene />
      </div>

      {/* ── Left Sidebar ── */}
      <aside className="relative z-[20] w-64 h-screen border-r border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl flex flex-col">
        {/* Branding */}
        <div className="h-20 flex items-center px-8 border-b border-white/5 shrink-0">
          <Link 
            href="/" 
            className="text-[14px] font-medium tracking-[0.15em] transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            LUMINA <span style={{ color: "rgba(255,255,255,0.3)" }}>BI</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          {/* Analysis Tab */}
          <Link 
            href="/upload"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${isAnalysisActive 
                ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5" 
                : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}
          >
            <BarChart2 className={`w-4 h-4 ${isAnalysisActive ? "text-accent-cyan" : "opacity-60"}`} />
            <span className="text-[13px] font-medium tracking-wide">Analysis</span>
          </Link>

          {/* History Tab */}
          <Link 
            href="/history"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${isHistoryActive 
                ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5" 
                : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}
          >
            <History className={`w-4 h-4 ${isHistoryActive ? "text-accent-violet" : "opacity-60"}`} />
            <span className="text-[13px] font-medium tracking-wide">History</span>
          </Link>
        </nav>
      </aside>

      {/* ── Main Content Pane ── */}
      <div className="flex-1 flex flex-col relative z-[10] h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 w-full flex items-center justify-between px-8 bg-gradient-to-b from-[#050505]/80 to-transparent shrink-0">
          <div className="flex items-center gap-2">
            {isAnalysisActive && (
              <div className="hidden md:flex gap-2 text-[10px] font-mono tracking-widest text-white/30 uppercase items-center">
                <span className={pathname.includes("/upload") ? "text-accent-cyan" : ""}>Import</span>
                <span className="opacity-50">/</span>
                <span className={pathname.includes("/schema") ? "text-accent-cyan" : ""}>Schema</span>
                <span className="opacity-50">/</span>
                <span className={pathname.includes("/query") ? "text-accent-cyan" : ""}>Query</span>
              </div>
            )}
            {isHistoryActive && (
              <div className="hidden md:flex gap-2 text-[10px] font-mono tracking-widest text-white/30 uppercase items-center">
                <span className="text-accent-violet">Archive</span>
                <span className="opacity-50">/</span>
                <span>Past Sessions</span>
              </div>
            )}
          </div>
          
          <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md">
            <span className="text-[10px] text-white/60 font-medium">JD</span>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 pb-12 flex justify-center items-start pt-8" style={{ scrollbarWidth: "thin" }}>
          <div className="w-full flex justify-center">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}

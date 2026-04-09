"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AuthScene = dynamic(() => import("@/components/auth/AuthScene"), { ssr: false });

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignIn = pathname === "/sign-in";

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#050505" }}>
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
        {/* Vignette so the form stands out */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(5,5,5,0.85) 100%)",
          }}
        />
        <AuthScene />
      </div>

      {/* ── Minimal Header ── */}
      <header className="absolute top-0 inset-x-0 z-[20] flex items-center justify-between px-8 py-6">
        <Link 
          href="/" 
          className="text-[13px] font-medium tracking-[0.15em] transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          LUMINA <span style={{ color: "rgba(255,255,255,0.3)" }}>BI</span>
        </Link>
        <div className="flex gap-4">
          <Link
            href={isSignIn ? "/sign-up" : "/sign-in"}
            className="text-[12px] font-medium tracking-wide transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >
            {isSignIn ? "Create account" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-[10] min-h-screen flex items-center justify-center px-4">
        {children}
      </main>
    </div>
  );
}

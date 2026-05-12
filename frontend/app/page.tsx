"use client";
import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ReactLenis, useLenis } from "lenis/react";
import { motion, useScroll, useTransform } from "framer-motion";

const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

// ── Content ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    n: "01",
    title: "AI Document Summarization",
    body: "Upload heavy academic PDFs. Lumina Scholar parses intent and returns structured study guides instantly — no manual highlighting required.",
  },
  {
    n: "02",
    title: "Instant Push Distribution",
    body: "A robust Professor Hub allows for direct drag-and-drop distribution of syllabi and grading rubrics straight to enrolled students.",
  },
  {
    n: "03",
    title: "Classroom Chat Channels",
    body: "Dedicated multi-tenant communication. Students and professors collaborate transparently via native real-time chat rooms.",
  },
  {
    n: "04",
    title: "Private AI Tutoring",
    body: "A strict context-bound AI bot that provides answers explicitly cited from your university's lecture slides. No hallucinations.",
  },
];

const METRICS = [
  { value: "< 2s", label: "Readtime" },
  { value: "99.9%", label: "Citation Accuracy" },
  { value: "PDF & PPTX", label: "File Types" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const scrollProgressRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  // Track hero-local scroll progress (0 → 1 as hero scrolls off screen)
  // Passed to HeroScene so it can drive morph + canvas fade inside rAF
  useLenis(({ scroll }) => {
    scrollProgressRef.current = Math.min(1, Math.max(0, scroll / window.innerHeight));
  });

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.42], [1, 0]);
  const heroTextY = useTransform(scrollYProgress, [0, 0.55], ["0px", "-52px"]);

  useEffect(() => { setMounted(true); }, []);

  return (
    <ReactLenis root options={{ lerp: 0.09, touchMultiplier: 1.4 }}>
      <main className="dark relative w-full overflow-x-hidden" style={{ background: "#080808" }}>

        {/* ── Grain overlay ── */}
        <div
          className="fixed inset-0 pointer-events-none z-[1] opacity-[0.028]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />

        {/* ── 3D canvas — fixed, fades itself via rAF, no React opacity state ── */}
        {mounted && (
          <div className="fixed inset-0 z-[2] pointer-events-none">
            {/* Vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: [
                  "radial-gradient(ellipse 95% 85% at 55% 50%, transparent 20%, rgba(8,8,8,0.52) 68%, rgba(8,8,8,0.96) 100%)",
                  "linear-gradient(to right, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.48) 34%, transparent 56%)",
                  "linear-gradient(to bottom, transparent 60%, rgba(8,8,8,0.7) 100%)",
                ].join(", "),
              }}
            />
            <HeroScene scrollProgressRef={scrollProgressRef} />
          </div>
        )}

        {/* ── Minimal Header ── */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="absolute top-0 inset-x-0 z-[50] flex items-center justify-between px-8 md:px-16 py-8 pointer-events-auto"
        >
          <Link 
            href="/" 
            className="text-[13px] font-medium tracking-[0.15em] transition-opacity hover:opacity-70 flex items-center gap-2"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            LUMINA <span style={{ color: "rgba(255,255,255,0.3)" }}>SCHOLAR</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-[12px] font-medium tracking-wide transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-5 py-2.5 text-[12px] font-medium tracking-wide rounded-[3px] transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
              onMouseEnter={(e) => {
                 e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                 e.currentTarget.style.color = "#ffffff";
                 e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                 e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                 e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                 e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              Get started
            </Link>
          </div>
        </motion.header>

        {/* ══════════════════════════════════════════════════════════════════════
            HERO — exactly h-screen, no extra height
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="relative z-[10] h-screen flex items-center">
          <motion.div
            style={{ y: heroTextY, opacity: heroOpacity }}
            className="w-full max-w-[1280px] mx-auto px-8 md:px-16"
          >
            <div className="max-w-[490px] flex flex-col gap-9 md:gap-10">

              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-5 h-px"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                />
                <span
                  className="text-[10px] tracking-[0.3em] uppercase font-medium"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  Automated University Ecosystem
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-semibold leading-[0.93] tracking-[-0.04em]"
                style={{
                  fontSize: "clamp(48px, 6.5vw, 80px)",
                  color: "#f0f0f2",
                }}
              >
                Your syllabus,
                <br />
                <span style={{ color: "rgba(255,255,255,0.32)" }}>finally</span>
                <br />
                understood.
              </motion.h1>

              {/* Body */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.28 }}
                className="text-[15px] md:text-[17px] leading-[1.7] font-light"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                Lumina Scholar integrates massive academic texts into semantic chunks, empowering students and professors to collaborate seamlessly with a Private Tutor AI.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.42 }}
                className="flex flex-wrap items-center gap-3 mt-2"
              >
                <Link
                  href="/professor/dashboard"
                  className="group relative block px-7 py-[11px] text-[13px] font-medium
                             tracking-[0.05em] rounded-[3px] overflow-hidden
                             transition-all duration-150 active:scale-[0.97]"
                  style={{ background: "rgba(0, 242, 255, 0.15)", color: "#00F2FF", border: "1px solid rgba(0, 242, 255, 0.3)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0, 242, 255, 0.25)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0, 242, 255, 0.15)"; }}
                >
                  Demo Professor View
                </Link>

                <Link
                  href="/student/dashboard"
                  className="group relative block px-7 py-[11px] text-[13px] font-medium
                             tracking-[0.05em] rounded-[3px] overflow-hidden
                             transition-all duration-150 active:scale-[0.97]"
                  style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34D399", border: "1px solid rgba(52, 211, 153, 0.3)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(52, 211, 153, 0.25)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(52, 211, 153, 0.15)"; }}
                >
                  Demo Student View
                </Link>
              </motion.div>

              {/* Metrics */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85, duration: 1 }}
                className="flex items-center pt-6"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                {METRICS.map((m, i) => (
                  <div key={m.label} className="flex items-center">
                    <div className="flex flex-col gap-[3px] px-5 first:pl-0">
                      <span
                        className="text-[20px] font-semibold tracking-tight tabular-nums"
                        style={{ color: "#ebebed" }}
                      >
                        {m.value}
                      </span>
                      <span
                        className="text-[9px] uppercase tracking-[0.25em]"
                        style={{ color: "rgba(255,255,255,0.22)" }}
                      >
                        {m.label}
                      </span>
                    </div>
                    {i < METRICS.length - 1 && (
                      <div
                        className="w-px h-6 mx-0.5 shrink-0"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      />
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.6, duration: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-[10px] pointer-events-none"
            style={{ color: "rgba(255,255,255,0.14)" }}
          >
            <span className="text-[8px] uppercase tracking-[0.42em]">Scroll</span>
            <div className="relative w-px h-10 overflow-hidden">
              <motion.div
                className="absolute inset-x-0 top-0 h-full"
                style={{
                  background: "linear-gradient(to bottom, rgba(255,255,255,0.32), transparent)",
                }}
                animate={{ y: ["0%", "100%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            FEATURES — starts immediately after hero, transparent bg so hero fades behind
        ═══════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative z-[10] w-full px-8 md:px-16 py-28 md:py-36"
          style={{
            background: "transparent",
          }}
        >
          <div className="max-w-[1280px] mx-auto">

            {/* Header */}
            <div className="mb-16 md:mb-20 max-w-lg">
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="block text-[10px] tracking-[0.32em] uppercase mb-5"
                style={{ color: "rgba(255,255,255,0.24)" }}
              >
                Capabilities
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="font-semibold tracking-[-0.03em] leading-[1.08]"
                style={{
                  fontSize: "clamp(30px, 3.6vw, 48px)",
                  color: "#f0f0f2",
                }}
              >
                Built for the way
                <br />academics actually collaborate.
              </motion.h2>
            </div>

            {/* 2 × 2 feature grid */}
            <div
              className="grid grid-cols-1 md:grid-cols-2"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.n}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  viewport={{ once: true }}
                  className="group relative p-9 md:p-11 transition-colors duration-300 cursor-default overflow-hidden"
                  style={{
                    borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.022)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {/* Left accent line on hover */}
                  <div
                    className="absolute left-0 top-8 bottom-8 w-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "rgba(255,255,255,0.18)" }}
                  />

                  <span
                    className="block text-[10px] tracking-[0.2em] mb-5"
                    style={{ color: "rgba(255,255,255,0.18)" }}
                  >
                    {f.n}
                  </span>
                  <h3
                    className="text-[16px] font-medium mb-3 tracking-tight"
                    style={{ color: "#e2e2e4" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-[13px] leading-[1.75] font-light"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    {f.body}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="mt-20 md:mt-24 flex flex-col md:flex-row md:items-end justify-between gap-8"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "3.5rem" }}
            >
              <div className="max-w-md">
                <h3
                  className="font-semibold tracking-tight mb-3"
                  style={{
                    fontSize: "clamp(22px, 2.4vw, 30px)",
                    color: "#f0f0f2",
                  }}
                >
                  Ready to upgrade your university experience?
                </h3>
                <p
                  className="text-[13px] font-light leading-[1.7]"
                  style={{ color: "rgba(255,255,255,0.30)" }}
                >
                  Join thousands of professors and students already learning and collaborating on Lumina Scholar.
                </p>
              </div>

              <Link
                href="/sign-up"
                className="shrink-0 self-start block px-8 py-3.5 text-[13px] font-medium
                           tracking-[0.06em] rounded-[3px] transition-colors duration-150
                           active:scale-[0.97]"
                style={{ background: "#eeeef0", color: "#080808" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#eeeef0"; }}
              >
                Get started →
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Minimal footer ── */}
        <footer
          className="relative z-[10] w-full px-8 md:px-16 py-8"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "#080808",
          }}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-between">
            <span
              className="text-[12px] font-medium tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              LUMINA
            </span>
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.14)" }}
            >
              © {new Date().getFullYear()}
            </span>
          </div>
        </footer>

      </main>
    </ReactLenis>
  );
}
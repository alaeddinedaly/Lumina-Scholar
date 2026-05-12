"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, History, BookOpen, GraduationCap, Menu, X, ChevronLeft, ChevronRight, FileText, LogOut, Loader2, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/SettingsContext";

// Reusing the beautiful 3D background from auth for the main app
const AuthScene = dynamic(() => import("@/components/auth/AuthScene"), { ssr: false });

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isProfessorFlow = pathname.startsWith("/professor");
  const isStudentFlow = pathname.startsWith("/student");

  const router = useRouter();
  const { t, animationsEnabled, theme } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string, role: string } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setUser(res.data);
    }).catch(err => {
      console.log("Not logged in");
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch(e) {
      console.error(e);
    } finally {
      router.push('/sign-in');
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sidebarVariants = {
    expanded: { width: "256px" },
    collapsed: { width: "84px" }
  };

  const navItemVariants = {
    expanded: { opacity: 1, display: "block", x: 0 },
    collapsed: { opacity: 0, display: "none", x: -10 }
  };

  const SidebarContent = () => (
    <>
      <div className={`h-20 flex items-center shrink-0 border-b border-black/10 dark:border-white/5 transition-all
        ${isCollapsed ? "justify-center px-0" : "px-8 justify-start"}`}>
        <Link 
          href="/" 
          className={`flex items-center text-[14px] font-medium tracking-[0.10em] transition-opacity hover:opacity-70 text-slate-800 dark:text-white/90
            ${isCollapsed ? "gap-0" : "gap-2"}`}
        >
          <GraduationCap className="w-6 h-6 text-accent-cyan shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div 
                initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants}
                className="whitespace-nowrap overflow-hidden"
              >
                LUMINA <span className="text-slate-500 dark:text-white/30">SCHOLAR</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="relative z-50 flex-1 px-4 py-6 flex flex-col gap-2 overflow-x-hidden">
        {isProfessorFlow && (
          <>
            <Link 
              href="/professor/dashboard"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname === "/professor/dashboard" ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <BookOpen className={`w-5 h-5 shrink-0 ${pathname === "/professor/dashboard" ? "text-accent-cyan" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                   <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('courseOverview')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
            <Link 
              href="/professor/distribution"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/distribution") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <History className={`w-5 h-5 shrink-0 ${pathname.includes("/distribution") ? "text-accent-cyan" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('distribution')}</motion.span>
                )}
              </AnimatePresence>
            </Link>

            <Link 
              href="/professor/communication"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/communication") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <Sparkles className={`w-5 h-5 shrink-0 ${pathname.includes("/communication") ? "text-accent-violet" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('communication')}</motion.span>
                )}
              </AnimatePresence>
            </Link>

            <Link 
              href="/professor/analytics"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/analytics") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <TrendingUp className={`w-5 h-5 shrink-0 ${pathname.includes("/analytics") ? "text-pink-400" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('analytics')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
          </>
        )}

        {isStudentFlow && (
          <>
            <Link 
              href="/student/dashboard"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname === "/student/dashboard" ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <BookOpen className={`w-5 h-5 shrink-0 ${pathname === "/student/dashboard" ? "text-emerald-400" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('myCourses')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
            <Link 
              href="/student/study-hub"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/study-hub") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <History className={`w-5 h-5 shrink-0 ${pathname.includes("/study-hub") ? "text-emerald-400" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('studyHub')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
            <Link 
              href="/student/communication"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/communication") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <Sparkles className={`w-5 h-5 shrink-0 ${pathname.includes("/communication") ? "text-accent-violet" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('tutorPeers')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
            <Link 
              href="/student/documents"
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/documents") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <FileText className={`w-5 h-5 shrink-0 ${pathname.includes("/documents") ? "text-emerald-400" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('documents')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
          </>
        )}

        <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5">
            <Link 
              href={isProfessorFlow ? "/professor/settings" : "/student/settings"}
              className={`flex items-center px-4 py-3 rounded-lg transition-all
                ${pathname.includes("/settings") ? "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5" : "text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/80"}
                ${isCollapsed ? "justify-center" : "gap-3 justify-start"}`}
            >
              <Menu className={`w-5 h-5 shrink-0 ${pathname.includes("/settings") ? "text-accent-cyan" : "opacity-60"}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial="collapsed" animate="expanded" exit="collapsed" variants={navItemVariants} className="text-[13px] font-medium tracking-wide whitespace-nowrap">{t('settings')}</motion.span>
                )}
              </AnimatePresence>
            </Link>
        </div>
      </nav>

      {/* Collapse Toggle for Desktop */}
      <div className="p-4 border-t border-white/5 hidden md:flex justify-center">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-10 rounded hover:bg-white/5 text-slate-500 dark:text-white/40 hover:text-white flex items-center justify-center transition-colors"
        >
           {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </>
  );

  return (
    <div className={`dashboard-layout relative min-h-screen flex w-full overflow-hidden ${theme === 'dark' ? 'dark' : ''}`} data-theme={theme} style={{ background: "var(--bg-primary)" }}>
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
        <div
          className="absolute inset-0 z-[1] pointer-events-none bg-radial-gradient-light dark:bg-radial-gradient-dark"
          style={{ background: theme === 'dark' ? "radial-gradient(circle at 50% 50%, transparent 0%, rgba(5,5,5,0.85) 100%)" : "radial-gradient(circle at 50% 50%, transparent 0%, rgba(248,250,252,0.85) 100%)" }}
        />
        {animationsEnabled && <AuthScene />}
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] md:hidden bg-black/80 backdrop-blur-sm"
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 left-0 bottom-0 w-64 bg-slate-50/90 dark:bg-[#0a0a0a]/90 border-r border-black/5 dark:border-white/5 flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 text-slate-800 dark:text-white/50 hover:text-black dark:hover:text-white"
            >
               <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ── */}
      <motion.aside 
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        className="relative z-[20] hidden md:flex h-screen border-r border-black/5 dark:border-white/5 bg-slate-50/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl flex-col"
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Main Content Pane ── */}
      <div className="flex-1 flex flex-col relative z-[10] h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 md:h-20 w-full flex items-center justify-between px-4 md:px-8 bg-gradient-to-b from-slate-50/80 dark:from-[#050505]/80 to-transparent shrink-0">
          <div className="flex items-center gap-4">
            <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="md:hidden text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
            >
               <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {isProfessorFlow && (
                <div className="flex gap-2 text-[10px] font-mono tracking-widest text-slate-600 dark:text-white/30 uppercase items-center">
                  <span className="text-accent-cyan">{t('professorView')}</span>
                </div>
              )}
              {isStudentFlow && (
                <div className="flex gap-2 text-[10px] font-mono tracking-widest text-slate-600 dark:text-white/30 uppercase items-center">
                  <span className="text-emerald-500 dark:text-emerald-400">{t('studentView')}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-9 h-9 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center backdrop-blur-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="text-[11px] text-slate-700 dark:text-white/80 font-medium tracking-widest leading-none">
                {user ? getUserInitials(user.name) : ""}
              </span>
            </button>
            
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div 
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="absolute right-0 mt-2 w-48 rounded-[8px] border border-black/10 dark:border-white/10 p-1 flex flex-col z-[100]"
                   style={{ background: theme === 'dark' ? "rgba(15, 15, 15, 0.95)" : "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(20px)", boxShadow: theme === 'dark' ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)" }}
                >
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1">
                    <p className="text-[12px] font-medium text-slate-800 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-600 dark:text-white/40 uppercase tracking-wider">{user?.role}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-[12px] text-red-500 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  >
                    {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    {isLoggingOut ? t('loggingOut') : t('secureLogOut')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-4 md:pt-8" style={{ scrollbarWidth: "thin" }}>
          {children}
        </main>
      </div>

    </div>
  );
}

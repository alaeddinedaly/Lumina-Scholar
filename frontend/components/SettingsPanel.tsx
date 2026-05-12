"use client";

import { useSettings } from "@/lib/SettingsContext";
import { motion } from "framer-motion";
import { Monitor, Moon, Sun, Languages, Zap, MonitorPlay, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPanel() {
  const { theme, setTheme, language, setLanguage, animationsEnabled, setAnimationsEnabled, t } = useSettings();

  return (
    <div className="w-full max-w-[800px] flex flex-col gap-6 pb-12 mx-auto">
      <div className="flex flex-col gap-2 border-b border-black/10 dark:border-white/5 pb-6">
        <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-[#f0f0f2] flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-accent-cyan" /> {t('preferences')}
        </h1>
        <p className="text-[14px] text-slate-600 dark:text-white/40 font-light leading-relaxed">
          {t('preferencesDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Component */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card flex flex-col overflow-hidden bg-slate-100/50 dark:bg-[#0a0a0a]/50 border border-black/5 dark:border-white/5 rounded-xl shadow-sm dark:shadow-none"
        >
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-white/[0.01]">
            <h2 className="text-[14px] font-medium text-slate-800 dark:text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-accent-cyan" /> {t('themeLanguage')}
            </h2>
          </div>
          
          <div className="p-5 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-[12px] font-medium text-slate-600 dark:text-white/60 uppercase tracking-widest">{t('theme')}</label>
              <div className="flex bg-slate-200/50 dark:bg-white/[0.03] rounded-lg p-1 border border-black/5 dark:border-white/5">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-all ${theme === 'light' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-700'}`}
                >
                  <Sun className="w-4 h-4" /> {t('lightMode')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-all ${theme === 'dark' ? 'bg-slate-900 shadow-sm text-white dark:bg-white/10 dark:shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-slate-600 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80'}`}
                >
                  <Moon className="w-4 h-4" /> {t('darkMode')}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[12px] font-medium text-slate-600 dark:text-white/60 uppercase tracking-widest">{t('appLanguage')}</label>
              <div className="flex bg-slate-200/50 dark:bg-white/[0.03] rounded-lg p-1 border border-black/5 dark:border-white/5">
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-all ${language === 'en' ? 'bg-white dark:bg-white/10 shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80'}`}
                >
                  <Languages className="w-4 h-4" /> {t('english')}
                </button>
                <button
                  onClick={() => setLanguage('fr')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-all ${language === 'fr' ? 'bg-white dark:bg-white/10 shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80'}`}
                >
                  <Languages className="w-4 h-4" /> {t('french')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Performance Component */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card flex flex-col overflow-hidden bg-slate-100/50 dark:bg-[#0a0a0a]/50 border border-black/5 dark:border-white/5 rounded-xl shadow-sm dark:shadow-none"
        >
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-white/[0.01]">
            <h2 className="text-[14px] font-medium text-slate-800 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> {t('performance')}
            </h2>
          </div>
          
          <div className="p-5 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-slate-800 dark:text-white flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-slate-500 dark:text-white/40" /> {t('animations')}
                </label>
                
                {/* Custom Toggle Switch */}
                <button 
                  onClick={() => setAnimationsEnabled(!animationsEnabled)}
                  className={`w-11 h-6 rounded-full flex items-center transition-colors p-1 ${animationsEnabled ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-white/10'}`}
                >
                  <motion.div 
                    layout
                    className={`w-4 h-4 rounded-full bg-white shadow-sm`}
                    initial={false}
                    animate={{
                      x: animationsEnabled ? 20 : 0
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              <p className="text-[12px] text-slate-600 dark:text-white/40 leading-relaxed">
                {t('animationsDesc')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

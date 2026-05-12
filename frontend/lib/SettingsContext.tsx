"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language, TranslationKey } from "./translations";

type Theme = "dark" | "light";

interface SettingsContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  t: (key: TranslationKey) => string;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>("en");
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    const savedTheme = localStorage.getItem("lumina-theme") as Theme | null;
    const savedLang = localStorage.getItem("lumina-lang") as Language | null;
    const savedAnim = localStorage.getItem("lumina-anim");

    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      setThemeState("dark");
    }

    if (savedLang) setLanguageState(savedLang);
    if (savedAnim !== null) setAnimationsEnabledState(savedAnim === "true");

    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("lumina-theme", newTheme);
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem("lumina-lang", newLang);
  };

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
    localStorage.setItem("lumina-anim", enabled.toString());
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        language,
        setLanguage,
        animationsEnabled,
        setAnimationsEnabled,
        t,
      }}
    >
      {/* 
        We must always render the provider, even during SSR. 
        If we need to prevent hydration flicker, we can hide the children via a wrapper, 
        but returning early drops the context for all pre-rendered children.
      */}
      <div style={!mounted ? { visibility: "hidden" } : { display: "contents" }}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

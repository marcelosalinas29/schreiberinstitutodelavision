import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "dia", label: "Día", hint: "Limpio y claro" },
  { id: "noche", label: "Noche", hint: "Oscuro" },
  { id: "neon", label: "Neón", hint: "Alto contraste" },
  { id: "azul", label: "Azul médico", hint: "Profesional" },
  { id: "sepia", label: "Sepia", hint: "Descanso visual" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "riz-theme";
const DARK_THEMES: ThemeId[] = ["noche", "neon"];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dia", setTheme: () => {} });

function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dia");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isThemeId(stored)) setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", DARK_THEMES.includes(theme));
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

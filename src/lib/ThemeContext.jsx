import { createContext, useContext, useEffect, useState } from "react";
import { applyColorTheme } from "@/lib/colorThemes";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {}, colorScheme: "neon_green", setColorScheme: () => {} });

function getSystemTheme() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    return getSystemTheme();
  });
  const [colorScheme, setColorSchemeState] = useState(() => {
    return localStorage.getItem("colorScheme") || "neon_green";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    applyColorTheme(colorScheme);
  }, [theme, colorScheme]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  const setColorScheme = (scheme) => {
    localStorage.setItem("colorScheme", scheme);
    setColorSchemeState(scheme);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme, colorScheme, setColorScheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
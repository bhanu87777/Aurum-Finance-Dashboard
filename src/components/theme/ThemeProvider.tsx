"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

// The <html> class (stamped pre-paint by ThemeScript) is the source of truth;
// expose it through useSyncExternalStore so hydration mismatches resolve the
// sanctioned way instead of a setState-in-effect.
let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark"; // brand default
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// localStorage keeps loads flash-free (ThemeScript applies it pre-paint);
// the server preference is a best-effort mirror so the choice follows the
// account across devices.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.classList.toggle("light", t === "light");
    try {
      localStorage.setItem("aurum-theme", t);
    } catch {}
    for (const l of listeners) l();
    fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

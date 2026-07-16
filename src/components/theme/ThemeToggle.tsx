"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={`btn-ghost rounded-lg px-3 py-2 text-xs ${className}`}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
    </button>
  );
}

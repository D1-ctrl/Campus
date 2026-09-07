"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  variant?: "icon" | "menu-item";
};

export default function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage kann in manchen Kontexten (z.B. privater Modus) fehlschlagen
    }
    setIsDark(next);
  }

  if (variant === "menu-item") {
    return (
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/10"
      >
        {isDark ? <Moon size={18} strokeWidth={1.75} /> : <Sun size={18} strokeWidth={1.75} />}
        {isDark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
    >
      {isDark ? <Moon size={17} strokeWidth={1.75} /> : <Sun size={17} strokeWidth={1.75} />}
    </button>
  );
}

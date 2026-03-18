"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeToggleButton, useThemeTransition } from "@/components/ui/theme-toggle-button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
  const { startTransition } = useThemeTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 border border-border rounded-xl shadow-sm bg-background" />
    );
  }

  const handleThemeChange = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    startTransition(() => {
      setTheme(newTheme);
    });
  };

  return (
    <ThemeToggleButton
      theme={theme as "light" | "dark"}
      variant="circle"
      start="top-right"
      onClick={handleThemeChange}
    />
  );
}

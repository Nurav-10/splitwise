"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";

interface ThemeToggleProps {
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "sm" | "icon" | "default";
  className?: string;
}

export function ThemeToggle({
  variant = "ghost",
  size = "sm",
  className = "",
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`size-9 p-0 rounded-lg text-muted-foreground ${className}`}
        aria-label="Toggle theme"
      >
        <span className="size-4 block" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`size-9 p-0 rounded-lg text-muted-foreground hover:text-foreground transition-colors ${className}`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <HugeiconsIcon icon={Sun01Icon} size={18} className="text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <HugeiconsIcon icon={Moon02Icon} size={18} className="text-slate-700 transition-transform duration-200 rotate-0 hover:-rotate-12" />
      )}
    </Button>
  );
}

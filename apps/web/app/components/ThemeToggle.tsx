"use client";

import { useTheme } from "../context/ThemeContext";
import { Button } from "@site-haus/ui/components/base/button";

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      className="bg-white text-black px-4 py-2 rounded"
    >
      Toggle to {theme === "light" ? "Dark" : "Light"} Mode
    </Button>
  );
}

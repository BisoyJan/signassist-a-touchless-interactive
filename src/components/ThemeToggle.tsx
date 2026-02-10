"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Render a stable label before hydration to avoid server/client text mismatch.
    const label = mounted ? (theme === "dark" ? "☀️ Light" : "🌙 Dark") : "🌗 Theme";

    return (
        <button
            onClick={toggleTheme}
            className="px-3 py-1 bg-th-surface-2 border border-th-border-2 rounded-lg text-sm text-th-fg hover:bg-th-surface-3 transition-colors"
            data-hand-nav
            title="Toggle theme"
        >
            {label}
        </button>
    );
}

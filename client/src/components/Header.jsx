import { useState } from "react";
import { useTheme } from "../core/ThemeContext";

function maskCode(code) {
  return code.replace(/[^-]/g, "•");
}

function AccessCodeBadge({ code }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      title={revealed ? "Click to hide access code" : "Click to reveal access code"}
      className="figure hidden rounded px-1.5 py-0.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:inline"
    >
      {revealed ? code : maskCode(code)}
    </button>
  );
}

function ThemeToggle() {
  const { resolved, setPreference } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setPreference(resolved === "dark" ? "light" : "dark")}
      className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {resolved === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function Header({ eyebrow, title, accessCode, userLabel, onLogout, loading }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      {loading && <div className="progress-bar" aria-hidden="true" />}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/brand/virasaka-icon-square.svg" alt="" className="h-8 w-8 rounded-lg" />
          <div className="leading-tight">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-lg font-semibold text-slate-900 dark:text-white">Axiora</span>
              {eyebrow && (
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--role-accent)", backgroundColor: "var(--role-accent-soft)" }}
                >
                  {eyebrow}
                </span>
              )}
            </div>
            {title && <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {accessCode && <AccessCodeBadge code={accessCode} />}
          {userLabel && <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{userLabel}</span>}
          <ThemeToggle />
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

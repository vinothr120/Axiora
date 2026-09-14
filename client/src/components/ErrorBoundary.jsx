import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[axiora] Unhandled render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-950">
          <img src="/brand/virasaka-icon-square.svg" alt="" className="h-12 w-12 rounded-xl" />
          <div>
            <h1 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">Something went wrong</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              An unexpected error occurred. Try reloading the page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--role-accent)" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

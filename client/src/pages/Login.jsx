import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "../core/ClientAuthContext";
import Footer from "../components/Footer";

const ERROR_MESSAGES = {
  invalid_code: "That code isn't recognized. Check it and try again.",
  code_revoked: "This code has been revoked.",
  code_expired: "This code has expired. Contact your admin for a new one.",
  code_required: "Enter your access code.",
};

export default function Login() {
  const { login } = useClientAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(code.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-role="client" className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src="/brand/virasaka-icon-square.svg" alt="" className="h-12 w-12 rounded-xl" />
            <div className="text-center">
              <h1 className="font-heading text-2xl font-semibold text-slate-900 dark:text-white">Axiora</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Trading level calculator · by Virasaka</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Access code
            </label>
            <input
              id="code"
              autoFocus
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="AXR-XXXX-XXXX"
              className="figure w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-wider text-slate-900 placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-600"
            />
            {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !code}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--role-accent)" }}
            >
              {submitting ? "Checking…" : "Enter"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Codes are issued by your admin and expire after inactivity or their set validity period.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

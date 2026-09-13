import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useClientAuth } from "../core/ClientAuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { InputsAndStatsTable, TradeLevelsTable } from "../components/CalculatorTable";

function rowsToInputs(rows) {
  const map = {};
  for (const row of rows) {
    map[row.key] = { open: row.input.open, high: row.input.high, low: row.input.low, close: row.input.close };
  }
  return map;
}

export default function Calculator() {
  const { info, logout } = useClientAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [rows, setRows] = useState(null);
  const [inputs, setInputs] = useState({});
  const [status, setStatus] = useState("loading"); // loading | ready | recalculating | error
  const debounceRef = useRef(null);

  useEffect(() => {
    api
      .listTemplates()
      .then(({ templates }) => {
        setTemplates(templates);
        if (templates[0]) setActiveId(templates[0].id);
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setStatus("loading");
    api
      .getTemplate(activeId)
      .then(({ rows }) => {
        setRows(rows);
        setInputs(rowsToInputs(rows));
        setStatus("ready");
      })
      .catch((err) => {
        if (err.status === 401) handleSessionLost();
        else setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function handleSessionLost() {
    navigate("/login", { replace: true });
  }

  const recalculate = useCallback(
    (nextInputs) => {
      setStatus("recalculating");
      api
        .calculate(activeId, nextInputs)
        .then(({ rows }) => {
          setRows(rows);
          setStatus("ready");
        })
        .catch((err) => {
          if (err.status === 401) handleSessionLost();
          else setStatus("error");
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId]
  );

  function handleChange(key, field, value) {
    const num = value === "" ? "" : Number(value);
    const nextInputs = { ...inputs, [key]: { ...inputs[key], [field]: num } };
    setInputs(nextInputs);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const complete = {};
      for (const [k, v] of Object.entries(nextInputs)) {
        if ([v.open, v.high, v.low, v.close].every((n) => n !== "" && Number.isFinite(n))) {
          complete[k] = v;
        }
      }
      recalculate(complete);
    }, 400);
  }

  return (
    <div data-role="client" className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <Header eyebrow="Client" title={info?.label || "Trading calculator"} userLabel={info?.expiresAt ? `Access until ${info.expiresAt.slice(0, 10)}` : undefined} onLogout={logout} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {templates.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  activeId === t.id
                    ? "text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                style={activeId === t.id ? { backgroundColor: "var(--role-accent)" } : undefined}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {!rows && status === "loading" && <p className="py-12 text-center text-sm text-slate-400">Loading…</p>}
        {status === "error" && <p className="py-12 text-center text-sm text-red-600">Something went wrong loading the calculator. Refresh to try again.</p>}

        {rows && (
          <div className="space-y-6">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Inputs &amp; stats
                </h2>
                {status === "recalculating" && <span className="text-xs text-slate-400">Recalculating…</span>}
              </div>
              <InputsAndStatsTable rows={rows} inputs={inputs} onChange={handleChange} />
            </section>

            <section>
              <h2 className="mb-2 font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
                Trade levels
              </h2>
              <TradeLevelsTable rows={rows} />
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

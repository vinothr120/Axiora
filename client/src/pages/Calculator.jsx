import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useClientAuth } from "../core/ClientAuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { InputsAndStatsTable, TradeLevelsTable, FibonacciLadderTable } from "../components/CalculatorTable";
import AddRowForm from "../components/AddRowForm";

function rowsToInputs(rows) {
  const map = {};
  for (const row of rows) map[row.key] = { ...row.input };
  return map;
}

function customMetaFromRows(customRows) {
  const map = {};
  for (const c of customRows) map[c.key] = { label: c.label, group: c.group };
  return map;
}

export default function Calculator() {
  const { info, logout } = useClientAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [statColumns, setStatColumns] = useState([]);
  const [inputFields, setInputFields] = useState(["open", "high", "low", "close"]);
  const [layout, setLayout] = useState("ladder");
  const [rows, setRows] = useState(null);
  const [inputs, setInputs] = useState({});
  const [customMeta, setCustomMeta] = useState({});
  const [hiddenKeys, setHiddenKeys] = useState(new Set());
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
      .then(({ rows, groups, statColumns, inputFields, layout, customRows, hiddenKeys }) => {
        setRows(rows);
        setInputs(rowsToInputs(rows));
        setGroups(groups);
        setStatColumns(statColumns || []);
        setInputFields(inputFields && inputFields.length > 0 ? inputFields : ["open", "high", "low", "close"]);
        setLayout(layout || "ladder");
        setCustomMeta(customMetaFromRows(customRows));
        setHiddenKeys(new Set(hiddenKeys));
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
    (payload) => {
      setStatus("recalculating");
      api
        .calculate(activeId, payload)
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

  function buildPayload(nextInputs, nextCustomMeta, nextHidden) {
    const edits = {};
    const custom = [];
    for (const [key, ohlc] of Object.entries(nextInputs)) {
      if (inputFields.some((f) => ohlc[f] === "" || !Number.isFinite(ohlc[f]))) continue;
      const meta = nextCustomMeta[key];
      if (meta) custom.push({ key, label: meta.label, group: meta.group, ...ohlc });
      else edits[key] = ohlc;
    }
    return { edits, custom, hidden: [...nextHidden] };
  }

  function handleChange(key, field, value) {
    const num = value === "" ? "" : Number(value);
    const nextInputs = { ...inputs, [key]: { ...inputs[key], [field]: num } };
    setInputs(nextInputs);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      recalculate(buildPayload(nextInputs, customMeta, hiddenKeys));
    }, 400);
  }

  function handleAddRow(newRow) {
    const { key, label, group, ...ohlc } = newRow;
    const nextInputs = { ...inputs, [key]: ohlc };
    const nextCustomMeta = { ...customMeta, [key]: { label, group } };
    setInputs(nextInputs);
    setCustomMeta(nextCustomMeta);
    clearTimeout(debounceRef.current);
    recalculate(buildPayload(nextInputs, nextCustomMeta, hiddenKeys));
  }

  function handleDeleteRow(key) {
    const nextInputs = { ...inputs };
    delete nextInputs[key];
    let nextCustomMeta = customMeta;
    let nextHidden = hiddenKeys;
    if (customMeta[key]) {
      nextCustomMeta = { ...customMeta };
      delete nextCustomMeta[key];
      setCustomMeta(nextCustomMeta);
    } else {
      nextHidden = new Set(hiddenKeys);
      nextHidden.add(key);
      setHiddenKeys(nextHidden);
    }
    setInputs(nextInputs);
    setRows((prev) => prev.filter((r) => r.key !== key));
    clearTimeout(debounceRef.current);
    recalculate(buildPayload(nextInputs, nextCustomMeta, nextHidden));
  }

  function handleReset() {
    clearTimeout(debounceRef.current);
    setStatus("recalculating");
    api
      .resetTemplate(activeId)
      .then(({ rows, customRows, hiddenKeys }) => {
        setRows(rows);
        setInputs(rowsToInputs(rows));
        setCustomMeta(customMetaFromRows(customRows || []));
        setHiddenKeys(new Set(hiddenKeys || []));
        setStatus("ready");
      })
      .catch((err) => {
        if (err.status === 401) handleSessionLost();
        else setStatus("error");
      });
  }

  return (
    <div data-role="client" className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <Header
        eyebrow="Client"
        title={info?.label || "Trading calculator"}
        userLabel={info?.expiresAt ? `Access until ${info.expiresAt.slice(0, 10)}` : undefined}
        onLogout={logout}
        loading={status === "recalculating"}
      />

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
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  Reset to default
                </button>
              </div>
              <InputsAndStatsTable
                rows={rows}
                inputs={inputs}
                onChange={handleChange}
                onDeleteRow={handleDeleteRow}
                statColumns={statColumns}
                inputFields={inputFields}
              />
              {groups.length > 0 && <AddRowForm groups={groups} inputFields={inputFields} onAdd={handleAddRow} />}
            </section>

            <section>
              <h2 className="mb-2 font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">
                Trade levels
              </h2>
              {layout === "fibonacci" ? <FibonacciLadderTable rows={rows} /> : <TradeLevelsTable rows={rows} />}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

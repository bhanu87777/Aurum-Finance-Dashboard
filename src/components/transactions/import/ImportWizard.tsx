"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/dashboard/Tables";
import { formatMoney, dateLabel } from "@/lib/utils";

const FIELDS = [
  { key: "buyer", label: "Buyer name", required: true, guesses: ["buyer", "name", "customer"] },
  { key: "email", label: "Buyer email", required: true, guesses: ["email", "e-mail", "mail"] },
  { key: "amount", label: "Amount", required: true, guesses: ["amount", "total", "price", "value"] },
  { key: "occurredAt", label: "Date", required: true, guesses: ["date", "occurred", "created", "time"] },
  { key: "product", label: "Product (by name)", required: true, guesses: ["product", "item", "sku"] },
  { key: "quantity", label: "Quantity", required: false, guesses: ["quantity", "qty", "units"] },
  { key: "status", label: "Status", required: false, guesses: ["status", "state"] },
  { key: "method", label: "Payment method", required: false, guesses: ["method", "payment"] },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

type DryRunResult = {
  validCount: number;
  errorCount: number;
  preview: { buyer: string; email: string; amount: number; quantity: number; status: string; method: string; occurredAt: string }[];
  errors: { line: number; message: string }[];
};

const STEPS = ["Upload", "Map columns", "Preview", "Import"] as const;

export function ImportWizard() {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [header, setHeader] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [dragOver, setDragOver] = useState(false);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; errorCount: number } | null>(null);

  // ---- Step 1: upload + client-side parse (papaparse handles quoting, BOM, newlines) ----
  function onFile(file: File) {
    setError(null);
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError("Choose a .csv file.");
      return;
    }
    if (file.size > 1_000_000) {
      setError("The file exceeds the 1MB limit.");
      return;
    }
    file.text().then((text) => {
      const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
      if (parsed.errors.length > 0 || !parsed.data || parsed.data.length < 2) {
        setError("Could not read that CSV — it needs a header row and at least one data row.");
        return;
      }
      const head = parsed.data[0].map((h) => h.trim());
      setFileName(file.name);
      setCsvText(text);
      setHeader(head);
      setSamples(parsed.data.slice(1, 4));

      // Auto-guess the mapping from header names.
      const guessed: Partial<Record<FieldKey, string>> = {};
      for (const f of FIELDS) {
        const hit = head.find((h) => f.guesses.some((g) => h.toLowerCase().includes(g)));
        if (hit) guessed[f.key] = hit;
      }
      setMapping(guessed);
      setStep(1);
    });
  }

  // ---- Step 2 → 3: server dry run ----
  async function runPreview() {
    for (const f of FIELDS) {
      if (f.required && !mapping[f.key]) {
        setError(`Map a column to "${f.label}".`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/transactions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText, mapping, dryRun: true }),
    }).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? "Preview failed. Try again.");
      return;
    }
    setDryRun(await res.json());
    setStep(2);
  }

  // ---- Step 3 → 4: commit ----
  async function runImport() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/transactions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText, mapping, dryRun: false }),
    }).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? "Import failed. Nothing was written.");
      return;
    }
    const data = await res.json();
    setResult(data);
    setStep(3);
    toast({ kind: "success", title: `Imported ${data.inserted} transactions` });
  }

  function downloadErrors() {
    if (!dryRun) return;
    const lines = ["Line,Problem", ...dryRun.errors.map((e) => `${e.line},"${e.message.replace(/"/g, '""')}"`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aurum-import-errors.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const sampleFor = (headerName?: string) => {
    if (!headerName) return [];
    const idx = header.indexOf(headerName);
    return idx < 0 ? [] : samples.map((r) => r[idx] ?? "");
  };

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Import transactions</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Upload a CSV, map its columns, review what will land, then commit.
        </p>
      </div>

      {/* Step header */}
      <ol className="mb-6 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                i === step ? "btn-gold" : i < step ? "seg-active" : "bg-surface-2 text-muted"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={`text-xs font-semibold ${i === step ? "text-ink" : "text-muted"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border-strong" aria-hidden />}
          </li>
        ))}
      </ol>

      {/* Step 1 — Upload */}
      {step === 0 && (
        <section
          className={`panel flex flex-col items-center justify-center gap-3 p-14 text-center transition-colors ${
            dragOver ? "border-gold" : ""
          }`}
          style={dragOver ? { borderColor: "var(--gold)", borderStyle: "dashed" } : { borderStyle: "dashed" }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
        >
          <p className="text-4xl" aria-hidden>
            ⇪
          </p>
          <p className="text-sm font-semibold">Drop a CSV here, or browse</p>
          <p className="text-xs text-muted">
            Needs a header row. Up to 2,000 rows / 1MB. Products are matched by name against the catalog.
          </p>
          <button onClick={() => fileInput.current?.click()} className="btn-gold mt-2 rounded-xl px-5 py-2.5 text-xs">
            Choose file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
          {error && <p className="text-sm text-critical">{error}</p>}
        </section>
      )}

      {/* Step 2 — Mapping */}
      {step === 1 && (
        <section className="panel p-6">
          <p className="mb-5 text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{fileName}</span> · {header.length} columns detected. Match each field to a CSV column.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <SelectField
                  label={f.label}
                  id={`map-${f.key}`}
                  required={f.required}
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                >
                  <option value="">{f.required ? "Select a column…" : "Not in this file"}</option>
                  {header.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </SelectField>
                {mapping[f.key] && (
                  <p className="mt-1 truncate text-[11px] text-muted">
                    e.g. {sampleFor(mapping[f.key]).filter(Boolean).slice(0, 3).join(" · ") || "—"}
                  </p>
                )}
              </div>
            ))}
          </div>
          {error && <p className="mt-4 text-sm text-critical">{error}</p>}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(0)} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold">
              ← Back
            </button>
            <button onClick={runPreview} disabled={busy} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
              {busy ? "Validating…" : "Validate & preview →"}
            </button>
          </div>
        </section>
      )}

      {/* Step 3 — Preview */}
      {step === 2 && dryRun && (
        <section className="panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-bold text-good">✓ {dryRun.validCount} valid</span>
              {dryRun.errorCount > 0 && (
                <span className="font-bold text-critical"> · ✕ {dryRun.errorCount} will be skipped</span>
              )}
            </p>
            {dryRun.errors.length > 0 && (
              <button onClick={downloadErrors} className="btn-ghost rounded-lg px-3 py-1.5 text-xs">
                Download error rows ↓
              </button>
            )}
          </div>

          {dryRun.errors.length > 0 && (
            <div className="mb-4 max-h-36 overflow-y-auto rounded-xl bg-surface-2 p-3">
              {dryRun.errors.map((e, i) => (
                <p key={i} className="text-xs text-critical">
                  Line {e.line}: <span className="text-ink-secondary">{e.message}</span>
                </p>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="pb-2.5 pr-4 font-semibold">Date</th>
                  <th className="pb-2.5 pr-4 font-semibold">Buyer</th>
                  <th className="pb-2.5 pr-4 font-semibold">Qty</th>
                  <th className="pb-2.5 pr-4 font-semibold">Method</th>
                  <th className="pb-2.5 pr-4 font-semibold">Status</th>
                  <th className="pb-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {dryRun.preview.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 text-ink-secondary">{dateLabel(r.occurredAt)}</td>
                    <td className="py-2 pr-4">
                      <p className="font-semibold">{r.buyer}</p>
                      <p className="text-xs text-muted">{r.email}</p>
                    </td>
                    <td className="num py-2 pr-4">{r.quantity}</td>
                    <td className="py-2 pr-4 text-xs text-ink-secondary">{r.method}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="num py-2 text-right font-bold">{formatMoney(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dryRun.validCount > dryRun.preview.length && (
              <p className="mt-2 text-xs text-muted">…and {dryRun.validCount - dryRun.preview.length} more valid rows.</p>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-critical">{error}</p>}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold">
              ← Adjust mapping
            </button>
            <button
              onClick={runImport}
              disabled={busy || dryRun.validCount === 0}
              className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60"
            >
              {busy ? "Importing…" : `Import ${dryRun.validCount} transactions →`}
            </button>
          </div>
        </section>
      )}

      {/* Step 4 — Done */}
      {step === 3 && result && (
        <section className="panel flex flex-col items-center gap-3 p-14 text-center">
          <p className="text-4xl" aria-hidden>
            ✓
          </p>
          <p className="font-display text-2xl">{result.inserted} transactions imported</p>
          {result.errorCount > 0 && (
            <p className="text-sm text-ink-secondary">{result.errorCount} rows were skipped — download the error list from the preview step next time.</p>
          )}
          <div className="mt-3 flex gap-2">
            <Link href="/transactions" className="btn-gold rounded-xl px-5 py-2.5 text-xs">
              View the ledger →
            </Link>
            <button
              onClick={() => {
                setStep(0);
                setDryRun(null);
                setResult(null);
                setCsvText("");
              }}
              className="btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              Import another file
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

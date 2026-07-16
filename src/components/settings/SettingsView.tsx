"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SelectField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/components/theme/ThemeProvider";

export function SettingsView({
  name: initialName,
  email,
  defaultRange: initialRange,
  ledgerPageSize: initialPageSize,
}: {
  name: string;
  email: string;
  defaultRange: string;
  ledgerPageSize: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const { update } = useSession();
  const { theme, setTheme } = useTheme();

  // Profile
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // Preferences
  const [range, setRange] = useState(initialRange);
  const [pageSize, setPageSize] = useState(String(initialPageSize));
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function saveName() {
    setSavingName(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    setSavingName(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Rename failed", detail: data?.error });
      return;
    }
    await update({ name }); // refresh the JWT so the sidebar updates now
    toast({ kind: "success", title: "Profile updated" });
    router.refresh();
  }

  async function savePassword() {
    setPwError(null);
    if (newPassword !== confirmPassword) {
      setPwError("The new passwords don't match.");
      return;
    }
    setSavingPw(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).catch(() => null);
    setSavingPw(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setPwError(data?.error ?? "Something went wrong. Try again.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({ kind: "success", title: "Password changed" });
  }

  async function savePrefs() {
    setSavingPrefs(true);
    const res = await fetch("/api/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultRange: range, ledgerPageSize: Number(pageSize) }),
    }).catch(() => null);
    setSavingPrefs(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Preferences not saved", detail: data?.error });
      return;
    }
    toast({ kind: "success", title: "Preferences saved" });
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">Profile, security, and how the console behaves.</p>
      </div>

      {/* Profile */}
      <section className="panel mb-5 p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide">Profile</h2>
        <div className="space-y-4">
          <TextField label="Name" id="st-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <TextField label="Email" id="st-email" value={email} disabled hint="Sign-in email can't be changed." />
          <div className="flex justify-end">
            <button onClick={saveName} disabled={savingName || !name.trim()} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
              {savingName ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </section>

      {/* Password */}
      <section className="panel mb-5 p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide">Password</h2>
        <div className="space-y-4">
          <TextField
            label="Current password"
            id="st-current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="New password"
              id="st-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 8 characters."
            />
            <TextField
              label="Confirm new password"
              id="st-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {pwError && <p className="text-sm text-critical">{pwError}</p>}
          <div className="flex justify-end">
            <button
              onClick={savePassword}
              disabled={savingPw || !currentPassword || !newPassword}
              className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60"
            >
              {savingPw ? "Saving…" : "Change password"}
            </button>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="panel mb-5 p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide">Appearance</h2>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              { key: "dark", label: "Dark", desc: "The committed AURUM look", bg: "#0a0a0f", fg: "#f2efe6" },
              { key: "light", label: "Light", desc: "Warm ivory paper", bg: "#f7f5ef", fg: "#1b1a14" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className="rounded-xl border p-4 text-left transition-colors"
              style={{
                background: t.bg,
                color: t.fg,
                borderColor: theme === t.key ? "var(--gold)" : "var(--border-strong)",
                borderWidth: theme === t.key ? 2 : 1,
              }}
              aria-pressed={theme === t.key}
            >
              <p className="text-sm font-bold">{t.label}</p>
              <p className="mt-0.5 text-xs opacity-70">{t.desc}</p>
              {theme === t.key && <p className="mt-2 text-xs font-bold text-gold">✓ Active</p>}
            </button>
          ))}
        </div>
      </section>

      {/* Preferences */}
      <section className="panel p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide">Data preferences</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Default dashboard range" id="st-range" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="12m">Last 12 months</option>
            <option value="24m">Last 24 months</option>
            <option value="ytd">Year to date</option>
          </SelectField>
          <SelectField label="Ledger rows per page" id="st-pagesize" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </SelectField>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={savePrefs} disabled={savingPrefs} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
            {savingPrefs ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </section>
    </div>
  );
}

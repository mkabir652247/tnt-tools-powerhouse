import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
  head: () => ({ meta: [{ title: "Settings — TNT Tools Admin" }] }),
});

function AdminSettings() {
  const { user } = Route.useRouteContext();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (password.length < 8) {
      setStatus({ ok: false, text: "Use at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ ok: false, text: "The two new passwords don't match." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      // @ts-expect-error current_password is accepted by the auth API
      current_password: currentPassword,
    });
    setBusy(false);
    if (error) {
      setStatus({ ok: false, text: error.message });
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    setStatus({ ok: true, text: "Password updated." });
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Settings</h1>

      <section className="rounded-sm border border-border bg-surface p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{user.email}</span> (administrator).
        </p>
      </section>

      <section className="rounded-sm border border-border bg-surface p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="field-tnt"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="field-tnt"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Confirm new password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="field-tnt"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {status && (
            <p className={`text-sm ${status.ok ? "text-emerald-400" : "text-destructive"}`}>{status.text}</p>
          )}
          <button type="submit" disabled={busy} className="btn-orange px-4 py-2 text-xs">
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}

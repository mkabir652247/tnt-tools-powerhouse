import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/change-password")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { email: data.user.email ?? "" };
  },
  component: ChangePasswordPage,
  head: () => ({
    meta: [
      { title: "Set Your Password — TNT Tools" },
      { name: "description", content: "Choose a new password for your TNT Tools staff account." },
      { property: "og:title", content: "Set Your Password — TNT Tools" },
      { property: "og:description", content: "Choose a new password for your TNT Tools staff account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ChangePasswordPage() {
  const { email } = Route.useRouteContext();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two new passwords don't match.");
    if (password === current) return setError("Choose a password different from the current one.");
    setBusy(true);
    const { error: updErr } = await supabase.auth.updateUser({ password, current_password: current });
    if (updErr) {
      setBusy(false);
      return setError(updErr.message);
    }
    const { error: markErr } = await supabase.rpc("mark_password_changed");
    if (markErr) {
      setBusy(false);
      return setError(markErr.message);
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { changed: "1" }, replace: true });
  }

  return (
    <div className="container-tnt flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-sm border border-border bg-surface p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{email}</span>. Please replace your temporary
          password before continuing. You'll then sign in again with the new one.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {[
            ["Current (temporary) password", current, setCurrent, "current-password"],
            ["New password", password, setPassword, "new-password"],
            ["Confirm new password", confirm, setConfirm, "new-password"],
          ].map(([label, value, set, ac]) => (
            <label key={label as string} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label as string}
              </span>
              <input
                type="password"
                required
                autoComplete={ac as string}
                className="field-tnt"
                value={value as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
              />
            </label>
          ))}
          {error && (
            <p role="alert" className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-orange w-full py-2.5 text-sm disabled:opacity-60">
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

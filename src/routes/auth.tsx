import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { changed?: string | undefined } => ({
    changed: typeof s["changed"] === "string" ? s["changed"] : undefined,
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Staff Sign In — TNT Tools" },
      { name: "description", content: "Secure sign in for TNT Tools staff and administrators." },
      { property: "og:title", content: "Staff Sign In — TNT Tools" },
      { property: "og:description", content: "Secure sign in for TNT Tools staff and administrators." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

async function goAfterSignIn(navigate: ReturnType<typeof useNavigate>) {
  const { data } = await supabase.rpc("must_change_password");
  if (data !== false) navigate({ to: "/change-password", replace: true });
  else navigate({ to: "/admin/products", replace: true });
}

function AuthPage() {
  const navigate = useNavigate();
  const { changed } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void goAfterSignIn(navigate);
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setLoading(false);
      setError("Those details didn't work. Check your email and password and try again.");
      return;
    }
    await goAfterSignIn(navigate);
    setLoading(false);
  }

  return (
    <div className="container-tnt flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-sm border border-border bg-surface p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">
          Staff sign in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administrator access to the TNT Tools control panel.
        </p>
        {changed && (
          <p role="status" className="mt-4 rounded-sm border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
            Password changed. Please sign in again with your new password.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-tnt"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-tnt"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-orange w-full py-2.5 text-sm disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

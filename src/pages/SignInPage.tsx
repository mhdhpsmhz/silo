import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError(t("auth.signInError"));
    } catch {
      setError(t("auth.signInError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-silo-bg text-silo-text flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md p-7 sm:p-8 bg-silo-surface border border-silo-border rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-10 h-10 rounded-xl bg-silo-text text-silo-bg flex items-center justify-center font-mono text-lg font-bold">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">SILO</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-silo-elevated border border-silo-border text-silo-text flex items-center justify-center mb-5">
          <LockKeyhole className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.title")}
        </h1>
        <p className="text-sm text-silo-muted mt-2 leading-relaxed">
          {t("auth.description")}
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("auth.email")}</span>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-lg border-silo-border bg-silo-bg px-3.5 text-sm text-silo-text focus-visible:border-silo-text focus-visible:ring-0"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("auth.password")}</span>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-lg border-silo-border bg-silo-bg px-3.5 text-sm text-silo-text focus-visible:border-silo-text focus-visible:ring-0"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="text-sm text-silo-danger-text"
              aria-live="polite"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="h-10 w-full rounded-lg bg-silo-text px-4 text-sm font-semibold text-silo-bg transition-colors hover:bg-silo-text-hover disabled:opacity-60"
          >
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      </section>
    </main>
  );
}

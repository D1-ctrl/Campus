"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Falls der Recovery-Link schon vor dem Mount verarbeitet wurde,
    // reicht eine bestehende Session ebenfalls aus, um das Formular zu zeigen.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-semibold">Passwort geändert!</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Du kannst dich jetzt mit deinem neuen Passwort einloggen.
        </p>
        <button
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
          className="mx-auto w-fit rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90"
        >
          Zum Login
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-semibold">Link ungültig</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Dieser Link ist abgelaufen oder ungültig. Fordere einen neuen an.
        </p>
        <Link href="/forgot-password" className="underline">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Neues Passwort setzen</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Neues Passwort
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Passwort bestätigen
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Speichert..." : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}

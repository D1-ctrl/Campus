"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="mb-4 text-2xl font-semibold">E-Mail unterwegs</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Falls ein Account mit dieser E-Mail existiert, haben wir dir einen
          Link zum Zurücksetzen des Passworts geschickt.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Passwort vergessen</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Gib deine E-Mail-Adresse ein, wir schicken dir einen Link zum
        Zurücksetzen.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-Mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Wird gesendet..." : "Link senden"}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/login" className="underline">
          Zurück zum Login
        </Link>
      </p>
    </div>
  );
}

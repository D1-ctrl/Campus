"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function WaitlistForm() {
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !university.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("university_waitlist").insert({
      name: name.trim(),
      university_name: university.trim(),
      email: email.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError("Das hat leider nicht geklappt. Versuch es später erneut.");
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-black/10 bg-[var(--card)] p-8 text-center dark:border-white/10">
        <p className="font-semibold">Danke, du bist auf der Liste! 🎉</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Wir melden uns bei dir, sobald es für dich losgeht.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-[var(--card)] p-6 sm:p-8 dark:border-white/10"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wie heißt du?"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Universität
          <input
            type="text"
            required
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="Deine Uni"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        E-Mail
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@uni.de"
          className="rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {submitting ? "Wird gesendet..." : "Frühzugriff sichern"}
      </button>
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Begrenzte Plätze für den Early-Access-Test. Wir melden uns, sobald es losgeht.
      </p>
    </form>
  );
}

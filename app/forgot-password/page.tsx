"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthField, AuthSubmitButton, authInputClass } from "@/components/auth/AuthUI";

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
      <AuthLayout title="E-Mail unterwegs">
        <p className="text-center text-sm text-[#727272]">
          Falls ein Account mit dieser E-Mail existiert, haben wir dir einen
          Link zum Zurücksetzen des Passworts geschickt.
        </p>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-medium text-[#3883FA] hover:underline"
        >
          Zurück zum Login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Passwort vergessen"
      subtitle="Gib deine E-Mail-Adresse ein, wir schicken dir einen Link zum Zurücksetzen."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label="E-Mail">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="max.mustermann@beispiel.de"
            className={authInputClass}
          />
        </AuthField>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AuthSubmitButton loading={loading} icon={<Send size={16} />}>
          {loading ? "Wird gesendet..." : "Link senden"}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#727272]">
        <Link href="/login" className="font-medium text-[#3883FA] hover:underline">
          Zurück zum Login
        </Link>
      </p>
    </AuthLayout>
  );
}

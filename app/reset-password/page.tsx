"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthSubmitButton, PasswordField } from "@/components/auth/AuthUI";

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
      <AuthLayout title="Passwort geändert!">
        <p className="text-center text-sm text-[#727272]">
          Du kannst dich jetzt mit deinem neuen Passwort einloggen.
        </p>
        <AuthSubmitButton
          type="button"
          className="mt-6"
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
        >
          Zum Login
        </AuthSubmitButton>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout title="Link ungültig">
        <p className="text-center text-sm text-[#727272]">
          Dieser Link ist abgelaufen oder ungültig. Fordere einen neuen an.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 block text-center text-sm font-medium text-[#3883FA] hover:underline"
        >
          Neuen Link anfordern
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Neues Passwort setzen">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField
          label="Neues Passwort"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
          placeholder="********"
        />
        <PasswordField
          label="Passwort bestätigen"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={6}
          placeholder="********"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AuthSubmitButton loading={loading} icon={<KeyRound size={16} />}>
          {loading ? "Speichert..." : "Passwort speichern"}
        </AuthSubmitButton>
      </form>
    </AuthLayout>
  );
}

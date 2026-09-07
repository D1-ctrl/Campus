"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { supabase, setRememberMe } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";
import {
  AuthField,
  AuthSubmitButton,
  Divider,
  PasswordField,
  SocialLoginRow,
  authInputClass,
} from "@/components/auth/AuthUI";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setRememberMe(remember);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthLayout title="Willkommen bei Campus!" subtitle="Melde dich unten an.">
      <SocialLoginRow />
      <Divider />
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

        <PasswordField
          value={password}
          onChange={setPassword}
          required
          placeholder="********"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-[#252525]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-[#3883FA]"
            />
            Angemeldet bleiben
          </label>
          <Link href="/forgot-password" className="text-[#3883FA] hover:underline">
            Passwort vergessen?
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AuthSubmitButton loading={loading} icon={<LogIn size={16} />}>
          {loading ? "Wird eingeloggt..." : "Anmelden"}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#727272]">
        Noch keinen Account?{" "}
        <Link href="/register" className="font-medium text-[#3883FA] hover:underline">
          Registrieren
        </Link>
      </p>
    </AuthLayout>
  );
}

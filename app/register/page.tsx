"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";
import {
  AuthField,
  AuthSubmitButton,
  Divider,
  PasswordField,
  SocialLoginRow,
  authInputClass,
} from "@/components/auth/AuthUI";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError(
        "Username muss 3-20 Zeichen lang sein und darf nur Kleinbuchstaben, Zahlen und _ enthalten."
      );
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .ilike("username", trimmedUsername)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      setError("Dieser Username ist schon vergeben.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUsername,
          display_name: trimmedUsername,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Wenn "Confirm email" deaktiviert ist, kommt sofort eine Session zurueck
    // und der Nutzer ist bereits eingeloggt.
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <AuthLayout title="Fast geschafft!">
        <p className="text-center text-sm text-[#727272]">
          Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Adresse,
          um dich einzuloggen.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Konto erstellen" subtitle="Erstelle dein Konto in wenigen Schritten.">
      <SocialLoginRow />
      <Divider />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label="Username">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#727272]">
              @
            </span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="max_mustermann"
              className={`${authInputClass} pl-8`}
            />
          </div>
        </AuthField>

        <AuthField label="Email">
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
          minLength={6}
          placeholder="********"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AuthSubmitButton loading={loading} icon={<UserPlus size={16} />}>
          {loading ? "Wird erstellt..." : "Konto erstellen"}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#727272]">
        Schon einen Account?{" "}
        <Link href="/login" className="font-medium text-[#3883FA] hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

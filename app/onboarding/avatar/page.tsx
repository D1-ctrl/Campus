"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function OnboardingStep3Page() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  async function finishOnboarding(avatarUrl: string | null) {
    if (!user) return;

    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_url: avatarUrl,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    router.push("/");
    router.refresh();
  }

  async function handleUploadAndFinish() {
    if (!user) return;

    if (!file) {
      await finishOnboarding(null);
      return;
    }

    setSubmitting(true);
    setError(null);

    const extension = file.name.split(".").pop() ?? "png";
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) {
      setSubmitting(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await finishOnboarding(data.publicUrl);
  }

  function handleSkip() {
    setSubmitting(true);
    finishOnboarding(null);
  }

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Schritt 3 von 3
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Profilbild (optional)</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Ganz optional – du kannst das jederzeit später in deinem Profil
        nachholen.
      </p>

      <div className="flex flex-col gap-4">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleUploadAndFinish}
            disabled={submitting}
            className="rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? "Wird gespeichert..." : "Fertigstellen"}
          </button>
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
          >
            Überspringen
          </button>
        </div>
      </div>
    </div>
  );
}

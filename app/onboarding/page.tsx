"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Combobox from "@/components/Combobox";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthField, AuthSubmitButton, AvatarPicker, authInputClass } from "@/components/auth/AuthUI";
import type { SemesterType, StudyProgram, University } from "@/lib/types";

const comboboxListClass =
  "absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-black/5 bg-white p-1 text-sm text-[#252525] shadow-lg";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => currentYear - 6 + i);

export default function OnboardingPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [universities, setUniversities] = useState<University[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [studyProgramId, setStudyProgramId] = useState<string | null>(null);
  const [semesterType, setSemesterType] = useState<SemesterType | "">("");
  const [semesterYear, setSemesterYear] = useState<number | "">("");

  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistUniversity, setWaitlistUniversity] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile?.onboarding_completed_at) {
      router.push("/");
    }
  }, [profile, router]);

  useEffect(() => {
    if (user) {
      setWaitlistEmail(user.email ?? "");
    }
  }, [user]);

  useEffect(() => {
    supabase
      .from("universities")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setUniversities((data as University[]) ?? []));
  }, []);

  useEffect(() => {
    if (!universityId) {
      setStudyPrograms([]);
      setStudyProgramId(null);
      return;
    }

    supabase
      .from("study_programs")
      .select("*")
      .eq("university_id", universityId)
      .order("name")
      .then(({ data }) => setStudyPrograms((data as StudyProgram[]) ?? []));
  }, [universityId]);

  const universityOptions = useMemo(
    () => universities.map((u) => ({ value: u.id, label: u.name })),
    [universities]
  );

  function handleAvatarSelect(file: File) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleWaitlistSubmit() {
    if (!waitlistUniversity || !waitlistEmail) return;

    await supabase.from("university_waitlist").insert({
      email: waitlistEmail,
      university_name: waitlistUniversity,
    });

    setWaitlistDone(true);
  }

  async function handleSubmit() {
    if (!user || !universityId || !studyProgramId || !semesterType || !semesterYear) {
      setError("Bitte Uni, Studiengang und Studienbeginn ausfüllen.");
      return;
    }

    setError(null);
    setSubmitting(true);

    let avatarUrl: string | null = null;

    if (avatarFile) {
      const extension = avatarFile.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile);

      if (uploadError) {
        setSubmitting(false);
        setError(uploadError.message);
        return;
      }

      avatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        university_id: universityId,
        study_program_id: studyProgramId,
        start_semester_type: semesterType,
        start_semester_year: semesterYear,
        avatar_url: avatarUrl,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    router.push("/");
    router.refresh();
  }

  if (authLoading || !user) {
    return null;
  }

  return (
    <AuthLayout
      title="Fast geschafft!"
      subtitle="Erzähl uns kurz von deinem Studium."
      maxWidth="max-w-md"
    >
      <AvatarPicker previewUrl={avatarPreview} onSelect={handleAvatarSelect} />

      <div className="flex flex-col gap-4">
        <AuthField label="Universität">
          <Combobox
            options={universityOptions}
            value={universityId}
            onChange={(value) => setUniversityId(value)}
            placeholder="Uni suchen..."
            emptyMessage="Nicht gefunden."
            inputClassName={authInputClass}
            listClassName={comboboxListClass}
          />
        </AuthField>

        {!showWaitlist ? (
          <button
            type="button"
            onClick={() => setShowWaitlist(true)}
            className="w-fit text-xs text-[#727272] underline"
          >
            Meine Uni ist nicht dabei
          </button>
        ) : waitlistDone ? (
          <p className="text-sm text-[#727272]">
            Danke! Wir sagen dir Bescheid, sobald deine Uni startet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl bg-[#F2F2F2] p-3">
            <p className="text-sm text-[#252525]">Trag dich für deine Uni auf die Warteliste ein:</p>
            <input
              type="text"
              placeholder="Name deiner Uni"
              value={waitlistUniversity}
              onChange={(e) => setWaitlistUniversity(e.target.value)}
              className={`${authInputClass} bg-white`}
            />
            <input
              type="email"
              placeholder="E-Mail"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              className={`${authInputClass} bg-white`}
            />
            <button
              type="button"
              onClick={handleWaitlistSubmit}
              className="w-fit rounded-full bg-[#3883FA] px-4 py-1.5 text-sm text-white hover:opacity-90"
            >
              Eintragen
            </button>
          </div>
        )}

        <AuthField label="Studiengang">
          <select
            value={studyProgramId ?? ""}
            onChange={(e) => setStudyProgramId(e.target.value || null)}
            disabled={!universityId}
            className={authInputClass}
          >
            <option value="">Bitte wählen...</option>
            {studyPrograms.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </AuthField>

        <div>
          <p className="mb-1.5 text-sm font-medium text-[#252525]">Studienbeginn</p>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={semesterType}
              onChange={(e) => setSemesterType(e.target.value as SemesterType)}
              className={authInputClass}
            >
              <option value="">Semester</option>
              <option value="WiSe">Wintersemester</option>
              <option value="SoSe">Sommersemester</option>
            </select>
            <select
              value={semesterYear}
              onChange={(e) => setSemesterYear(Number(e.target.value))}
              className={authInputClass}
            >
              <option value="">Jahr</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AuthSubmitButton
          type="button"
          onClick={handleSubmit}
          loading={submitting}
          icon={<ArrowRight size={16} />}
        >
          {submitting ? "Speichert..." : "Los geht's"}
        </AuthSubmitButton>
      </div>
    </AuthLayout>
  );
}

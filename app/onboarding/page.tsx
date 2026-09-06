"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Combobox from "@/components/Combobox";
import type { DegreeGoal, SemesterType, StudyProgram, University } from "@/lib/types";

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => currentYear - 6 + i);

export default function OnboardingStep1Page() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [universities, setUniversities] = useState<University[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [studyProgramId, setStudyProgramId] = useState<string | null>(null);
  const [semesterType, setSemesterType] = useState<SemesterType | "">("");
  const [semesterYear, setSemesterYear] = useState<number | "">("");
  const [degreeGoal, setDegreeGoal] = useState<DegreeGoal | "">("");

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
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setWaitlistEmail(user?.email ?? "");
    }
  }, [profile, user]);

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

    const { error: updateError } = await supabase
      .from("users")
      .update({
        display_name: displayName || null,
        university_id: universityId,
        study_program_id: studyProgramId,
        start_semester_type: semesterType,
        start_semester_year: semesterYear,
        degree_goal: degreeGoal || null,
      })
      .eq("id", user.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    router.push("/onboarding/subjects");
  }

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Schritt 1 von 3
      </p>
      <h1 className="mb-6 text-2xl font-semibold">Willkommen! Erzähl uns von dir</h1>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Anzeigename
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Universität
          <Combobox
            options={universityOptions}
            value={universityId}
            onChange={(value) => setUniversityId(value)}
            placeholder="Uni suchen..."
            emptyMessage="Nicht gefunden."
          />
        </label>

        {!showWaitlist ? (
          <button
            type="button"
            onClick={() => setShowWaitlist(true)}
            className="w-fit text-xs text-zinc-500 underline dark:text-zinc-400"
          >
            Meine Uni ist nicht dabei
          </button>
        ) : waitlistDone ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Danke! Wir sagen dir Bescheid, sobald deine Uni startet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/15">
            <p className="text-sm">Trag dich für deine Uni auf die Warteliste ein:</p>
            <input
              type="text"
              placeholder="Name deiner Uni"
              value={waitlistUniversity}
              onChange={(e) => setWaitlistUniversity(e.target.value)}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="E-Mail"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleWaitlistSubmit}
              className="w-fit rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
            >
              Eintragen
            </button>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Studiengang
          <select
            value={studyProgramId ?? ""}
            onChange={(e) => setStudyProgramId(e.target.value || null)}
            disabled={!universityId}
            className={inputClass}
          >
            <option value="">Bitte wählen...</option>
            {studyPrograms.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-1 text-sm">Studienbeginn</p>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={semesterType}
              onChange={(e) => setSemesterType(e.target.value as SemesterType)}
              className={inputClass}
            >
              <option value="">Semester</option>
              <option value="WiSe">Wintersemester</option>
              <option value="SoSe">Sommersemester</option>
            </select>
            <select
              value={semesterYear}
              onChange={(e) => setSemesterYear(Number(e.target.value))}
              className={inputClass}
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

        <label className="flex flex-col gap-1 text-sm">
          Angestrebter Abschluss (optional)
          <select
            value={degreeGoal}
            onChange={(e) => setDegreeGoal(e.target.value as DegreeGoal)}
            className={inputClass}
          >
            <option value="">Keine Angabe</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Master">Master</option>
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-2 w-fit rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {submitting ? "Speichert..." : "Weiter"}
        </button>
      </div>
    </div>
  );
}

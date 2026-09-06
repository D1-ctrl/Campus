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

export default function EditProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [universities, setUniversities] = useState<University[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [studyProgramId, setStudyProgramId] = useState<string | null>(null);
  const [semesterType, setSemesterType] = useState<SemesterType | "">("");
  const [semesterYear, setSemesterYear] = useState<number | "">("");
  const [degreeGoal, setDegreeGoal] = useState<DegreeGoal | "">("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile && !initialized) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setUniversityId(profile.university_id);
      setStudyProgramId(profile.study_program_id);
      setSemesterType(profile.start_semester_type ?? "");
      setSemesterYear(profile.start_semester_year ?? "");
      setDegreeGoal(profile.degree_goal ?? "");
      setAvatarUrl(profile.avatar_url);
      setInitialized(true);
    }
  }, [profile, initialized]);

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

  function handleAvatarSelect(file: File | null) {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit() {
    if (!user) return;

    setError(null);
    setSaved(false);

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername && !/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError(
        "Username muss 3-20 Zeichen lang sein und darf nur Kleinbuchstaben, Zahlen und _ enthalten."
      );
      return;
    }

    setSubmitting(true);

    if (trimmedUsername && trimmedUsername !== (profile?.username ?? "")) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .ilike("username", trimmedUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (existing) {
        setSubmitting(false);
        setError("Dieser Username ist bereits vergeben.");
        return;
      }
    }

    let newAvatarUrl = avatarUrl;

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

      newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        display_name: displayName || null,
        username: trimmedUsername || null,
        university_id: universityId,
        study_program_id: studyProgramId,
        start_semester_type: semesterType || null,
        start_semester_year: semesterYear || null,
        degree_goal: degreeGoal || null,
        avatar_url: newAvatarUrl,
      })
      .eq("id", user.id);

    setSubmitting(false);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "Dieser Username ist bereits vergeben."
          : updateError.message
      );
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setAvatarPreview(null);
    setSaved(true);
    await refreshProfile();
  }

  if (authLoading || !user || !profile) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Profil bearbeiten</h1>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 text-xl font-medium dark:bg-white/10">
            {avatarPreview || avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview ?? avatarUrl ?? ""}
                alt=""
                className="h-16 w-16 object-cover"
              />
            ) : (
              (displayName || "?").charAt(0).toUpperCase()
            )}
          </div>
          <label className="cursor-pointer text-sm text-accent underline">
            Profilbild ändern
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>

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
          Username
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 dark:text-zinc-400">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="dein_username"
              className={`${inputClass} flex-1`}
            />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            3-20 Zeichen, nur Kleinbuchstaben, Zahlen und _. Einzigartig, wie bei
            Instagram.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Universität
          <Combobox
            options={universityOptions}
            value={universityId}
            onChange={(value) => {
              setUniversityId(value);
              setStudyProgramId(null);
            }}
            placeholder="Uni suchen..."
            emptyMessage="Nicht gefunden."
          />
        </label>

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
          Angestrebter Abschluss
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
        {saved && !error && (
          <p className="text-sm text-green-600">Gespeichert.</p>
        )}

        <div className="mt-2 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-fit rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? "Speichert..." : "Speichern"}
          </button>
          <button
            onClick={() => router.push(`/u/${user.id}`)}
            className="w-fit rounded-full border border-black/10 px-5 py-2.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
          >
            Zum Profil
          </button>
        </div>
      </div>
    </main>
  );
}

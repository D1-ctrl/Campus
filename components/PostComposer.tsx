"use client";

import { useEffect, useState } from "react";
import { GraduationCap, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import SegmentedToggle from "@/components/SegmentedToggle";

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

type JoinedSubject = { id: string; name: string };
type JoinedGroup = { id: string; name: string };

type PostComposerProps = {
  subjectId?: string | null;
  groupId?: string | null;
  placeholder?: string;
  onCreated: () => void;
};

export default function PostComposer({
  subjectId = null,
  groupId = null,
  placeholder = "Was möchtest du fragen oder teilen?",
  onCreated,
}: PostComposerProps) {
  const { user, profile } = useAuth();
  const isGeneralPost = !subjectId && !groupId;
  const [scope, setScope] = useState<"profile" | "uni">("uni");
  const [target, setTarget] = useState<string>("general");
  const [joinedSubjects, setJoinedSubjects] = useState<JoinedSubject[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !isGeneralPost) return;

    supabase
      .from("user_subjects")
      .select("subject:subjects(id, name)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as { subject: JoinedSubject | null }[];
        setJoinedSubjects(rows.map((r) => r.subject).filter(Boolean) as JoinedSubject[]);
      });

    supabase
      .from("group_members")
      .select("group:groups(id, name)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as { group: JoinedGroup | null }[];
        setJoinedGroups(rows.map((r) => r.group).filter(Boolean) as JoinedGroup[]);
      });
  }, [user, isGeneralPost]);

  function updateOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setPollOptions((prev) => [...prev, ""]);
  }

  function handleImageSelect(file: File | null) {
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit() {
    if (!user || (!body.trim() && !image) || !profile?.university_id) return;

    const trimmedOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (showPoll && trimmedOptions.length < 2) {
      setError("Eine Umfrage braucht mindestens 2 Optionen.");
      return;
    }

    setError(null);
    setSubmitting(true);

    let imageUrl: string | null = null;

    if (image) {
      const extension = image.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(filePath, image);

      if (uploadError) {
        setSubmitting(false);
        setError(uploadError.message);
        return;
      }

      imageUrl = supabase.storage.from("posts").getPublicUrl(filePath).data.publicUrl;
    }

    const targetSubjectId = isGeneralPost
      ? scope === "uni" && target.startsWith("subject:")
        ? target.slice("subject:".length)
        : null
      : subjectId;
    const targetGroupId = isGeneralPost
      ? scope === "uni" && target.startsWith("group:")
        ? target.slice("group:".length)
        : null
      : groupId;

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        university_id: profile.university_id,
        subject_id: targetSubjectId,
        group_id: targetGroupId,
        author_id: user.id,
        is_anonymous: isAnonymous,
        body: body.trim(),
        image_url: imageUrl,
        scope: isGeneralPost ? scope : "uni",
      })
      .select()
      .single();

    if (postError || !post) {
      setSubmitting(false);
      setError(postError?.message ?? "Fehler beim Erstellen.");
      return;
    }

    if (showPoll) {
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({ post_id: post.id })
        .select()
        .single();

      if (pollError || !poll) {
        setSubmitting(false);
        setError(pollError?.message ?? "Fehler bei der Umfrage.");
        return;
      }

      const { error: optionsError } = await supabase.from("poll_options").insert(
        trimmedOptions.map((label, index) => ({
          poll_id: poll.id,
          label,
          position: index,
        }))
      );

      if (optionsError) {
        setSubmitting(false);
        setError(optionsError.message);
        return;
      }
    }

    setBody("");
    setIsAnonymous(false);
    setScope("uni");
    setTarget("general");
    setShowPoll(false);
    setPollOptions(["", ""]);
    handleImageSelect(null);
    setSubmitting(false);
    onCreated();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
      {isGeneralPost && (
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedToggle
            value={scope}
            onChange={setScope}
            options={[
              { value: "uni", label: "Uni", icon: GraduationCap },
              { value: "profile", label: "Profil", icon: User },
            ]}
          />

          {scope === "uni" && (joinedSubjects.length > 0 || joinedGroups.length > 0) && (
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-full border border-black/10 bg-transparent px-3 py-1 text-xs dark:border-white/15"
            >
              <option value="general">Allgemein (Uni)</option>
              {joinedSubjects.length > 0 && (
                <optgroup label="Kurse">
                  {joinedSubjects.map((s) => (
                    <option key={s.id} value={`subject:${s.id}`}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {joinedGroups.length > 0 && (
                <optgroup label="Gruppen">
                  {joinedGroups.map((g) => (
                    <option key={g.id} value={`group:${g.id}`}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={inputClass}
      />

      {imagePreview && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Vorschau"
            className="max-h-48 rounded-md object-cover"
          />
          <button
            type="button"
            onClick={() => handleImageSelect(null)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
            aria-label="Bild entfernen"
          >
            ✕
          </button>
        </div>
      )}

      {showPoll && (
        <div className="flex flex-col gap-2">
          {pollOptions.map((option, index) => (
            <input
              key={index}
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className={inputClass}
            />
          ))}
          <button
            type="button"
            onClick={addOption}
            className="w-fit text-xs text-zinc-500 underline dark:text-zinc-400"
          >
            + Weitere Option
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Anonym
          </label>
          <label className="cursor-pointer text-zinc-600 underline dark:text-zinc-400">
            Bild
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowPoll((v) => !v)}
            className="text-zinc-600 underline dark:text-zinc-400"
          >
            {showPoll ? "Umfrage entfernen" : "Umfrage hinzufügen"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!body.trim() && !image)}
          className="rounded-full bg-accent px-4 py-1.5 text-sm text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {submitting ? "Wird gepostet..." : "Posten"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

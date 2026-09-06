"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { CATEGORY_COLORS, categoryColor } from "@/lib/schedule-categories";
import { toDateKey } from "@/lib/date-utils";

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export default function NewScheduleEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isRecurring, setIsRecurring] = useState(false);

  const [dateOptions] = useState<Date[]>(() => {
    const today = new Date();
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  });
  const [selectedDate, setSelectedDate] = useState(toDateKey(dateOptions[0]));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [semesterStart, setSemesterStart] = useState(toDateKey(new Date()));
  const [semesterEnd, setSemesterEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return toDateKey(d);
  });

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("14:00");
  const [categories, setCategories] = useState<string[]>(Object.keys(CATEGORY_COLORS).slice(0, 3));
  const [category, setCategory] = useState("Vorlesung");
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [note, setNote] = useState("");
  const [remindMe, setRemindMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return null;
  }

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCategory(trimmed);
    setNewCategory("");
    setAddingCategory(false);
  }

  async function handleSave() {
    if (!user) return;
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    if (startTime >= endTime) {
      setError("Die Endzeit muss nach der Startzeit liegen.");
      return;
    }
    if (isRecurring && semesterStart >= semesterEnd) {
      setError("Das Semesterende muss nach dem Semesterstart liegen.");
      return;
    }

    setError(null);
    setSaving(true);

    const { error: insertError } = await supabase.from("schedule_events").insert(
      isRecurring
        ? {
            user_id: user.id,
            title: title.trim(),
            category,
            is_recurring: true,
            day_of_week: dayOfWeek,
            semester_start: semesterStart,
            semester_end: semesterEnd,
            start_time: startTime,
            end_time: endTime,
            note: note.trim() || null,
            remind_me: remindMe,
          }
        : {
            user_id: user.id,
            title: title.trim(),
            category,
            event_date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            note: note.trim() || null,
            remind_me: remindMe,
          }
    );

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/schedule");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex gap-2 rounded-full bg-black/5 p-1 text-sm dark:bg-white/10">
        <button
          onClick={() => setIsRecurring(false)}
          className={`flex-1 rounded-full py-1.5 ${
            !isRecurring ? "bg-accent text-white" : ""
          }`}
        >
          Einmalig
        </button>
        <button
          onClick={() => setIsRecurring(true)}
          className={`flex-1 rounded-full py-1.5 ${
            isRecurring ? "bg-accent text-white" : ""
          }`}
        >
          Ganzes Semester
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Titel</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Mechanik Vorlesung"
          className={inputClass}
        />
      </div>

      {isRecurring ? (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">Wochentag</p>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className={`${inputClass} w-full`}
            >
              {WEEKDAYS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium">Semesterstart</p>
              <input
                type="date"
                value={semesterStart}
                onChange={(e) => setSemesterStart(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium">Semesterende</p>
              <input
                type="date"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Der Termin wird jede Woche an diesem Wochentag im gewählten Zeitraum
            angezeigt. Einzelne Termine kannst du später überspringen (z.B.
            wenn eine Übung ausfällt).
          </p>
        </>
      ) : (
        <div>
          <p className="mb-2 text-sm font-medium">Datum</p>
          <div className="grid grid-cols-4 gap-2">
            {dateOptions.map((d) => {
              const key = toDateKey(d);
              const isSelected = key === selectedDate && !showDatePicker;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedDate(key);
                    setShowDatePicker(false);
                  }}
                  className={`flex flex-col items-center rounded-lg py-3 text-sm ${
                    isSelected
                      ? "bg-accent text-white"
                      : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                  }`}
                >
                  <span className="font-semibold">{d.getDate()}</span>
                  <span className="text-xs">
                    {d.toLocaleDateString("de-DE", { weekday: "short" })}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowDatePicker(true)}
              className={`rounded-lg py-3 text-xs ${
                showDatePicker
                  ? "bg-accent text-white"
                  : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
              }`}
            >
              Weitere
            </button>
          </div>
          {showDatePicker && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`${inputClass} mt-2 w-full`}
            />
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Zeit</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Von</p>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
          <span>→</span>
          <div className="flex-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Bis</p>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Kategorie</p>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                category === cat
                  ? "bg-black/10 dark:bg-white/15"
                  : "hover:bg-black/[.04] dark:hover:bg-white/10"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: categoryColor(cat) }}
              />
              {cat}
            </button>
          ))}
          {addingCategory ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Neue Kategorie"
                className={`${inputClass} w-32`}
              />
              <button onClick={addCategory} className="text-accent">
                ✓
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 dark:border-white/15"
              aria-label="Kategorie hinzufügen"
            >
              +
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Notiz</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Füge eine Notiz ein"
          rows={3}
          className={`${inputClass} w-full`}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={remindMe}
          onChange={(e) => setRemindMe(e.target.checked)}
        />
        Erinnere mich (im Dashboard anzeigen)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {saving ? "Speichert..." : "Sichern"}
      </button>
    </main>
  );
}

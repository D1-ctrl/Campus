"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { categoryColor } from "@/lib/schedule-categories";
import { toDateKey, isoWeekday } from "@/lib/date-utils";
import type { ScheduleEvent } from "@/lib/types";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Occurrence = {
  event: ScheduleEvent;
  dateKey: string;
};

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [weekDays] = useState<Date[]>(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [oneOffEvents, setOneOffEvents] = useState<ScheduleEvent[]>([]);
  const [recurringEvents, setRecurringEvents] = useState<ScheduleEvent[]>([]);
  const [exceptions, setExceptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadEvents = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const rangeStart = toDateKey(weekDays[0]);
    const rangeEnd = toDateKey(weekDays[6]);

    const [{ data: oneOff }, { data: recurring }, { data: exceptionRows }] =
      await Promise.all([
        supabase
          .from("schedule_events")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_recurring", false)
          .gte("event_date", rangeStart)
          .lte("event_date", rangeEnd),
        supabase
          .from("schedule_events")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_recurring", true),
        supabase
          .from("schedule_exceptions")
          .select("*")
          .eq("user_id", user.id)
          .gte("exception_date", rangeStart)
          .lte("exception_date", rangeEnd),
      ]);

    setOneOffEvents((oneOff as ScheduleEvent[]) ?? []);
    setRecurringEvents((recurring as ScheduleEvent[]) ?? []);
    setExceptions(
      new Set(
        (exceptionRows ?? []).map(
          (e: { schedule_event_id: string; exception_date: string }) =>
            `${e.schedule_event_id}:${e.exception_date}`
        )
      )
    );
    setLoading(false);
  }, [user, weekDays]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function occurrencesOnDate(dateKey: string, weekday: number): Occurrence[] {
    const oneOff = oneOffEvents
      .filter((e) => e.event_date === dateKey)
      .map((event) => ({ event, dateKey }));

    const recurring = recurringEvents
      .filter(
        (e) =>
          e.day_of_week === weekday &&
          e.semester_start! <= dateKey &&
          e.semester_end! >= dateKey &&
          !exceptions.has(`${e.id}:${dateKey}`)
      )
      .map((event) => ({ event, dateKey }));

    return [...oneOff, ...recurring].sort((a, b) =>
      a.event.start_time.localeCompare(b.event.start_time)
    );
  }

  async function skipOccurrence(occurrence: Occurrence) {
    if (!user) return;

    if (occurrence.event.is_recurring) {
      await supabase.from("schedule_exceptions").insert({
        schedule_event_id: occurrence.event.id,
        user_id: user.id,
        exception_date: occurrence.dateKey,
      });
    } else {
      await supabase.from("schedule_events").delete().eq("id", occurrence.event.id);
    }

    await loadEvents();
  }

  async function deleteSeries(eventId: string) {
    await supabase.from("schedule_events").delete().eq("id", eventId);
    await loadEvents();
  }

  if (authLoading || !user) {
    return null;
  }

  const selectedDay = weekDays.find((d) => toDateKey(d) === selectedDate) ?? weekDays[0];
  const dayEvents = occurrencesOnDate(selectedDate, isoWeekday(selectedDay));

  const upcoming = weekDays
    .flatMap((d) => occurrencesOnDate(toDateKey(d), isoWeekday(d)))
    .sort(
      (a, b) =>
        `${a.dateKey}${a.event.start_time}`.localeCompare(`${b.dateKey}${b.event.start_time}`)
    )
    .slice(0, 5);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex justify-between gap-1">
        {weekDays.map((day) => {
          const key = toDateKey(day);
          const isSelected = key === selectedDate;
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-sm ${
                isSelected
                  ? "bg-accent text-white"
                  : "hover:bg-black/[.04] dark:hover:bg-white/10"
              }`}
            >
              <span className="text-xs">{WEEKDAY_LABELS[isoWeekday(day)]}</span>
              <span className="font-medium">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Stundenplan</h1>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
        ) : dayEvents.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Keine Termine an diesem Tag.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {dayEvents.map((occ) => (
              <div
                key={`${occ.event.id}-${occ.dateKey}`}
                className="flex items-start justify-between gap-2 rounded-lg p-3 text-sm text-white"
                style={{ backgroundColor: categoryColor(occ.event.category) }}
              >
                <div>
                  <p className="font-medium">{occ.event.title}</p>
                  <p className="text-xs opacity-90">
                    {occ.event.start_time.slice(0, 5)}–{occ.event.end_time.slice(0, 5)} ·{" "}
                    {occ.event.category}
                    {occ.event.is_recurring && " · wöchentlich"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1 text-xs">
                  <button
                    onClick={() => skipOccurrence(occ)}
                    className="rounded-full bg-black/20 px-2 py-0.5 hover:bg-black/30"
                    title={occ.event.is_recurring ? "Diesen Termin überspringen" : "Löschen"}
                  >
                    {occ.event.is_recurring ? "Überspringen" : "Löschen"}
                  </button>
                  {occ.event.is_recurring && (
                    <button
                      onClick={() => deleteSeries(occ.event.id)}
                      className="text-white/70 underline hover:text-white"
                    >
                      Serie löschen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Anstehend
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Keine anstehenden Termine.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((occ) => (
              <div
                key={`${occ.event.id}-${occ.dateKey}-upcoming`}
                className="flex items-center gap-3 rounded-lg border border-black/10 p-3 text-sm dark:border-white/15"
              >
                <span
                  className="h-8 w-8 flex-shrink-0 rounded-md"
                  style={{ backgroundColor: categoryColor(occ.event.category) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{occ.event.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(occ.dateKey).toLocaleDateString("de-DE")} · bis{" "}
                    {occ.event.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/schedule/new"
        className="mt-2 w-full rounded-full bg-accent py-3 text-center font-medium text-white transition-colors hover:bg-accent/90"
      >
        Planen
      </Link>
    </main>
  );
}

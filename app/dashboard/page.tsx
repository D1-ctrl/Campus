"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { categoryColor } from "@/lib/schedule-categories";
import SegmentedToggle from "@/components/SegmentedToggle";
import { toDateKey, isoWeekday } from "@/lib/date-utils";
import type { ScheduleEvent } from "@/lib/types";

function daysUntil(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateKey + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - isoWeekday(d));
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type Occurrence = { event: ScheduleEvent; dateKey: string };

const REMINDER_RANGE_DAYS = 30;
const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reminders, setReminders] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);

  const [oneOffEvents, setOneOffEvents] = useState<ScheduleEvent[]>([]);
  const [recurringEvents, setRecurringEvents] = useState<ScheduleEvent[]>([]);
  const [exceptionSet, setExceptionSet] = useState<Set<string>>(new Set());

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [anchorDate, setAnchorDate] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const [{ data: oneOff }, { data: recurring }, { data: exceptionRows }] = await Promise.all([
      supabase.from("schedule_events").select("*").eq("user_id", user.id).eq("is_recurring", false),
      supabase.from("schedule_events").select("*").eq("user_id", user.id).eq("is_recurring", true),
      supabase.from("schedule_exceptions").select("*").eq("user_id", user.id),
    ]);

    setOneOffEvents((oneOff as ScheduleEvent[]) ?? []);
    setRecurringEvents((recurring as ScheduleEvent[]) ?? []);
    setExceptionSet(
      new Set(
        (exceptionRows ?? []).map(
          (e: { schedule_event_id: string; exception_date: string }) =>
            `${e.schedule_event_id}:${e.exception_date}`
        )
      )
    );

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, Occurrence[]>();

    function addOccurrence(dateKey: string, event: ScheduleEvent) {
      const list = map.get(dateKey) ?? [];
      list.push({ event, dateKey });
      map.set(dateKey, list);
    }

    for (const event of oneOffEvents) {
      if (event.event_date) addOccurrence(event.event_date, event);
    }

    // Recurring-Termine ueber ein grosszuegiges Fenster (2 Jahre zurueck/vor)
    // materialisieren, damit Monats-/Wochen-Navigation in beide Richtungen
    // funktioniert, ohne fuer jede Ansicht neu vom Server zu laden.
    const rangeStart = addDays(new Date(), -730);
    const rangeEnd = addDays(new Date(), 730);
    for (const event of recurringEvents) {
      if (event.day_of_week === null || !event.semester_start || !event.semester_end) continue;
      let cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        const dateKey = toDateKey(cursor);
        if (
          isoWeekday(cursor) === event.day_of_week &&
          event.semester_start <= dateKey &&
          event.semester_end >= dateKey &&
          !exceptionSet.has(`${event.id}:${dateKey}`)
        ) {
          addOccurrence(dateKey, event);
        }
        cursor = addDays(cursor, 1);
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.event.start_time.localeCompare(b.event.start_time));
    }

    return map;
  }, [oneOffEvents, recurringEvents, exceptionSet]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeEnd = addDays(today, REMINDER_RANGE_DAYS);

    const upcoming: Occurrence[] = [];
    for (const [dateKey, occs] of occurrencesByDate.entries()) {
      const d = new Date(dateKey + "T00:00:00");
      if (d >= today && d <= rangeEnd) {
        for (const occ of occs) {
          if (occ.event.remind_me) upcoming.push(occ);
        }
      }
    }
    upcoming.sort((a, b) =>
      `${a.dateKey}${a.event.start_time}`.localeCompare(`${b.dateKey}${b.event.start_time}`)
    );
    setReminders(upcoming.slice(0, 8));
  }, [occurrencesByDate]);

  if (authLoading || !user) {
    return null;
  }

  const now = new Date();

  const monthLabel = anchorDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const startOffset = isoWeekday(firstOfMonth);
  const daysInMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate();
  const monthCells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), i + 1)
    ),
  ];

  const weekStart = startOfWeek(anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}.–${weekEnd.getDate()}. ${weekEnd.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`
      : `${weekStart.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}`;

  function goToPrevious() {
    if (viewMode === "month") {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else {
      setAnchorDate((d) => addDays(d, -7));
    }
  }

  function goToNext() {
    if (viewMode === "month") {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setAnchorDate((d) => addDays(d, 7));
    }
  }

  function goToToday() {
    setAnchorDate(new Date());
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Reminder</h2>
            <Link
              href="/schedule/new"
              aria-label="Erinnerung hinzufügen"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              +
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Keine Erinnerungen. Markiere Termine im{" "}
              <Link href="/schedule/new" className="underline">
                Stundenplan
              </Link>{" "}
              mit &quot;Erinnere mich&quot;.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reminders.map((occ) => {
                const days = daysUntil(occ.dateKey);
                return (
                  <li
                    key={`${occ.event.id}-${occ.dateKey}`}
                    className="flex items-center gap-3 rounded-md border-l-4 py-1.5 pl-3 text-sm"
                    style={{ borderColor: categoryColor(occ.event.category) }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{occ.event.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {occ.event.category} · {new Date(occ.dateKey).toLocaleDateString("de-DE")},{" "}
                        {occ.event.start_time.slice(0, 5)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {days === 0 ? "Heute" : days === 1 ? "Morgen" : `${days} Tage`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Kalender</h2>
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "month", label: "Monat" },
                { value: "week", label: "Woche" },
              ]}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevious}
              aria-label="Zurück"
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/[.04] dark:hover:bg-white/10"
            >
              ←
            </button>
            <button onClick={goToToday} className="text-xs font-medium hover:underline">
              {viewMode === "month" ? monthLabel : weekLabel}
            </button>
            <button
              onClick={goToNext}
              aria-label="Vor"
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/[.04] dark:hover:bg-white/10"
            >
              →
            </button>
          </div>

          {viewMode === "month" ? (
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {WEEKDAY_LABELS.map((d) => (
                <span key={d} className="text-zinc-500 dark:text-zinc-400">
                  {d}
                </span>
              ))}
              {monthCells.map((day, i) => {
                if (!day) return <span key={i} />;
                const key = toDateKey(day);
                const hasEvent = occurrencesByDate.has(key);
                const isToday = key === toDateKey(now);
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center rounded-md py-1 ${
                      isToday ? "bg-accent/10 text-accent" : ""
                    }`}
                  >
                    <span>{day.getDate()}</span>
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        hasEvent ? "bg-accent" : "bg-transparent"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 text-[11px]">
              {weekDays.map((day) => {
                const key = toDateKey(day);
                const occs = occurrencesByDate.get(key) ?? [];
                const isToday = key === toDateKey(now);
                return (
                  <div
                    key={key}
                    className={`flex min-h-24 flex-col gap-1 rounded-md p-1 ${
                      isToday ? "bg-accent/10" : ""
                    }`}
                  >
                    <div className="text-center">
                      <p className="font-medium">{WEEKDAY_LABELS[isoWeekday(day)]}</p>
                      <p className={isToday ? "text-accent" : "text-zinc-500 dark:text-zinc-400"}>
                        {day.getDate()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {occs.map((o) => (
                        <span
                          key={`${o.event.id}-${o.dateKey}`}
                          title={`${o.event.title} · ${o.event.start_time.slice(0, 5)}`}
                          className="truncate rounded px-1 py-0.5 text-white"
                          style={{ backgroundColor: categoryColor(o.event.category) }}
                        >
                          {o.event.title}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link href="/schedule" className="text-xs text-accent hover:underline">
            Zum Stundenplan
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="font-semibold">Performance</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Kommt bald mit den KI-Karteikarten – hier siehst du dann deinen
          Lernfortschritt pro Fach.
        </p>
      </div>
    </main>
  );
}

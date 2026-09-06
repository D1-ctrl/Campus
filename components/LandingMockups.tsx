import { FileText, Heart, MessageCircle, Send, Bookmark, Users, GraduationCap, Sparkles, Download } from "lucide-react";
import PostCard from "@/components/PostCard";
import type { PostFeedItem } from "@/lib/post-feed";

const now = new Date().toISOString();

function mockPost(overrides: Partial<PostFeedItem>): PostFeedItem {
  return {
    id: `mock-${Math.random()}`,
    university_id: "mock",
    subject_id: null,
    group_id: null,
    author_id: "mock-author",
    is_anonymous: false,
    body: "",
    image_url: null,
    scope: "uni",
    created_at: now,
    author: { display_name: "Lena", avatar_url: null },
    subject: null,
    group: null,
    comment_count: 3,
    poll: null,
    like_count: 12,
    liked_by_me: false,
    saved_by_me: false,
    poll_vote_counts: {},
    my_poll_vote: null,
    ...overrides,
  };
}

export function FeedMockup() {
  const post = mockPost({
    body: "Hat jemand die Mitschrift von der Vorlesung heute? Hab die letzten 10 Minuten verpasst 🙈",
    subject: { name: "Mikroökonomie" },
    subject_id: "mock-subject",
  });

  return (
    <div className="pointer-events-none select-none">
      <PostCard post={post} />
    </div>
  );
}

export function CourseMockup() {
  const rows = [
    { title: "Vorlesung 7 – Grenznutzen", type: "Skript" },
    { title: "Übungsblatt 4 Lösungen", type: "Übung" },
  ];

  return (
    <div className="pointer-events-none flex select-none flex-col gap-4 rounded-2xl bg-[var(--card)] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">
          M
        </div>
        <div>
          <p className="font-semibold">Mikroökonomie</p>
          <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Users size={12} strokeWidth={1.75} /> 128 Mitglieder
          </p>
        </div>
        <span className="ml-auto rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
          Folgst du
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.title}
            className="flex items-center gap-3 rounded-xl bg-black/[.03] px-3 py-2.5 dark:bg-white/5"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
              <FileText size={16} strokeWidth={1.5} className="text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.type}</p>
            </div>
            <Download size={15} strokeWidth={1.75} className="text-zinc-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlashcardMockup() {
  return (
    <div className="pointer-events-none flex select-none flex-col gap-4 rounded-2xl bg-[var(--card)] p-6">
      <span className="flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
        <Sparkles size={13} strokeWidth={1.75} /> KI-generiert
      </span>
      <div className="flex flex-col gap-2 rounded-xl border border-black/10 p-5 dark:border-white/15">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Frage
        </p>
        <p className="font-medium">Was beschreibt das Gesetz vom abnehmenden Grenznutzen?</p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl bg-accent/10 p-5">
        <p className="text-xs uppercase tracking-wide text-accent">Antwort</p>
        <p className="text-sm">
          Mit jeder zusätzlich konsumierten Einheit eines Gutes sinkt der zusätzliche
          Nutzen für die Person.
        </p>
      </div>
    </div>
  );
}

export function CommunityMockup() {
  const post = mockPost({
    body: "Umfrage: Wie bereitet ihr euch am liebsten auf Klausuren vor?",
    author: { display_name: "Jonas", avatar_url: null },
    poll: {
      id: "mock-poll",
      poll_options: [
        { id: "a", poll_id: "mock-poll", label: "Karteikarten", position: 0 },
        { id: "b", poll_id: "mock-poll", label: "Altklausuren", position: 1 },
      ],
    },
    poll_vote_counts: { a: 14, b: 9 },
    my_poll_vote: "a",
    like_count: 21,
    comment_count: 5,
  });

  return (
    <div className="pointer-events-none select-none">
      <PostCard post={post} />
    </div>
  );
}

export function ScheduleMockup() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr"];
  const events = [
    { day: 0, label: "Mikroökonomie", color: "bg-blue-500" },
    { day: 1, label: "Statistik", color: "bg-fuchsia-500" },
    { day: 3, label: "Seminar", color: "bg-emerald-500" },
  ];

  return (
    <div className="pointer-events-none flex select-none flex-col gap-4 rounded-2xl bg-[var(--card)] p-5">
      <div className="grid grid-cols-5 gap-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {days.map((_, i) => {
          const event = events.find((e) => e.day === i);
          return (
            <div
              key={i}
              className="flex h-20 flex-col items-center justify-start rounded-lg bg-black/[.03] p-1 dark:bg-white/5"
            >
              {event && (
                <span
                  className={`mt-1 w-full rounded px-1 py-2 text-center text-[10px] font-medium text-white ${event.color}`}
                >
                  {event.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

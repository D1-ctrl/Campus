"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import {
  X,
  LayoutDashboard,
  Newspaper,
  GraduationCap,
  Tag,
  Star,
  CalendarDays,
  Sparkles,
} from "lucide-react";

type JoinedSubject = { id: string; name: string };
type JoinedGroup = { id: string; name: string };

export const RAIL_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Feed", icon: Newspaper },
  { href: "/subjects", label: "Kurse", icon: GraduationCap },
  { href: "/groups", label: "Gruppen", icon: Tag },
] as const;

const MORE_ITEMS = [
  { href: "/favorites", label: "Favoriten", icon: Star },
  { href: "/schedule", label: "Stundenplan", icon: CalendarDays },
  { href: "/flashcards", label: "KI-Karteikarten", icon: Sparkles },
] as const;

type NavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [joinedSubjects, setJoinedSubjects] = useState<JoinedSubject[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);

  useEffect(() => {
    if (!user || !open) return;

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
  }, [user, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-64 flex-col gap-1 overflow-y-auto bg-[var(--background)] p-4 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-lg italic font-semibold">Campus</span>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[.04] dark:hover:bg-white/10"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  pathname === item.href
                    ? "bg-accent/10 text-accent"
                    : "hover:bg-black/[.04] dark:hover:bg-white/10"
                }`}
              >
                <Icon size={18} strokeWidth={1.75} />
                {item.label}
              </Link>
              {item.href === "/subjects" && joinedSubjects.length > 0 && (
                <div className="ml-8 flex flex-col">
                  {joinedSubjects.map((s) => (
                    <Link
                      key={s.id}
                      href={`/subjects/${s.id}`}
                      onClick={onClose}
                      className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/10"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
              {item.href === "/groups" && joinedGroups.length > 0 && (
                <div className="ml-8 flex flex-col">
                  {joinedGroups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/groups/${g.id}`}
                      onClick={onClose}
                      className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-white/10"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="my-2 border-t border-black/10 dark:border-white/10" />

        {MORE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-black/[.04] dark:hover:bg-white/10"
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto border-t border-black/10 pt-2 dark:border-white/10">
          <ThemeToggle variant="menu-item" />
          <div className="flex gap-3 px-3 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/impressum" onClick={onClose} className="hover:underline">
              Impressum
            </Link>
            <Link href="/datenschutz" onClick={onClose} className="hover:underline">
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

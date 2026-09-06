"use client";

import Link from "next/link";

type AvatarProps = {
  userId: string;
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

export default function Avatar({ userId, url, name, size = 32, className = "" }: AvatarProps) {
  return (
    <Link
      href={`/u/${userId}`}
      onClick={(e) => e.stopPropagation()}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 font-medium hover:opacity-90 dark:bg-white/10 ${className}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        (name || "?").charAt(0).toUpperCase()
      )}
    </Link>
  );
}

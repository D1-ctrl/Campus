import Link from "next/link";
import type { Document } from "@/lib/types";
import { documentTypeLabel } from "@/lib/document-types";
import Avatar from "@/components/Avatar";

type DocumentCardProps = {
  document: Document & {
    uploader: { display_name: string | null; avatar_url: string | null } | null;
  };
};

export default function DocumentCard({ document }: DocumentCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 transition-colors hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/5">
      <Link href={`/document/${document.id}`} className="flex flex-col gap-2">
        {document.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.thumbnail_url}
            alt=""
            className="h-32 w-full rounded-md object-cover object-top"
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium dark:bg-white/10">
            {documentTypeLabel(document.document_type)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {document.download_count} Downloads
          </span>
        </div>
        <h3 className="font-semibold">{document.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {document.subject} · {document.university}
        </p>
      </Link>
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {!document.is_anonymous && document.uploader && (
          <Avatar
            userId={document.uploader_id}
            url={document.uploader.avatar_url}
            name={document.uploader.display_name}
            size={20}
          />
        )}
        <span>
          von{" "}
          {document.is_anonymous ? (
            "Anonymer Nutzer"
          ) : (
            <Link href={`/u/${document.uploader_id}`} className="hover:underline">
              {document.uploader?.display_name ?? "Unbekannt"}
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}

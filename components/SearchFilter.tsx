"use client";

import { DOCUMENT_TYPES } from "@/lib/document-types";

export type Filters = {
  search: string;
  subject: string;
  university: string;
  documentType: string;
};

type SearchFilterProps = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

export default function SearchFilter({ filters, onChange }: SearchFilterProps) {
  function update(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <input
        type="text"
        placeholder="Titel durchsuchen..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className={`${inputClass} sm:col-span-2`}
      />
      <input
        type="text"
        placeholder="Fach"
        value={filters.subject}
        onChange={(e) => update({ subject: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Universität"
        value={filters.university}
        onChange={(e) => update({ university: e.target.value })}
        className={inputClass}
      />
      <select
        value={filters.documentType}
        onChange={(e) => update({ documentType: e.target.value })}
        className={`${inputClass} sm:col-span-4`}
      >
        <option value="">Alle Dokumenttypen</option>
        {DOCUMENT_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}

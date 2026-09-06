export const DOCUMENT_TYPES = [
  { value: "Skript", label: "Skript" },
  { value: "Zusammenfassung", label: "Zusammenfassung" },
  { value: "Klausur", label: "Klausur" },
  { value: "Uebung", label: "Übung" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export function documentTypeLabel(value: string): string {
  return DOCUMENT_TYPES.find((type) => type.value === value)?.label ?? value;
}

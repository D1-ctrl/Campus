export const CATEGORY_COLORS: Record<string, string> = {
  Vorlesung: "#f59e0b",
  Übung: "#a855f7",
  Praktikum: "#ec4899",
  Sonstiges: "#3b82f6",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#3b82f6";
}

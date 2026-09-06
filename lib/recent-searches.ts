export type RecentSearchItem = {
  type: "document" | "subject" | "person";
  id: string;
  label: string;
  sublabel?: string;
};

const STORAGE_KEY = "kampus-recent-searches";
const MAX_ITEMS = 8;

export function getRecentSearches(): RecentSearchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentSearchItem[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(item: RecentSearchItem) {
  try {
    const existing = getRecentSearches().filter(
      (r) => !(r.type === item.type && r.id === item.id)
    );
    const next = [item, ...existing].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage kann in manchen Kontexten fehlschlagen, ignorieren
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

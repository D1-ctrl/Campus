// Lokales Datum (Jahr-Monat-Tag) als "YYYY-MM-DD", ohne ueber UTC zu gehen.
// date.toISOString() konvertiert nach UTC und verschiebt das Datum in
// Zeitzonen vor UTC (z.B. Europe/Berlin) je nach Uhrzeit um einen Tag.
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Montag = 0 ... Sonntag = 6
export function isoWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

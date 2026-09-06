import type { SemesterType } from "@/lib/types";

// Konvention: Wintersemester beginnt am 1. Oktober, Sommersemester am 1. April.
export function currentFachsemester(
  startType: SemesterType,
  startYear: number,
  today: Date = new Date()
): number {
  const startIndex = startType === "WiSe" ? startYear * 2 : startYear * 2 + 1;

  const month = today.getMonth() + 1; // 1-12
  const year = today.getFullYear();
  const isWiSeNow = month >= 10 || month <= 3;
  const wiSeYear = month <= 3 ? year - 1 : year;
  const nowIndex = isWiSeNow ? wiSeYear * 2 : year * 2 + 1;

  const diff = nowIndex - startIndex;
  return Math.max(1, diff + 1);
}

export function semesterLabel(type: SemesterType, year: number): string {
  const shortYear = year % 100;
  return type === "WiSe"
    ? `WiSe ${shortYear}/${shortYear + 1}`
    : `SoSe ${shortYear}`;
}

// The study day rolls over at 04:00 local time, so a 01:30 session belongs to the evening before.

export const DEFAULT_ROLLOVER = 4;

/** Local calendar date (YYYY-MM-DD) of the study day containing `at`. */
export function studyDay(at: number, rolloverHour = DEFAULT_ROLLOVER): string {
  const d = new Date(at);
  d.setHours(d.getHours() - rolloverHour);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Timestamp at which the study day containing `at` begins. */
export function startOfStudyDay(at: number, rolloverHour = DEFAULT_ROLLOVER): number {
  const d = new Date(at);
  if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
  d.setHours(rolloverHour, 0, 0, 0);
  return d.getTime();
}

/** Timestamp at which the study day containing `at` ends (the next rollover). */
export function endOfStudyDay(at: number, rolloverHour = DEFAULT_ROLLOVER): number {
  const d = new Date(startOfStudyDay(at, rolloverHour));
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Start of the study day `days` after the one containing `at`. Survives DST changes. */
export function addStudyDays(at: number, days: number, rolloverHour = DEFAULT_ROLLOVER): number {
  const d = new Date(startOfStudyDay(at, rolloverHour));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

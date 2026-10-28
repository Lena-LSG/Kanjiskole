import { describe, expect, it } from "vitest";
import { addStudyDays, endOfStudyDay, startOfStudyDay, studyDay } from "../src/day.ts";
import { local } from "./helpers.ts";

describe("study day (04:00 rollover)", () => {
  it("puts 01:30 in the previous calendar day", () => {
    expect(studyDay(local(2026, 10, 29, 1, 30))).toBe("2026-10-28");
    expect(studyDay(local(2026, 10, 29, 3, 59))).toBe("2026-10-28");
    expect(studyDay(local(2026, 10, 29, 4, 0))).toBe("2026-10-29");
  });
  it("brackets the day from 04:00 to 04:00", () => {
    const t = local(2026, 10, 29, 1, 30);
    expect(startOfStudyDay(t)).toBe(local(2026, 10, 28, 4));
    expect(endOfStudyDay(t)).toBe(local(2026, 10, 29, 4));
  });
  it("survives the DST change (25 October 2026 in Copenhagen)", () => {
    expect(addStudyDays(local(2026, 10, 24, 20), 1)).toBe(local(2026, 10, 25, 4));
    expect(addStudyDays(local(2026, 10, 24, 20), 2)).toBe(local(2026, 10, 26, 4));
    expect(studyDay(local(2026, 10, 25, 2, 30))).toBe("2026-10-24");
  });
  it("respects a custom rollover hour", () => {
    expect(studyDay(local(2026, 10, 29, 5), 6)).toBe("2026-10-28");
  });
});

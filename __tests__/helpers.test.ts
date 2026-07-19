/**
 * Unit tests for pure helper functions in page.tsx.
 * These are extracted here to avoid importing the React component.
 */

// ── Helpers (copied from page.tsx to test in isolation) ───────────────────────

function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function dayLabel(year: number, month: number, day: number) {
  return new Date(year, month, day)
    .toLocaleDateString("en", { weekday: "short" })
    .slice(0, 2);
}

// ── toYMD ─────────────────────────────────────────────────────────────────────

describe("toYMD", () => {
  it("formats a standard date correctly", () => {
    expect(toYMD(2026, 6, 18)).toBe("2026-07-18"); // month is 0-indexed
  });

  it("pads single-digit month and day", () => {
    expect(toYMD(2026, 0, 1)).toBe("2026-01-01");
  });

  it("handles December correctly", () => {
    expect(toYMD(2025, 11, 31)).toBe("2025-12-31");
  });

  it("handles double-digit days without padding", () => {
    expect(toYMD(2026, 9, 15)).toBe("2026-10-15");
  });
});

// ── daysInMonth ───────────────────────────────────────────────────────────────

describe("daysInMonth", () => {
  it("returns 31 for January", () => {
    expect(daysInMonth(2026, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInMonth(2025, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it("returns 30 for April", () => {
    expect(daysInMonth(2026, 3)).toBe(30);
  });

  it("returns 31 for December", () => {
    expect(daysInMonth(2026, 11)).toBe(31);
  });

  it("returns 31 for July", () => {
    expect(daysInMonth(2026, 6)).toBe(31);
  });
});

// ── dayLabel ──────────────────────────────────────────────────────────────────

describe("dayLabel", () => {
  it("returns 'Sa' for Saturday July 18 2026", () => {
    // July 18 2026 is a Saturday
    expect(dayLabel(2026, 6, 18)).toBe("Sa");
  });

  it("returns a 2-character string", () => {
    const label = dayLabel(2026, 6, 1);
    expect(label).toHaveLength(2);
  });

  it("returns 'Mo' for a known Monday", () => {
    // Jan 5, 2026 is a Monday
    expect(dayLabel(2026, 0, 5)).toBe("Mo");
  });

  it("returns 'Su' for a known Sunday", () => {
    // Jan 4, 2026 is a Sunday
    expect(dayLabel(2026, 0, 4)).toBe("Su");
  });
});

// ── monthKey format ───────────────────────────────────────────────────────────

describe("monthKey format", () => {
  it("produces YYYY-MM format", () => {
    const year = 2026;
    const month = 6; // July (0-indexed)
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    expect(monthKey).toBe("2026-07");
    expect(monthKey).toMatch(/^\d{4}-\d{2}$/);
  });

  it("pads single-digit months", () => {
    const year = 2026;
    const month = 0; // January
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    expect(monthKey).toBe("2026-01");
  });
});

// ── Date comparison (future-cell logic) ───────────────────────────────────────

describe("future date comparison", () => {
  it("a future YMD string is greater than today's YMD string", () => {
    const today = "2026-07-18";
    const future = "2026-07-19";
    expect(future > today).toBe(true);
  });

  it("a past YMD string is not greater than today", () => {
    const today = "2026-07-18";
    const past = "2026-07-17";
    expect(past > today).toBe(false);
  });

  it("today's YMD is not greater than itself", () => {
    const today = "2026-07-18";
    expect(today > today).toBe(false);
  });
});

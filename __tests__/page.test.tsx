/**
 * Component smoke tests for the main HabitTracker page.
 * All fetch calls are mocked — no network or database is used.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock Next.js Link as a plain <a> for tests
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock window.matchMedia (jsdom doesn't implement it)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false, // default: desktop mode
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Sample data
const MOCK_HABITS = [
  { id: 1, name: "Exercise", position: 0, description: "", goal_value: null, month: "2026-07" },
  { id: 2, name: "Read", position: 1, description: "", goal_value: 20, month: "2026-07" },
];
const MOCK_COMPLETIONS = [
  { habit_id: 1, date: "2026-07-01" },
];

// ── Fetch mock ────────────────────────────────────────────────────────────────

function mockFetchSuccess() {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("/api/init-db")) {
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }
    if (url.includes("/api/habits")) {
      return Promise.resolve({ ok: true, json: async () => MOCK_HABITS });
    }
    if (url.includes("/api/completions")) {
      return Promise.resolve({ ok: true, json: async () => MOCK_COMPLETIONS });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

import HabitTracker from "@/app/page";

describe("HabitTracker page", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetchSuccess();
    jest.clearAllMocks();
  });

  it("shows loading state initially", async () => {
    // Make fetch take a moment so loading state is visible
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    render(<HabitTracker />);
    expect(screen.getByText(/loading your habits/i)).toBeInTheDocument();
  });

  it("renders the site logo", async () => {
    await act(async () => { render(<HabitTracker />); });
    expect(screen.getByText("habits.")).toBeInTheDocument();
  });

  it("renders habit names after loading", async () => {
    await act(async () => { render(<HabitTracker />); });
    await waitFor(() => {
      expect(screen.getByText("Exercise")).toBeInTheDocument();
      expect(screen.getByText("Read")).toBeInTheDocument();
    });
  });

  it("renders the month navigation on desktop", async () => {
    await act(async () => { render(<HabitTracker />); });
    await waitFor(() => {
      // Should show current month name
      expect(screen.getByRole("navigation", { name: /month navigation/i })).toBeInTheDocument();
    });
  });

  it("renders the settings gear button", async () => {
    await act(async () => { render(<HabitTracker />); });
    expect(screen.getByTitle("Settings")).toBeInTheDocument();
  });

  it("opens settings modal when gear button is clicked", async () => {
    await act(async () => { render(<HabitTracker />); });
    const settingsBtn = screen.getByTitle("Settings");
    fireEvent.click(settingsBtn);
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Dark Mode")).toBeInTheDocument();
      expect(screen.getByText("Clone Habits")).toBeInTheDocument();
    });
  });

  it("closes settings modal when overlay is clicked", async () => {
    await act(async () => { render(<HabitTracker />); });
    fireEvent.click(screen.getByTitle("Settings"));
    await waitFor(() => expect(screen.getByText("Dark Mode")).toBeInTheDocument());

    // Click the × button
    fireEvent.click(screen.getByRole("button", { name: /×/ }));
    await waitFor(() => {
      expect(screen.queryByText("Dark Mode")).not.toBeInTheDocument();
    });
  });

  it("renders the ghost add-habit input", async () => {
    await act(async () => { render(<HabitTracker />); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a habit/i)).toBeInTheDocument();
    });
  });

  it("submits a new habit when Enter is pressed in the ghost input", async () => {
    const newHabit = { id: 3, name: "Meditate", position: 2, description: "", goal_value: null, month: "2026-07" };
    global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes("/api/habits") && opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => newHabit });
      }
      if (url.includes("/api/habits")) {
        return Promise.resolve({ ok: true, json: async () => MOCK_HABITS });
      }
      if (url.includes("/api/completions")) {
        return Promise.resolve({ ok: true, json: async () => MOCK_COMPLETIONS });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    });

    await act(async () => { render(<HabitTracker />); });
    await waitFor(() => expect(screen.getByText("Exercise")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/add a habit/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "Meditate" } });
      fireEvent.keyDown(input, { key: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText("Meditate")).toBeInTheDocument();
    });
  });

  it("clears the ghost input when Escape is pressed", async () => {
    await act(async () => { render(<HabitTracker />); });
    await waitFor(() => expect(screen.getByPlaceholderText(/add a habit/i)).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/add a habit/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test habit" } });
    expect(input.value).toBe("Test habit");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("shows progress count next to each habit", async () => {
    await act(async () => { render(<HabitTracker />); });
    await waitFor(() => {
      // Habit 1 has 1 completion in a 31-day month → "1/31"
      expect(screen.getByText("1/31")).toBeInTheDocument();
      // Habit 2 has goal_value=20 and 0 completions → "0/20"
      expect(screen.getByText("0/20")).toBeInTheDocument();
    });
  });
});

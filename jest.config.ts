import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      // ── API route tests — Node environment (no DOM) ──────────────────
      displayName: "api",
      testEnvironment: "node",
      testMatch: ["**/__tests__/api.*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      setupFiles: ["<rootDir>/jest.env.ts"],
    },
    {
      // ── Unit + Component tests — jsdom environment ────────────────────
      displayName: "ui",
      testEnvironment: "jest-environment-jsdom",
      testMatch: [
        "**/__tests__/helpers.test.ts",
        "**/__tests__/page.test.tsx",
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.css$": "<rootDir>/__mocks__/fileMock.ts",
      },
      setupFiles: ["<rootDir>/jest.env.ts"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
};

export default config;

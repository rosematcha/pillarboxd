import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["app/**/*.test.{ts,tsx}", "tests/unit/**/*.test.ts"],
    environment: "node",
  },
});

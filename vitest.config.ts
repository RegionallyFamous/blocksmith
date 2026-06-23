import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    pool: "threads"
  },
  resolve: {
    alias: {
      "@blocksmith/schema": "/Users/nick/Documents/GitHub/blocksmith/packages/schema/src/index.ts",
      "@blocksmith/sections": "/Users/nick/Documents/GitHub/blocksmith/packages/sections/src/index.ts",
      "@blocksmith/compiler": "/Users/nick/Documents/GitHub/blocksmith/packages/compiler/src/index.ts",
      "@blocksmith/validator": "/Users/nick/Documents/GitHub/blocksmith/packages/validator/src/index.ts",
      "@blocksmith/taste": "/Users/nick/Documents/GitHub/blocksmith/packages/taste/src/index.ts"
    }
  }
});


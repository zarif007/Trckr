/**
 * Component tests: happy-dom avoids jsdom+CJS issues with modern CSS deps.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const workspaceRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: workspaceRoot,
  plugins: [tsconfigPaths({ projects: [resolve(workspaceRoot, "tsconfig.json")] })],
  resolve: {
    alias: [{ find: /^@\//, replacement: `${workspaceRoot}/` }],
  },
  test: {
    name: "ui",
    environment: "happy-dom",
    include: ["**/*.test.tsx"],
    setupFiles: ["./vitest.setup.dom.ts"],
    passWithNoTests: true,
  },
});

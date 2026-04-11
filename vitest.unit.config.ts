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
    name: "unit",
    environment: "node",
    include: ["**/*.test.ts"],
  },
});

import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    host: true,
    strictPort: true,
  },
  appType: 'spa',
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

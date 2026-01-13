import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "assets"
  }
});

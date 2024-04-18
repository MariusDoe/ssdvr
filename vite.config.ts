import { defineConfig } from "vite";
import files from "./plugins/files.ts";

export default defineConfig({
  plugins: [files()],
});

import { defineConfig } from "vite";
import files from "./plugins/files";

export default defineConfig({
  plugins: [files()],
});

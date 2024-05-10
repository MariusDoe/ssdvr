import { defineConfig } from "vite";
import files from "./plugins/files";
import runningModule from "./plugins/hmr";

export default defineConfig({
  plugins: [runningModule(), files()],
});

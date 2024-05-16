import { defineConfig } from "vite";
import { files } from "./plugins/files";
import { hmr } from "./plugins/hmr";

export default defineConfig({
  plugins: [hmr(), files()],
});

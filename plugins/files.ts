import { readFile, writeFile } from "fs/promises";
import { Plugin, normalizePath } from "vite";

export type ReadResponse = {
  path: string;
} & (
  | {
      ok: true;
      contents: string;
    }
  | {
      ok: false;
      error: string;
    }
);

export function files(): Plugin {
  return {
    name: "files",
    configureServer(server) {
      server.hot.on("files:read", async (data) => {
        const { path } = data;
        let response: ReadResponse;
        try {
          const contents = await readFile(normalizePath(path), {
            encoding: "utf8",
          });
          response = {
            path,
            ok: true,
            contents,
          };
        } catch (error) {
          response = {
            path,
            ok: false,
            error: `unable to read file: ${error}`,
          };
        }
        server.hot.send("files:read", response);
      });
      server.hot.on("files:write", async (data) => {
        const { path, contents } = data;
        await writeFile(normalizePath(path), contents);
      });
    },
  };
}

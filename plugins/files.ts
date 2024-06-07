import { readFile, readdir, writeFile } from "fs/promises";
import { Plugin, normalizePath } from "vite";

type Messages = {
  "files:read": {
    path: string;
  };
  "files:write": {
    path: string;
  };
  "files:list": {
    path: string;
  };
};

export type MessageName = keyof Messages;

export type MessageData<Name extends MessageName> = Messages[Name];

export type Message<Name extends MessageName> = {
  id: string;
} & MessageData<Name>;

type Responses = {
  "files:read": {
    contents: string;
  };
  "files:list": {
    list: {
      name: string;
      type: "file" | "directory" | "other";
    }[];
  };
};

export type RequestName = keyof Responses;

export type ResponseData<Name extends RequestName> = Responses[Name];

export type Response<Name extends RequestName> = {
  id: string;
} & (
  | ({
      ok: true;
    } & ResponseData<Name>)
  | {
      ok: false;
      error: string;
    }
);

export type ResponseWithOk<
  Name extends RequestName,
  Ok extends boolean
> = Response<Name> & { ok: Ok };

export type OkResponse<Name extends RequestName> = ResponseWithOk<Name, true>;

export function files(): Plugin {
  return {
    name: "files",
    configureServer(server) {
      const handleRequest = <Name extends RequestName>(
        name: Name,
        handler: (data: any) => Promise<ResponseData<Name>>
      ) => {
        server.hot.on(name, async (data: { id: string }) => {
          const { id } = data;
          let response: Response<Name>;
          try {
            const responseData = await handler(data);
            response = {
              id,
              ...responseData,
              ok: true,
            };
          } catch (error) {
            response = {
              id,
              ok: false,
              error: `request '${name}' failed: ${error}`,
            };
          }
          server.hot.send(name, response as any);
        });
      };
      handleRequest("files:read", async (data) => {
        const { path } = data;
        const contents = await readFile(normalizePath(path), {
          encoding: "utf8",
        });
        return { contents };
      });
      server.hot.on("files:write", async (data) => {
        const { path, contents } = data;
        await writeFile(normalizePath(path), contents);
      });
      handleRequest("files:list", async (data) => {
        const { path } = data;
        const list = await readdir(path, { withFileTypes: true });
        return {
          list: list.map((entry) => ({
            name: entry.name,
            type: entry.isFile()
              ? "file"
              : entry.isDirectory()
              ? "directory"
              : "other",
          })),
        };
      });
    },
  };
}

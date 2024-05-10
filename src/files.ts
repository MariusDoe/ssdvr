import type { ReadResponse } from "../plugins/files";

const pendingReads = new Map<string, PromiseWithResolvers<string>>();
if (import.meta.hot) {
  import.meta.hot.on("files:read", (data: ReadResponse) => {
    const pendingLoad = pendingReads.get(data.path);
    if (!pendingLoad) {
      return;
    }
    if (data.ok) {
      pendingLoad.resolve(data.contents);
    } else {
      pendingLoad.reject(data.error);
    }
    pendingReads.delete(data.path);
  });
}

export const read = (path: string) => {
  if (!import.meta.hot) {
    return Promise.reject("missing vite");
  }
  let pendingLoad = pendingReads.get(path);
  if (pendingLoad) {
    return pendingLoad.promise;
  }
  pendingLoad = Promise.withResolvers<string>();
  pendingReads.set(path, pendingLoad);
  import.meta.hot.send("files:read", { path });
  return pendingLoad.promise;
};

export const write = (path: string, contents: string) => {
  if (!import.meta.hot) {
    return;
  }
  import.meta.hot.send("files:write", { path, contents });
};

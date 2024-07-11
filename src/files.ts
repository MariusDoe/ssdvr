import type {
  MessageData,
  OkResponse,
  RequestName,
  Response,
} from "../plugins/files";
import { preserveOnce } from "./hmr/preserve";

const pendingRequests = preserveOnce(
  "pendingRequests",
  () => new Map<string, PromiseWithResolvers<OkResponse<RequestName>>>()
);
const requestNames = ["files:read", "files:list"] as const;

for (const name of requestNames) {
  if (import.meta.hot) {
    import.meta.hot.on(name, (data: Response<RequestName>) => {
      const pendingRequest = pendingRequests.get(data.id);
      if (!pendingRequest) {
        return;
      }
      if (data.ok) {
        pendingRequest.resolve(data);
      } else {
        pendingRequest.reject(data.error);
      }
      pendingRequests.delete(data.id);
    });
  }
}

const request = <Name extends RequestName>(
  name: Name,
  data: MessageData<Name>
) => {
  if (!import.meta.hot) {
    return Promise.reject("missing vite");
  }
  const id = crypto.randomUUID();
  const pendingRequest = Promise.withResolvers<OkResponse<Name>>();
  pendingRequests.set(
    id,
    pendingRequest as unknown as PromiseWithResolvers<OkResponse<RequestName>>
  );
  import.meta.hot.send(name, { id, ...data } as any);
  return pendingRequest.promise;
};

export const read = async (path: string) =>
  (await request("files:read", { path })).contents;

export const write = (path: string, contents: string) => {
  if (!import.meta.hot) {
    return;
  }
  import.meta.hot.send("files:write", { path, contents });
};

export const list = async (path: string) =>
  (await request("files:list", { path })).list;

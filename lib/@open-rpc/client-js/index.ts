/**
 * changed version of https://github.com/open-rpc/client-js/blob/f443070b8a957b4416c66cfaf873f61892ce822d/src/index.ts
 */

import Client from "./Client";
import { JSONRPCError } from "./Error";
import RequestManager from "./RequestManager";
import WebSocketTransport from "./transports/WebSocketTransport";

export default Client;
export { Client, JSONRPCError, RequestManager, WebSocketTransport };

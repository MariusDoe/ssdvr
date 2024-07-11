import three from "three?url";
import type { Module } from "./running-module";

const mostRecentURL: Record<string, string> = {
  three,
};

export const removeQueryParametersFromURL = (url: string) => {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.toString();
};

export const updateMostRecentURL = (module: Module) => {
  mostRecentURL[removeQueryParametersFromURL(module.url)] = module.url;
};

export const mostRecentURLFor = (url: string) => {
  return mostRecentURL[url] ?? url;
};

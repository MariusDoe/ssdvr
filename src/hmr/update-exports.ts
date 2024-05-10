import { ModuleNamespace } from "vite/types/hot.js";
import { Module } from "./running-module";

// TODO: keep older versions up to date

export const updateExports = (
  module: Module,
  oldModuleNamespace: ModuleNamespace,
  newModuleNamespace: ModuleNamespace
) => {
  for (const key in oldModuleNamespace) {
    if (!(key in newModuleNamespace)) {
      module.hot?.invalidate();
      break;
    }
    oldModuleNamespace[key] = newModuleNamespace[key];
  }
};

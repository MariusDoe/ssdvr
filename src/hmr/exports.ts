import { ModuleNamespace } from "vite/types/hot.js";
import { updateMostRecentURL } from "./most-recent-url";
import { ProxifiedObject, proxifyObject } from "./proxy-object";
import { Registry, updateRegistry } from "./registry";
import { Module } from "./running-module";

const oldModuleVersions = new WeakMap<Module, WeakRef<Module>[]>();
const mutableModuleNamespaces = new WeakMap<Module, ModuleNamespace>();
const pendingExportsUpdates = new WeakMap<
  ModuleNamespace,
  PromiseWithResolvers<Module> | Module
>();

export const registerModule = (module: Module) => {
  updateMostRecentURL(module);
  import(module.url).then((namespace) => {
    if (pendingExportsUpdates.has(namespace)) {
      (
        pendingExportsUpdates.get(namespace) as PromiseWithResolvers<Module>
      ).resolve(module);
    } else {
      pendingExportsUpdates.set(namespace, module);
    }
  });
};

export const scheduleExportsUpdate = (
  oldModule: Module,
  oldMutableModuleNamespace: ModuleNamespace,
  newModuleNamespace: ModuleNamespace
) => {
  mutableModuleNamespaces.set(oldModule, oldMutableModuleNamespace);
  const pendingUpdate = pendingExportsUpdates.get(newModuleNamespace);
  const handleNewModule = (newModule: Module) => {
    pendingExportsUpdates.delete(newModuleNamespace);
    migrateOldVersions(oldModule, newModule, newModuleNamespace);
  };
  if (pendingUpdate) {
    if ("promise" in pendingUpdate) {
      pendingUpdate.promise.then(handleNewModule);
    } else {
      handleNewModule(pendingUpdate);
    }
  } else {
    const withResolvers = Promise.withResolvers<Module>();
    pendingExportsUpdates.set(newModuleNamespace, withResolvers);
    withResolvers.promise.then(handleNewModule);
  }
};

const migrateOldVersions = (
  oldModule: Module,
  newModule: Module,
  newModuleNamespace: ModuleNamespace
) => {
  const oldVersions = oldModuleVersions.get(oldModule) ?? [];
  oldVersions.push(new WeakRef(oldModule));
  oldModuleVersions.delete(oldModule);
  oldModuleVersions.set(newModule, oldVersions);
  updateAllOldExports(newModuleNamespace, oldVersions);
};

const updateAllOldExports = (
  newModuleNamespace: ModuleNamespace,
  oldVersions: WeakRef<Module>[]
) => {
  for (let i = oldVersions.length; i-- > 0; ) {
    const oldVersion = oldVersions[i];
    const oldModule = oldVersion.deref();
    if (oldModule) {
      const oldMutableModuleNamespace = mutableModuleNamespaces.get(oldModule)!;
      updateOldExports(
        oldModule,
        oldMutableModuleNamespace,
        newModuleNamespace
      );
    } else {
      oldVersions.splice(i, 1);
    }
  }
};

const updateOldExports = (
  oldModule: Module,
  oldMutableModuleNamespace: ModuleNamespace,
  newModuleNamespace: ModuleNamespace
) => {
  for (const key in oldMutableModuleNamespace) {
    if (!(key in newModuleNamespace)) {
      oldModule.hot?.invalidate();
      break;
    }
    oldMutableModuleNamespace[key] = newModuleNamespace[key];
  }
};

const exportRegistryKey = Symbol("exportRegistry");

const exportRegistryFor = (module: Module): Registry<ProxifiedObject> => {
  return (module.hot!.data[exportRegistryKey] ??= new Map());
};

export const updateExportsRegistry = (
  module: Module,
  newExportNames: Set<string>
) => {
  updateRegistry(exportRegistryFor(module), newExportNames);
};

export const wrapExport = (value: unknown, name: string, module: Module) => {
  if (!module.hot) {
    return value;
  }
  if (
    typeof value === "function" ||
    (typeof value === "object" && value !== null)
  ) {
    const registry = exportRegistryFor(module);
    return proxifyObject(value, name, registry);
  }
  return value;
};

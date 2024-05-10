import { ModuleNamespace } from "vite/types/hot.js";

export type Module = ImportMeta;

const runningModules: Module[] = [];

const moduleNamespaceToModuleMap =
  import.meta.hot?.data.moduleNamespaceToModule ??
  new WeakMap<ModuleNamespace, Module>();
if (import.meta.hot) {
  import.meta.hot.data.moduleNamespaceToModule = moduleNamespaceToModuleMap;
}

export const moduleNamespaceToModule = (moduleNamespace: ModuleNamespace) =>
  moduleNamespaceToModuleMap.get(moduleNamespace);

export const pushRunningModule = (module: Module) => {
  runningModules.push(module);
};

export const popRunningModule = () => {
  const module = runningModules.pop();
  if (!module) {
    return;
  }
  import(module.url).then((namespace) =>
    moduleNamespaceToModuleMap.set(namespace, module)
  );
};

export const runningModule = () => runningModules[runningModules.length - 1];

export const withRunningModule = <T>(module: Module, fn: () => T) => {
  pushRunningModule(module);
  try {
    return fn();
  } finally {
    popRunningModule();
  }
};

export const captureRunningModule = <Args extends unknown[], Return>(
  fn: (...args: Args) => Return
) => {
  const module = runningModule();
  return (...args: Args) => withRunningModule(module, () => fn(...args));
};

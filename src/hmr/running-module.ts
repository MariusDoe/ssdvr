export type Module = ImportMeta;

const runningModules: Module[] = [];

export const pushRunningModule = (module: Module) => {
  runningModules.push(module);
};

export const popRunningModule = () => {
  const module = runningModules.pop();
  if (!module) {
    return;
  }
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

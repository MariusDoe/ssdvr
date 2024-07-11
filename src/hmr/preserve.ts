import { runningModule } from "./running-module";

export const preserve = <T>(name: string, create: (last?: T) => T): T => {
  const module = runningModule();
  if (module.hot) {
    const data = create(module.hot.data[name]);
    module.hot.data[name] = data;
    return data;
  } else {
    return create(undefined);
  }
};

export const preserveOnce = <T extends {}>(
  name: string,
  create: () => T
): T => {
  return preserve(name, (last) => last ?? create());
};

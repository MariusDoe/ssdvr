import { runningModule } from "./running-module";

export const preserve = <T>(name: string, create: () => T) => {
  const module = runningModule();
  if (module.hot) {
    const data = module.hot.data[name] ?? create();
    module.hot.data[name] = data;
    return data;
  } else {
    return create();
  }
};

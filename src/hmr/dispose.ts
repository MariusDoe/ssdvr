import { runningModule } from "./running-module";

export const onDispose = (fn: () => void) => {
  runningModule().hot?.dispose(() => fn());
};

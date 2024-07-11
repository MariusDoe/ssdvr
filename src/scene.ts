import { Scene } from "three";
import { preserveOnce } from "./hmr/preserve";

export const scene = preserveOnce("scene", () => new Scene());

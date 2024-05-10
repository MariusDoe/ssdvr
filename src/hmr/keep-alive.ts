import { Module, runningModule } from "./running-module";

type Class = Function;

const keepAliveClasses =
  import.meta.hot?.data.keepAliveClasses ?? new Map<Module, Class[]>();
const keepAliveObjects =
  import.meta.hot?.data.keepAliveObjects ?? new WeakMap<Class, Object[]>();
if (import.meta.hot) {
  import.meta.hot.data.keepAliveClasses = keepAliveClasses;
  import.meta.hot.data.keepAliveObjects = keepAliveObjects;
}

export const registerKeepAliveClass = (klass: Class) => {
  const module = runningModule();
  let classes = keepAliveClasses.get(module);
  if (!classes) {
    classes = [];
  }
  classes.push(klass);
  keepAliveClasses.set(module, classes);
  keepAliveObjects.set(klass, []);
};

export const moduleReloaded = (oldModule: Module, newModule: Module) => {
  const oldClasses = keepAliveClasses.get(oldModule);
  const newClasses = keepAliveClasses.get(newModule);
  keepAliveClasses.delete(oldModule);
  if (!newClasses || !oldClasses) {
    return;
  }
  for (
    let i = 0, j = 0;
    i < oldClasses.length || j < newClasses.length;
    i++, j++
  ) {
    const oldClass = oldClasses[i];
    const newClass = newClasses[j];
    if (oldClass.name === newClass.name) {
      convertObjects(oldClass, newClass);
    } else if (oldClass.name === newClasses[j + 1]?.name) {
      // newClass was added
      convertObjects(oldClass, newClasses[j + 1]);
      j++;
    } else if (newClass.name === oldClasses[i + 1]?.name) {
      // oldClass was deleted
      i++;
    } else if (newClasses[i + 1]?.name === oldClasses[j + 1]?.name) {
      // oldClass was renamed to newClass
      convertObjects(oldClass, newClass);
    } else {
      console.warn("keep-alive: skipping 2 unrelated classes");
    }
  }
};

const convertObjects = (oldClass: Class, newClass: Class) => {
  const objects = keepAliveObjects.get(oldClass);
  if (!objects) {
    return;
  }
  for (const object of objects) {
    convertObject(object, newClass);
  }
};

const convertObject = (object: Object, newClass: Class) => {
  Object.setPrototypeOf(object, newClass.prototype);
  object.constructor = newClass;
};

export const keepAlive = <T extends Object>(object: T) => {
  const objects = keepAliveObjects.get(object.constructor);
  if (!objects) {
    throw new TypeError(
      `trying to object alive whose class was not registered: ${object.constructor.name}`
    );
  }
  objects.push(object);
  return object;
};

export class KeepAlive {
  constructor() {
    keepAlive(this);
  }
}

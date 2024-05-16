import {
  ProxifiedObject,
  ProxyTarget,
  createProxy,
  objectProxyHandler,
  proxyTargetKey,
} from "./proxy-object";
import { updateRegistry } from "./registry";
import { Module } from "./running-module";

const prototypeProxyKey = Symbol("prototypeProxy");

type ClassProxyTarget = ProxyTarget & {
  [prototypeProxyKey]: object;
};

export type ProxifiedClass = ProxifiedObject & {
  prototype: ProxifiedObject;
};

const classProxyHandler: Required<ProxyHandler<ClassProxyTarget>> = {
  ...objectProxyHandler,
  get(target, property, receiver) {
    if (property === "prototype") {
      return target[prototypeProxyKey];
    }
    return objectProxyHandler.get(target, property, receiver);
  },
  getOwnPropertyDescriptor(target, property) {
    if (property === "prototype") {
      const descriptor = {
        configurable: true,
        enumerable: false,
        writable: true,
        value: target[prototypeProxyKey],
      };
      // see comment in objectProxyHandler.getOwnPropertyDescriptor
      Object.defineProperty(target, property, descriptor);
      return descriptor;
    }
    return objectProxyHandler.getOwnPropertyDescriptor(target, property);
  },
};

const classRegistryKey = Symbol("classRegistry");

const classRegistryFor = (module: Module) => {
  return (module.hot!.data[classRegistryKey] ??= new Map());
};

export const updateClassRegistry = (
  module: Module,
  newClassNames: Set<string>
) => {
  updateRegistry(classRegistryFor(module), newClassNames);
};

export const proxifyClass = (
  target: Function,
  name: string,
  module: Module
): ProxifiedClass => {
  Object.defineProperty(target, "name", {
    value: name,
  });
  const registry = classRegistryFor(module);
  if (registry.has(name)) {
    const proxy = registry.get(name)!;
    proxy[proxyTargetKey] = target;
    proxy.prototype[proxyTargetKey] = target.prototype;
    return proxy;
  } else {
    const prototypeProxy = createProxy(
      target.prototype,
      objectProxyHandler,
      {}
    );
    const proxy = createProxy(target, classProxyHandler, {
      [prototypeProxyKey]: prototypeProxy,
    });
    registry.set(name, proxy as unknown as ProxifiedClass);
    return proxy as unknown as ProxifiedClass;
  }
};

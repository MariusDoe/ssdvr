import { Registry } from "./registry";

export const proxyKey = Symbol("proxy");
export const proxyTargetKey = Symbol("proxyTarget");

export type ProxifiedObject = {
  [proxyKey]: object;
  [proxyTargetKey]: object;
};

export type ProxyTarget = ProxifiedObject;

export const objectProxyHandler: Required<ProxyHandler<ProxyTarget>> = {
  apply(target, thisArg, argArray) {
    return Reflect.apply(
      target[proxyTargetKey] as unknown as Function,
      thisArg === target[proxyKey] ? target[proxyTargetKey] : thisArg,
      argArray
    );
  },
  construct(target, argArray, newTarget) {
    return Reflect.construct(
      target[proxyTargetKey] as unknown as Function,
      argArray,
      // keep proxy here so that the function's prototype proxy is used
      // as the prototype of the new instance instead of the function's raw prototype
      newTarget
    );
  },
  defineProperty(target, property, attributes) {
    return Reflect.defineProperty(target[proxyTargetKey], property, attributes);
  },
  deleteProperty(target, property) {
    return Reflect.deleteProperty(target[proxyTargetKey], property);
  },
  get(target, property, receiver) {
    if (property === proxyTargetKey) {
      return target[proxyTargetKey];
    }
    const value = Reflect.get(
      target[proxyTargetKey],
      property,
      receiver === target[proxyKey] ? target[proxyTargetKey] : receiver
    );
    if (value instanceof Function) {
      return function (this: unknown, ...args: unknown[]) {
        return value.apply(
          this === target[proxyKey] && property !== Symbol.hasInstance
            ? target[proxyTargetKey]
            : this,
          args
        );
      };
    }
    return value;
  },
  getOwnPropertyDescriptor(target, property) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      target[proxyTargetKey],
      property
    );
    if (descriptor) {
      // the actual target needs to reflect the descriptor,
      // otherwise an error is thrown
      Object.defineProperty(target, property, descriptor);
    }
    return descriptor;
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target[proxyTargetKey]);
  },
  has(target, property) {
    return Reflect.has(target[proxyTargetKey], property);
  },
  isExtensible(target) {
    return Reflect.isExtensible(target[proxyTargetKey]);
  },
  ownKeys(target) {
    return Reflect.ownKeys(target[proxyTargetKey]);
  },
  preventExtensions(target) {
    return Reflect.preventExtensions(target[proxyTargetKey]);
  },
  set(target, property, newValue, receiver) {
    if (property === proxyTargetKey) {
      target[proxyTargetKey] = newValue;
      return true;
    }
    return Reflect.set(
      target[proxyTargetKey],
      property,
      newValue,
      receiver === target[proxyKey] ? target[proxyTargetKey] : receiver
    );
  },
  setPrototypeOf(target, value) {
    return Reflect.setPrototypeOf(target[proxyTargetKey], value);
  },
};

export const proxifyObject = (
  target: object,
  name: string,
  registry: Registry<ProxifiedObject>
): ProxifiedObject => {
  if (registry.has(name)) {
    const proxy = registry.get(name)!;
    proxy[proxyTargetKey] = target;
    return proxy;
  } else {
    const proxy = createProxy(target, objectProxyHandler, {});
    registry.set(name, proxy as unknown as ProxifiedObject);
    return proxy as unknown as ProxifiedObject;
  }
};

export const createProxy = <Target extends ProxyTarget>(
  initialTarget: object,
  handler: ProxyHandler<Target>,
  additionalTargetProperties: Omit<
    Target,
    typeof proxyTargetKey | typeof proxyKey
  >
) => {
  // function to ensure proxy is callable
  const target = function () {} as unknown as Target;
  target[proxyTargetKey] = initialTarget;
  Object.assign(target, additionalTargetProperties);
  const proxy = new Proxy(target, handler);
  target[proxyKey] = proxy;
  return proxy;
};

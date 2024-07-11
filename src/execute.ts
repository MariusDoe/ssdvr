const AsyncFunction = async function () {}.constructor;

export const execute = (source: string, scope: Object) => {
  AsyncFunction(source).call(scope);
};

export type Registry<T> = Map<string, T>;

export const updateRegistry = <T>(
  registry: Registry<T>,
  newNames: Set<string>
) => {
  let unmatchedNewNames = [];
  for (const newName of newNames) {
    if (!registry.has(newName)) {
      unmatchedNewNames.push(newName);
    }
  }
  const matchedOldNamesCount = newNames.size - unmatchedNewNames.length;
  const unmatchedOldNamesCount = registry.size - matchedOldNamesCount;
  if (
    (unmatchedNewNames.length > 1 && unmatchedOldNamesCount > 0) ||
    (unmatchedNewNames.length === 1 && unmatchedOldNamesCount > 1)
  ) {
    console.warn("Multiple items renamed or added, cannot work out matching.");
  } else if (unmatchedNewNames.length === 1 && unmatchedOldNamesCount === 1) {
    const newName = unmatchedNewNames[0];
    const oldName = Array.from(registry.keys()).find(
      (name) => !newNames.has(name)
    )!;
    registry.set(newName, registry.get(oldName)!);
  } else if (unmatchedOldNamesCount > 0) {
    for (const oldName of registry.keys()) {
      if (!newNames.has(oldName)) {
        registry.delete(oldName);
      }
    }
  }
};

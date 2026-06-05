/** 从 Form store 按路径取值（用于 shouldUpdate 比较） */
export function getStoreValueAtPath(store: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string | number, unknown>)[key];
  }, store);
}

/** 指标标签/赋分标签是否需随表单值重渲染 */
export function shouldSurveyFieldLabelUpdate(
  prev: unknown,
  cur: unknown,
  valuePath: (string | number)[],
  areaPath: (string | number)[],
  watchArea: boolean,
  extraPaths: (string | number)[][] = [],
): boolean {
  if (getStoreValueAtPath(prev, valuePath) !== getStoreValueAtPath(cur, valuePath)) {
    return true;
  }
  if (watchArea && getStoreValueAtPath(prev, areaPath) !== getStoreValueAtPath(cur, areaPath)) {
    return true;
  }
  for (const path of extraPaths) {
    if (getStoreValueAtPath(prev, path) !== getStoreValueAtPath(cur, path)) {
      return true;
    }
  }
  return false;
}

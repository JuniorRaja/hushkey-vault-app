/**
 * Processes items in batches using Promise.all to avoid unbounded parallelism.
 * Prevents memory pressure and UI jank from excessive concurrent crypto operations.
 * See: https://github.com/JuniorRaja/hushkey-vault-app/issues/36
 */
export async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 50
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = await Promise.all(items.slice(i, i + batchSize).map(fn));
    results.push(...batch);
  }
  return results;
}

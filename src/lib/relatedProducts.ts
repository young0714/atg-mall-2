/**
 * Fills a "You may also like" row. Each tier is a way of finding products,
 * strongest match first (same category, then nearby categories, then best-liked
 * overall). Pure orchestration, so it is easy to test: a tier is asked only for
 * what's still missing, never sees an id already chosen, and later tiers are
 * skipped once the row is full.
 */
export type RelatedTier<T extends { id: string }> = (excludeIds: string[], need: number) => Promise<T[]>;

export async function collectRelated<T extends { id: string }>(limit: number, tiers: RelatedTier<T>[], startExclude: string[] = []): Promise<T[]> {
  const chosen: T[] = [];
  const seen = new Set(startExclude);
  for (const tier of tiers) {
    if (chosen.length >= limit) break;
    const batch = await tier([...seen], limit - chosen.length);
    for (const item of batch) {
      if (seen.has(item.id)) continue; // a tier must never repeat or re-add the product being viewed
      seen.add(item.id);
      chosen.push(item);
      if (chosen.length >= limit) break;
    }
  }
  return chosen;
}

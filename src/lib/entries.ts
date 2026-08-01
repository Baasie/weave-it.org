/**
 * Pure rules over a list of entries.
 *
 * These lived in `collections.ts` until they could not be tested. That module
 * imports `astro:content`, which only exists inside an Astro build — so
 * anything sharing a file with it can only be exercised by building the whole
 * site, and neither of these functions needs a build to be worth checking.
 *
 * The split is the rule worth keeping: **a function that does not need Astro
 * does not import Astro.** `collections.ts` fetches and filters; this decides
 * ordering and grouping; `tests/unit/entries.test.mjs` runs in milliseconds
 * against plain objects.
 */

/** The shape either function needs. Deliberately minimal — anything narrower
 *  would couple these rules to one collection's schema. */
export interface Listed {
  id: string;
  data: { tags?: string[] };
}

/**
 * The entries either side of this one, in whatever order the list is already in.
 *
 * Takes the list rather than fetching it, so "previous" always means previous
 * *in the order the section shows* — newest-first for posts, by date for talks,
 * by `Order` for training. A helper that re-sorted here would quietly disagree
 * with the index page it sends people back to.
 *
 * Deliberately does not wrap around. The last post's "next" is nothing, and a
 * link back to the top of the archive pretending to be "next" is a small lie
 * that costs a reader a click to discover.
 */
export function neighbours<T extends { id: string }>(
  list: T[],
  id: string,
): { prev?: T; next?: T } {
  const i = list.findIndex((e) => e.id === id);
  if (i === -1) return {};
  return { prev: list[i - 1], next: list[i + 1] };
}

/**
 * Every tag in a set of entries, de-duplicated, most used first.
 *
 * Spelling is already settled by the sync (`src/lib/tags.ts`), so this counts
 * rather than normalises. Ties break alphabetically, which matters more than it
 * sounds: without it the filter's chip order depends on the order Notion
 * happened to return rows in, and the diff churns on every sync.
 */
export function tagOptions(entries: { data: { tags?: string[] } }[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.data.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);
}

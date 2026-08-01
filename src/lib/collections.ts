/**
 * Shared queries over the content collections.
 *
 * One place for "which entries are visible" and "what order do they go in", so
 * an index page and the feed and the sitemap cannot disagree about either.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../../site.config.ts';
// Re-exported so a page imports "the things about entries" from one place,
// while the pure half stays in a module that does not need Astro to run.
export { neighbours, tagOptions } from './entries.ts';

/**
 * Is this entry allowed to appear?
 *
 * **A draft renders under `astro dev` and on staging, and never on production.**
 * That is the safety story for `npm run sync:drafts`: content can be pulled out
 * of Notion and reviewed while it is still `Idea` or `Drafting`, on a real host
 * with real layout, without any of it reaching weave-it.org.
 *
 * Neither half is a flag anybody sets. `import.meta.env.DEV` is false in every
 * build that produces `dist/`, and `site.isStaging` is derived from the origin
 * being built rather than declared — see site.config.ts. A production build
 * cannot opt in to either, which is the property worth having: the failure mode
 * of a mistake is "staging looks like production", never "the drafts shipped".
 *
 * The consequence to keep in mind: **staging is not a preview of production.**
 * It shows more than production will. `isDraft` marks every entry that is only
 * there because of this, and the pages badge it.
 */
export const isVisible = (entry: { data: { status: string } }): boolean =>
  entry.data.status === 'Published' || import.meta.env.DEV || site.isStaging;

/** True when an entry is on the site only because this is a dev server. */
export const isDraft = (entry: { data: { status: string } }): boolean =>
  entry.data.status !== 'Published';

/** Blog posts, newest first. */
export async function posts(): Promise<CollectionEntry<'posts'>[]> {
  const all = (await getCollection('posts')).filter(isVisible);
  return all.sort((a, b) => date(b).getTime() - date(a).getTime());
}

const date = (e: CollectionEntry<'posts'>) => e.data.published ?? new Date(0);

/**
 * Talks, split by whether they have happened.
 *
 * Derived from the date and nothing else — there is no stored flag to get out
 * of step, which matters because a talk passing is not an edit and so triggers
 * no sync, no build and no deploy. A page that decides this at build time is
 * wrong the next morning; see docs/content-model.md.
 */
export async function talks(): Promise<{
  upcoming: CollectionEntry<'talks'>[];
  past: CollectionEntry<'talks'>[];
  all: CollectionEntry<'talks'>[];
}> {
  const all = (await getCollection('talks')).filter(isVisible);
  const now = Date.now();
  // A talk stays "upcoming" until the end of the day it is given, so the page
  // does not move it to the archive while somebody is still in the room.
  const endOfDay = (d?: Date) => (d ? new Date(d).setHours(23, 59, 59, 999) : 0);
  const upcoming = all
    .filter((t) => endOfDay(t.data.date) >= now)
    .sort((a, b) => (a.data.date?.getTime() ?? 0) - (b.data.date?.getTime() ?? 0));
  const past = all
    .filter((t) => endOfDay(t.data.date) < now)
    .sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
  return { upcoming, past, all };
}

/** Training courses, in the order Notion says, then by title. */
export async function training(): Promise<CollectionEntry<'training'>[]> {
  const all = (await getCollection('training')).filter(isVisible);
  return all.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** Learning journeys, in the order Notion says, then by title. */
export async function journeys(): Promise<CollectionEntry<'learningJourneys'>[]> {
  const all = (await getCollection('learningJourneys')).filter(isVisible);
  return all.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * The content model, as Astro sees it.
 *
 * Everything under `src/content/` is **generated** from Notion by
 * `scripts/sync-notion.ts` and never hand-edited. The markdown file name is the
 * slug, and therefore the URL. These schemas mirror the Notion databases; see
 * docs/content-model.md for the mapping and the reasoning behind the split.
 *
 * The schemas are deliberately strict about what a *page* needs and lenient
 * about everything else: a build must not fail because an editor has not
 * written a duration yet, but it must fail if a slug is missing, because that
 * is an address that cannot exist.
 */

/** Optional editorial overrides. The layout falls back to title / excerpt. */
const seo = {
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
};

/** What every collection carries, because every one of them is a page. */
const common = {
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  tags: z.array(z.string()).default([]),
  ...seo,
};

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      ...common,
      // Optional so a post drafted without one still builds; the archive falls
      // back to the file's own order. A published post always has one in
      // practice, because the import carried it from WordPress.
      published: z.coerce.date().optional(),
      // Only for something first published elsewhere. Absent is the normal case.
      canonicalUrl: z.url().optional(),
      featuredImage: image().optional(),
    }),
});

const talks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/talks' }),
  schema: ({ image }) =>
    z.object({
      ...common,
      // Upcoming versus past is derived from this and nothing else. There is no
      // second switch to get out of step — see docs/content-model.md.
      date: z.coerce.date().optional(),
      event: z.string().optional(),
      location: z.string().optional(),
      videoUrl: z.url().optional(),
      slidesUrl: z.url().optional(),
      featuredImage: image().optional(),
    }),
});

const training = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/training' }),
  schema: ({ image }) =>
    z.object({
      ...common,
      order: z.number().default(0),
      format: z.array(z.string()).default([]),
      duration: z.string().optional(),
      audience: z.string().optional(),
      // One outcome per line in Notion; split by the sync so the page can list
      // them and `Course` structured data can carry them.
      outcomes: z.array(z.string()).default([]),
      featuredImage: image().optional(),
    }),
});

const learningJourneys = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/learning-journeys' }),
  schema: ({ image }) =>
    z.object({
      ...common,
      order: z.number().default(0),
      summary: z.string().optional(),
      startingPoint: z.string().optional(),
      outcome: z.string().optional(),
      // `reference()` rather than a plain string, so a journey pointing at a
      // course that no longer exists fails the build instead of rendering a
      // dead link. The sync drops a relation whose target is not published and
      // says so, which is the case this must not be strict about.
      training: z.array(reference('training')).default([]),
      talks: z.array(reference('talks')).default([]),
      posts: z.array(reference('posts')).default([]),
      featuredImage: image().optional(),
    }),
});

export const collections = { posts, talks, training, learningJourneys };

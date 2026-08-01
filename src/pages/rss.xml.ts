/**
 * The feed.
 *
 * Posts only, and published only. A talk is an event rather than something to
 * read, and a subscriber who gets a notification for a course they cannot take
 * this month unsubscribes — so `isVisible` is not the whole rule here, the
 * collection is.
 *
 * `isVisible` still applies on top of it, which means a draft never reaches the
 * feed even under `astro dev`: the feed is the one surface where "visible
 * locally" and "sent to people" are not worth conflating.
 */
import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { posts } from '../lib/collections.ts';
import { site } from '../../site.config.ts';
import { excerpt } from '../lib/format.ts';

export const GET: APIRoute = async (context) => {
  const entries = (await posts()).filter((e) => e.data.status === 'Published');

  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    trailingSlash: true,
    items: entries.map((entry) => ({
      title: entry.data.title,
      link: `/blog/${entry.id}/`,
      description: excerpt(entry.body, entry.data.seoDescription, 300),
      pubDate: entry.data.published,
      categories: entry.data.tags,
    })),
    customData: `<language>${site.locale}</language>`,
  });
};

/**
 * `/llms-full.txt` — every published page's text, in one file.
 *
 * The largest of the three sizes (see `llms.txt`). It is generated from the
 * same bodies the pages render, so it cannot drift from them; there is no
 * second copy of the content anywhere in this repository, and this file is not
 * about to become the first.
 */
import type { APIRoute } from 'astro';
import { site } from '../../site.config.ts';
import { posts, talks, training, journeys } from '../lib/collections.ts';
import { markdownTwin } from '../lib/markdown-twin.ts';
import { formatDate } from '../lib/format.ts';

export const GET: APIRoute = async () => {
  const [allPosts, allTalks, allTraining, allJourneys] = await Promise.all([
    posts(),
    talks(),
    training(),
    journeys(),
  ]);

  const parts: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Everything published on ${site.url}, as one file. Generated ${new Date()
      .toISOString()
      .slice(0, 10)}.`,
    '',
  ];

  for (const e of allTraining) {
    parts.push(
      markdownTwin({
        title: e.data.title,
        path: `/training/${e.id}/`,
        body: e.body,
        collection: 'training',
        tags: e.data.tags,
        facts: [
          { label: 'Length', value: e.data.duration },
          { label: 'Format', value: e.data.format.join(', ') || undefined },
          { label: 'For', value: e.data.audience },
        ],
      }),
    );
  }

  for (const e of allJourneys) {
    parts.push(
      markdownTwin({
        title: e.data.title,
        path: `/learning-journeys/${e.id}/`,
        body: e.body,
        collection: 'learning-journeys',
        tags: e.data.tags,
        facts: [{ label: 'Summary', value: e.data.summary }],
      }),
    );
  }

  for (const e of allTalks.all) {
    parts.push(
      markdownTwin({
        title: e.data.title,
        path: `/talks/${e.id}/`,
        body: e.body,
        collection: 'talks',
        tags: e.data.tags,
        facts: [
          { label: 'Date', value: e.data.date ? formatDate(e.data.date) : undefined },
          { label: 'Event', value: e.data.event },
          { label: 'Location', value: e.data.location },
        ],
      }),
    );
  }

  for (const e of allPosts) {
    parts.push(
      markdownTwin({
        title: e.data.title,
        path: `/blog/${e.id}/`,
        body: e.body,
        collection: 'posts',
        tags: e.data.tags,
        facts: [
          {
            label: 'Published',
            value: e.data.published ? formatDate(e.data.published) : undefined,
          },
        ],
      }),
    );
  }

  return new Response(parts.join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

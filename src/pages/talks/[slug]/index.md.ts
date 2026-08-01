/** `/talks/<slug>/index.md` — the markdown twin of every talk. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { isVisible } from '../../../lib/collections.ts';
import { asMarkdown, markdownTwin } from '../../../lib/markdown-twin.ts';
import { formatDate } from '../../../lib/format.ts';

export const getStaticPaths = (async () => {
  const entries = (await getCollection('talks')).filter(isVisible);
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getCollection<'talks'>>>[number] };
  return asMarkdown(
    markdownTwin({
      title: entry.data.title,
      path: `/talks/${entry.id}/`,
      body: entry.body,
      collection: 'talks',
      tags: entry.data.tags,
      facts: [
        { label: 'Date', value: entry.data.date ? formatDate(entry.data.date) : undefined },
        { label: 'Event', value: entry.data.event },
        { label: 'Location', value: entry.data.location },
        { label: 'Recording', value: entry.data.videoUrl },
        { label: 'Slides', value: entry.data.slidesUrl },
      ],
    }),
  );
};

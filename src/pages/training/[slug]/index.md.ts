/** `/training/<slug>/index.md` — the markdown twin of every course. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { isVisible } from '../../../lib/collections.ts';
import { asMarkdown, markdownTwin } from '../../../lib/markdown-twin.ts';

export const getStaticPaths = (async () => {
  const entries = (await getCollection('training')).filter(isVisible);
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getCollection<'training'>>>[number] };
  const { data } = entry;
  return asMarkdown(
    markdownTwin({
      title: data.title,
      path: `/training/${entry.id}/`,
      body: entry.body,
      collection: 'training',
      tags: data.tags,
      facts: [
        { label: 'Length', value: data.duration },
        { label: 'Format', value: data.format.length ? data.format.join(', ') : undefined },
        { label: 'For', value: data.audience },
        {
          label: 'What you leave with',
          value: data.outcomes.length ? data.outcomes.join('; ') : undefined,
        },
      ],
    }),
  );
};

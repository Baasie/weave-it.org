/** `/learning-journeys/<slug>/index.md` — the markdown twin of every journey. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { isVisible } from '../../../lib/collections.ts';
import { asMarkdown, markdownTwin } from '../../../lib/markdown-twin.ts';

export const getStaticPaths = (async () => {
  const entries = (await getCollection('learningJourneys')).filter(isVisible);
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as {
    entry: Awaited<ReturnType<typeof getCollection<'learningJourneys'>>>[number];
  };
  const { data } = entry;
  return asMarkdown(
    markdownTwin({
      title: data.title,
      path: `/learning-journeys/${entry.id}/`,
      body: entry.body,
      collection: 'learning-journeys',
      tags: data.tags,
      facts: [
        { label: 'Summary', value: data.summary },
        { label: 'Start here if', value: data.startingPoint },
        { label: 'You will end up', value: data.outcome },
      ],
    }),
  );
};

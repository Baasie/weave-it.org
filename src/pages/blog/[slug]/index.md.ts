/** `/blog/<slug>/index.md` — the markdown twin of every post. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { isVisible } from '../../../lib/collections.ts';
import { asMarkdown, markdownTwin } from '../../../lib/markdown-twin.ts';
import { formatDate } from '../../../lib/format.ts';

export const getStaticPaths = (async () => {
  const entries = (await getCollection('posts')).filter(isVisible);
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getCollection<'posts'>>>[number] };
  return asMarkdown(
    markdownTwin({
      title: entry.data.title,
      path: `/blog/${entry.id}/`,
      body: entry.body,
      collection: 'posts',
      tags: entry.data.tags,
      facts: [
        {
          label: 'Published',
          value: entry.data.published ? formatDate(entry.data.published) : undefined,
        },
      ],
    }),
  );
};

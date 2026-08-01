/**
 * `/llms.txt` — the site's contents, as a list, for something reading without a
 * browser.
 *
 * A map rather than the material: title, address and one line of what it is, so
 * a reader can decide what to fetch. `llms-full.txt` is the whole thing, and
 * every page also has its own `index.md` twin — three sizes, because "give me
 * everything" and "tell me what you have" are different questions.
 *
 * `robots.txt` allows the AI crawlers by name and says why; this is the other
 * half of that decision. Publishing an index is what makes the allow useful.
 */
import type { APIRoute } from 'astro';
import { site } from '../../site.config.ts';
import { posts, talks, training, journeys } from '../lib/collections.ts';
import { excerpt, formatDate } from '../lib/format.ts';

const abs = (path: string) => new URL(path, site.url).toString();

export const GET: APIRoute = async () => {
  const [allPosts, allTalks, allTraining, allJourneys] = await Promise.all([
    posts(),
    talks(),
    training(),
    journeys(),
  ]);

  const line = (title: string, path: string, note: string) =>
    `- [${title}](${abs(path)})${note ? `: ${note}` : ''}`;

  const section = (heading: string, lines: string[]) =>
    lines.length ? [`## ${heading}`, '', ...lines, ''] : [];

  const text = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    'Written and taught by ' +
      `${site.author.name}. Every page below is also available as markdown at ` +
      'its own address with `index.md` appended, and the whole site as ' +
      `${abs('/llms-full.txt')}.`,
    '',
    ...section(
      'Training',
      allTraining.map((e) =>
        line(e.data.title, `/training/${e.id}/`, excerpt(e.body, e.data.seoDescription, 140)),
      ),
    ),
    ...section(
      'Learning journeys',
      allJourneys.map((e) =>
        line(
          e.data.title,
          `/learning-journeys/${e.id}/`,
          excerpt(e.body, e.data.summary ?? e.data.seoDescription, 140),
        ),
      ),
    ),
    ...section(
      'Talks',
      allTalks.all.map((e) =>
        line(
          e.data.title,
          `/talks/${e.id}/`,
          [e.data.event, e.data.date ? formatDate(e.data.date) : null]
            .filter(Boolean)
            .join(', '),
        ),
      ),
    ),
    ...section(
      'Blog',
      allPosts.map((e) =>
        line(
          e.data.title,
          `/blog/${e.id}/`,
          [
            e.data.published ? formatDate(e.data.published) : null,
            excerpt(e.body, e.data.seoDescription, 140),
          ]
            .filter(Boolean)
            .join(' — '),
        ),
      ),
    ),
  ].join('\n');

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

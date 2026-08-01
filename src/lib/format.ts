/**
 * How this site writes a date, and how it gets a summary out of a body.
 *
 * Both are here rather than in a template because a card and a detail page and
 * the feed must not disagree about either — two spellings of the same date is
 * the kind of thing nobody notices until it is in a screenshot.
 */
import { site } from '../../site.config.ts';

/**
 * A date as a reader sees it: `14 March 2024`.
 *
 * Rendered in the site's timezone, not the builder's. A talk on the 1st stored
 * as midnight UTC is the 1st in Amsterdam and the 28th of last month in Denver,
 * and a CI runner is somewhere neither of us chose.
 */
export const formatDate = (d: Date): string =>
  new Intl.DateTimeFormat(site.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: site.timezone,
  }).format(d);

/** The same date as `2024-03-14`, for `datetime` and structured data. */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * A summary for a card, a meta description or a feed item.
 *
 * Prefers what an editor wrote in Notion. Falls back to the opening prose,
 * because a card with no summary is a card that says nothing — and skips the
 * markup the fallback would otherwise pick up first: an image, a heading, a
 * "back to all workshops" link, a bare video URL. Those are the top of most of
 * the imported training pages.
 */
export function excerpt(body: string | undefined, written: string | undefined, max = 200): string {
  if (written?.trim()) return written.trim();
  if (!body) return '';

  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    // A paragraph, and specifically not the things that tend to open an
    // imported page: a heading, an image, a quote, a table, a list, a bare
    // video URL, or the "<< back to all workshops" link the Divi pages start
    // with. A summary lifted from a bullet reads as a fragment, because it is.
    .find(
      (block) =>
        block.length > 60 &&
        !/^(#|!|>|\||-|\*|\d+\.)\s?/.test(block) &&
        !/^\[?<{2}/.test(block) &&
        !/^\[[^\]]*\]\(/.test(block) &&
        !/^https?:\/\/\S+$/.test(block),
    );
  if (!paragraph) return '';

  const plain = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links keep their text
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= max) return plain;
  // Cut at a word, not mid-word, and never leave a dangling comma before the
  // ellipsis.
  return `${plain.slice(0, plain.lastIndexOf(' ', max)).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * The markdown twin of a content page.
 *
 * Every content page is served a second time as `.../index.md`, advertised from
 * the HTML with `<link rel="alternate" type="text/markdown">`. It costs almost
 * nothing — the markdown is what we already hold — and it means anything
 * reading this site without a browser gets the text rather than a layout.
 *
 * The body is emitted as it came out of Notion, with two changes and no more:
 * the front matter becomes a readable header, and image paths are rewritten to
 * absolute URLs that actually resolve. Rewriting the prose here would make this
 * a second, divergent copy of the page rather than a twin of it.
 *
 * **The image rewrite is not cosmetic.** A body written by the sync points at
 * `./_assets/x.jpg`, which is a path inside `src/` — it does not exist in the
 * built site, because Astro hashes and re-encodes every image it processes. A
 * twin that emitted the raw path would hand every reader a 404, so the built
 * URL is looked up from the same module graph the pages use.
 */
import { site } from '../../site.config.ts';

/**
 * Every content image, keyed by its path under `src/`.
 *
 * `eager` because an endpoint has no opportunity to await a lazy import per
 * link, and this is metadata rather than image data — the files themselves are
 * emitted by the build either way.
 */
const assets = import.meta.glob<{ default: { src: string } }>(
  '/src/content/**/_assets/*.{png,jpg,jpeg,gif,webp,avif,svg}',
  { eager: true },
);

/** `./_assets/x.jpg` in a post body → the absolute URL of the built image. */
function resolveAsset(collection: string, relative: string): string | undefined {
  const key = `/src/content/${collection}/${relative.replace(/^\.\//, '')}`;
  const found = assets[key];
  return found ? new URL(found.default.src, site.url).toString() : undefined;
}

export interface TwinFact {
  label: string;
  value: string | undefined;
}

export function markdownTwin(opts: {
  title: string;
  path: string;
  body: string | undefined;
  /** The `src/content/` directory the body's `./_assets/` is relative to. */
  collection: string;
  facts?: TwinFact[];
  tags?: string[];
}): string {
  const facts = (opts.facts ?? []).filter((f) => f.value);
  const head = [
    `# ${opts.title}`,
    '',
    ...facts.map((f) => `**${f.label}:** ${f.value}`),
    ...(opts.tags?.length ? [`**Tags:** ${opts.tags.join(', ')}`] : []),
    `**Source:** ${new URL(opts.path, site.url).toString()}`,
    '',
    '---',
    '',
  ];

  // Both markdown images and markdown links, because the sync writes a figure's
  // link and its image with the same relative path.
  const body = (opts.body ?? '').replace(
    /\((\.\/_assets\/[^)\s]+)\)/g,
    (whole, rel: string) => {
      const url = resolveAsset(opts.collection, rel);
      return url ? `(${url})` : whole;
    },
  );

  return `${head.join('\n')}${body.trim()}\n`;
}

/** The response every twin endpoint returns. */
export const asMarkdown = (text: string): Response =>
  new Response(text, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });

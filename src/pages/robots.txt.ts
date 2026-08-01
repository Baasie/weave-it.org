/**
 * `robots.txt`, generated rather than static.
 *
 * It was a file in `public/` until staging started serving drafts, and it could
 * not stay one: a staging site that carries production's "Allow: /" is a
 * complete, crawlable duplicate of weave-it.org, containing work nobody has
 * published yet. Search engines resolve duplicates by picking one, and there is
 * no guarantee they pick the one you wanted — a bad thing to discover during a
 * migration whose whole promise is that no address changes.
 *
 * So the rule is inverted by origin: production says yes to everyone, anything
 * that is not production says no to everyone. `site.isStaging` is derived from
 * the origin being built and cannot be set by hand — see site.config.ts.
 */
import type { APIRoute } from 'astro';
import { PRODUCTION_URL, site } from '../../site.config.ts';

const PRODUCTION = `# Weave IT — a consultancy whose work is meant to be found, read and cited.
#
# AI crawlers are allowed on purpose, and that is a decision, not a default.
# The whole point of publishing eight years of writing on collaborative
# software design is that people find it, and answer engines are now part of
# how people find things. Someone asking an assistant "how do I facilitate a
# domain modelling decision" should be told, and told whose answer it is.
#
# This sits alongside "all rights reserved" in LICENSE-CONTENT without
# contradiction: that is a statement about republishing, not about reading.

User-agent: *
Allow: /

# Named explicitly so the intent survives a future default-deny convention.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

# Note: ?tag= views are deliberately NOT disallowed. The 57 legacy WordPress
# tag archives 301 onto them, and blocking the destination would throw away the
# redirect. Every page canonicalises to its clean path instead, so the filtered
# views consolidate into the index rather than competing with it.

Sitemap: ${PRODUCTION_URL}/sitemap-index.xml
`;

const STAGING = `# Staging. Not the site.
#
# This build serves unpublished drafts and is a duplicate of ${PRODUCTION_URL}.
# Nothing here should be crawled, indexed or cited.
#
# Every page also carries a noindex meta tag, because robots.txt asks a crawler
# not to *fetch* a page and says nothing about whether an already-known URL may
# be listed. The two do different jobs and staging wants both.

User-agent: *
Disallow: /
`;

export const GET: APIRoute = () =>
  new Response(site.isStaging ? STAGING : PRODUCTION, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './site.config.ts';

// https://astro.build/config
export default defineConfig({
  // Canonical origin — used by the sitemap, the feed and every canonical URL.
  // It lives in site.config.ts because the scripts and the tests need it too,
  // and two copies of an origin is one copy that will be wrong.
  site: site.url,

  // Every URL ends in a slash, so the addresses inherited from WordPress —
  // which all carry one — never cost a 301. A test enforces it.
  trailingSlash: 'always',

  integrations: [
    sitemap({
      // `/410/` is the body of an error response, not a page anyone should be
      // sent to from search. `/search/` is a tool for people already here, and
      // an empty results page is the last thing worth offering someone as an
      // answer; it is `noindex` for the same reason, and a test checks the two
      // agree.
      filter: (page) => !/\/(410|search)\/$/.test(page),
    }),
  ],
});

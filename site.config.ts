/**
 * Everything that makes this site *this* site.
 *
 * The seam between the reusable mechanics and the site. `docs/template.md`
 * names the files on each side of it; this is the file a second site would
 * rewrite, and almost the only one.
 *
 * The rule: anything a different site would have a different value for lives
 * here. Anything a different site would want *identical* lives in the scripts,
 * the workflows and `src/lib/`, and reads its values from here.
 *
 * Kept as TypeScript rather than JSON so the shape is checked and each field
 * can say why it exists. Imported by the Astro build, by the scripts under
 * `scripts/`, and by the tests.
 */

/** A section of the site that has an index page and, usually, detail pages. */
export interface Section {
  /** The first path segment, without slashes. `/blog/` → `blog`. */
  readonly path: string;
  /** What the navigation and the breadcrumbs call it. */
  readonly label: string;
  /** The `src/content/` collection behind it, if it has one. */
  readonly collection?: string;
  /** Shown in the header nav, in this order. */
  readonly inNav: boolean;
}

export const site = {
  /** Canonical origin. The sitemap, the feed and every canonical URL use it. */
  url: 'https://weave-it.org',

  /** The organisation, for `Organization` structured data and the footer. */
  name: 'Weave IT',
  /** Under ~60 characters: it is the home page's `<title>`. */
  title: 'Weave IT — Where every voice shapes the software',
  tagline: 'Where every voice shapes the software',
  /** 150–160 characters. The home page's meta description and the feed's. */
  description:
    'Collaborative software design, Domain-Driven Design and architecture ' +
    'decision-making — consultancy, training and talks by Kenny Baas-Schwegler.',

  /** en-GB throughout: the copy is British English and the dates follow. */
  locale: 'en-GB',
  language: 'en',
  /** Where the training and talks happen, for date rendering. */
  timezone: 'Europe/Amsterdam',

  /**
   * The person behind the site.
   *
   * Weave IT is one practitioner rather than a community, so a `Person` is the
   * publisher and the author of everything. This is the difference that most
   * changes the structured data compared with a multi-author site.
   */
  author: {
    name: 'Kenny Baas-Schwegler',
    /** `sameAs` on the `Person` node, and the footer icons, in this order. */
    links: [] as { label: string; url: string }[],
  },

  /**
   * The sections, in navigation order.
   *
   * `build-redirects.mjs` reads this to know which paths are ours, and
   * `verify-live.mjs` groups its sample by it, so adding a section here is
   * most of what adding a section costs.
   */
  sections: [
    { path: 'consultancy', label: 'Consultancy', inNav: true },
    { path: 'training', label: 'Training', collection: 'training', inNav: true },
    // The one section with no WordPress ancestor, so it inherits no addresses
    // and is free to be designed. It sits after Training because it is a route
    // *into* the courses rather than a thing beside them.
    {
      path: 'learning-journeys',
      label: 'Learning journeys',
      collection: 'learningJourneys',
      inNav: true,
    },
    { path: 'talks', label: 'Talks', collection: 'talks', inNav: true },
    { path: 'blog', label: 'Blog', collection: 'posts', inNav: true },
    { path: 'contact', label: 'Contact', inNav: true },
  ] as const satisfies readonly Section[],

  /**
   * Analytics, if configured. Both values appear in the page source of every
   * page, so they are repository *variables* rather than secrets — hiding them
   * would only make them harder to change. Unset means no tag at all, which is
   * what a local build and a fork get.
   */
  analytics: {
    src: import.meta.env?.PUBLIC_ANALYTICS_SRC ?? process.env.PUBLIC_ANALYTICS_SRC ?? '',
    domain: import.meta.env?.PUBLIC_ANALYTICS_DOMAIN ?? process.env.PUBLIC_ANALYTICS_DOMAIN ?? '',
  },
} as const;

export type Site = typeof site;
export default site;

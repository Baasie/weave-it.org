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

/**
 * The one production origin, and the only place it is written.
 *
 * Nothing else in the repository may hard-code it, because `isStaging` below is
 * defined as "not this" — and a second copy of this string is how a staging
 * build would eventually be mistaken for a production one.
 */
export const PRODUCTION_URL = 'https://weave-it.org';

/** What origin is this build for? `SITE_URL` in CI; production by default. */
const buildUrl =
  (import.meta.env?.SITE_URL ?? process.env.SITE_URL ?? '').trim() || PRODUCTION_URL;

export const site = {
  /**
   * Canonical origin. The sitemap, the feed and every canonical URL use it.
   *
   * Read from `SITE_URL` so a staging build canonicalises to *itself* rather
   * than to production. A staging site whose pages all canonicalise to
   * weave-it.org is asking Google to treat the real site's URLs as duplicates
   * of a half-finished one, which is the exact failure a migration cannot
   * afford.
   */
  url: buildUrl,

  /**
   * True for any build that is not for the production origin.
   *
   * **Defined by what it is not, deliberately.** Drafts are visible here, so
   * this flag decides whether unpublished writing reaches a public URL — and
   * the safe direction has to be the default. There is no `STAGING=true` to
   * set, because a variable somebody can set is a variable somebody can set in
   * the wrong workflow; the only way to get drafts is to build for an origin
   * that is provably not weave-it.org. A production build cannot opt in.
   */
  isStaging: buildUrl !== PRODUCTION_URL,

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
    /** `sameAs` on the `Person` node, and the footer icons, in this order.
     *
     * Carried across from the live site's footer. They earn their place twice:
     * `sameAs` is how a search engine knows the Kenny writing here is the Kenny
     * on those profiles, which is most of what makes an entity resolvable. */
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/kenny-baas/' },
      { label: 'Mastodon', url: 'https://mastodon.social/@kenny_baas' },
      { label: 'Bluesky', url: 'https://bsky.app/profile/kenny.weave-it.org' },
      { label: 'Instagram', url: 'https://www.instagram.com/kenny_baas/' },
    ] as { label: string; url: string }[],
  },

  /**
   * How to reach a person, rather than a page.
   *
   * Here rather than typed into the contact page because the `Person` and
   * `Organization` structured data want the same values, and an email address
   * that appears twice is an email address that gets changed once.
   */
  contact: {
    email: 'kenny@weave-it.org',
    /** E.164 for `tel:`, and the readable form for the page to print. */
    phone: '+31622264975',
    phoneLabel: '+31 6 2226 4975',
    /** Where the "schedule a call" button goes. */
    scheduling: 'https://app.reclaim.ai/m/kenny-weave-it/schedule-an-online-call',
    area: 'Amsterdam, the Netherlands',
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

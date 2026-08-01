/**
 * All structured data and title/description rules, in one place.
 *
 * Generated from properties we already hold, never hand-authored in Notion.
 * One helper per kind, so a type is described the same way wherever it appears,
 * and `BaseLayout` emits the single `@graph` it is handed.
 *
 * Unit-tested precisely so it can be rewritten: the tests say what the output
 * must still *mean*, not how this file is arranged. Keep it free of
 * `astro:assets` — anything needing a build to run belongs in its own module,
 * or this stops being testable at all.
 */
import { site } from '../../site.config.ts';

export interface Crumb {
  name: string;
  url: string;
}

/** Absolute URL for a site-relative path. Every structured-data `@id` is one. */
export const abs = (path: string): string => new URL(path, site.url).toString();

/**
 * House style for titles.
 *
 * Detail pages carry **no brand suffix**. The budget is ~60 characters before a
 * search result truncates, and a suffix spends 15 of them on a word the reader
 * can already see in the URL. Indexes keep it, because "Talks" alone says
 * nothing about whose.
 */
export function pageTitle(title: string, opts: { suffix?: boolean } = {}): string {
  if (!opts.suffix) return title;
  return `${title} — ${site.name}`;
}

/**
 * The `Person` behind the site.
 *
 * This is the sharpest structural difference from a community site, where the
 * publisher is an `Organization` and authorship varies per page. Here one
 * person writes everything, so the same node is author, publisher and the
 * subject of the about page — declared once and referenced by `@id` everywhere
 * else, rather than repeated with slightly different fields each time.
 */
export function person() {
  return {
    '@type': 'Person',
    '@id': abs('/#person'),
    name: site.author.name,
    url: site.url,
    ...(site.author.links.length
      ? { sameAs: site.author.links.map((l) => l.url) }
      : {}),
  };
}

export function organization() {
  return {
    '@type': 'Organization',
    '@id': abs('/#organization'),
    name: site.name,
    url: site.url,
    description: site.tagline,
    founder: { '@id': abs('/#person') },
  };
}

/**
 * Breadcrumbs for every page but the home page.
 *
 * Built from `site.sections` so a crumb can never call a section something the
 * navigation does not — the two drift the moment they are typed separately.
 */
export function breadcrumbs(crumbs: Crumb[]) {
  if (!crumbs.length) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', url: '/' }, ...crumbs].map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.url),
    })),
  };
}

/** The crumb trail for a path, derived rather than passed in. */
export function crumbsFor(path: string): Crumb[] {
  const seg = path.split('/').filter(Boolean);
  if (!seg.length) return [];
  const section = site.sections.find((s) => s.path === seg[0]);
  if (!section) return [];
  return [{ name: section.label, url: `/${section.path}/` }];
}

/** An index page, and what it lists. */
export function collectionPage(opts: {
  path: string;
  name: string;
  description: string;
  items: { title: string; path: string }[];
}) {
  return {
    '@type': 'CollectionPage',
    '@id': abs(opts.path),
    url: abs(opts.path),
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': abs('/#website') },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.title,
        url: abs(it.path),
      })),
    },
  };
}

/** A blog post. */
export function postJsonLd(opts: {
  path: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  keywords?: string[];
}) {
  return {
    '@type': 'BlogPosting',
    '@id': abs(opts.path),
    url: abs(opts.path),
    headline: opts.title,
    description: opts.description,
    datePublished: opts.datePublished,
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    author: { '@id': abs('/#person') },
    publisher: { '@id': abs('/#organization') },
    ...(opts.keywords?.length ? { keywords: opts.keywords } : {}),
  };
}

/**
 * A talk.
 *
 * `Event` rather than `Article`, because a talk is a thing that happened at a
 * place on a date — that is what makes "has Kenny spoken about X" answerable.
 * A past talk keeps its `Event` and gains `eventStatus`; it does not become a
 * different type once the date passes, which would make every talk page change
 * shape on a day nobody deployed.
 */
export function talkJsonLd(opts: {
  path: string;
  title: string;
  description: string;
  date?: string;
  event?: string;
  location?: string;
  videoUrl?: string;
}) {
  const past = opts.date ? new Date(opts.date) < new Date() : false;
  return {
    '@type': 'Event',
    '@id': abs(opts.path),
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    ...(opts.date ? { startDate: opts.date } : {}),
    eventStatus: `https://schema.org/Event${past ? 'Scheduled' : 'Scheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(opts.location
      ? { location: { '@type': 'Place', name: opts.location } }
      : {}),
    ...(opts.event ? { superEvent: { '@type': 'Event', name: opts.event } } : {}),
    performer: { '@id': abs('/#person') },
    organizer: { '@id': abs('/#organization') },
    ...(opts.videoUrl
      ? { recordedIn: { '@type': 'VideoObject', url: opts.videoUrl } }
      : {}),
  };
}

/**
 * A training course.
 *
 * `Course` is the type search engines actually surface for this, and it is the
 * one page type on this site with a commercial job to do. `provider` is the
 * organisation and `instructor` the person, which are genuinely different
 * claims even when one person is both.
 */
export function trainingJsonLd(opts: {
  path: string;
  title: string;
  description: string;
  duration?: string;
  mode?: 'onsite' | 'online' | 'blended';
}) {
  return {
    '@type': 'Course',
    '@id': abs(opts.path),
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    provider: { '@id': abs('/#organization') },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: opts.mode ?? 'blended',
      ...(opts.duration ? { courseWorkload: opts.duration } : {}),
      instructor: { '@id': abs('/#person') },
    },
  };
}

/**
 * A learning journey.
 *
 * `HowTo` rather than `Course`, and the distinction is the whole point: a course
 * is a thing you buy, a journey is a route you follow — mostly through material
 * that is free and not all of it ours. Typing it as a `Course` would claim we
 * are selling the reading list.
 *
 * The steps come from the page body, so they are passed in rather than read from
 * a property. An empty list still produces a valid node; a journey being drafted
 * should not emit broken markup.
 */
export function journeyJsonLd(opts: {
  path: string;
  title: string;
  description: string;
  steps?: { name: string; text?: string; url?: string }[];
}) {
  const steps = opts.steps ?? [];
  return {
    '@type': 'HowTo',
    '@id': abs(opts.path),
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    author: { '@id': abs('/#person') },
    publisher: { '@id': abs('/#organization') },
    ...(steps.length
      ? {
          step: steps.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.name,
            ...(s.text ? { text: s.text } : {}),
            ...(s.url ? { url: abs(s.url) } : {}),
          })),
        }
      : {}),
  };
}

/** The `WebSite` node, on every page, so the graph has one root. */
export function website() {
  return {
    '@type': 'WebSite',
    '@id': abs('/#website'),
    url: site.url,
    name: site.name,
    description: site.tagline,
    inLanguage: site.locale,
    publisher: { '@id': abs('/#organization') },
  };
}

/** Assemble the single `@graph` a page emits. Nulls are dropped. */
export function graph(...nodes: (object | null)[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}

/** Does the code still match the brief?
 *
 * AGENTS.md carries eight rules. This file is where one becomes executable. It
 * reads the *source*, not `dist`, because these are claims about how the
 * repository is written rather than about what it renders.
 *
 * **Every test here names the rule it enforces**, and AGENTS.md names this file
 * back. If you add a rule there, either add a test here or write "nobody"
 * beside it: a rule that sounds enforced and is not costs more than an honest
 * habit, because it gets assumed.
 *
 * That is not hypothetical here. Until this file existed, `.claude/skills/
 * review-change/SKILL.md` told every reviewer — human and model — "`tests/
 * conformance.test.mjs` already enforces … **do not re-check those**", and the
 * file did not exist. Four rules were unchecked *and* explicitly excluded from
 * review: a hole with a sign over it saying "covered".
 *
 * What this cannot see is additive bias — a component that should have reused
 * `EntryCard`, a helper duplicating one in `src/lib/`. That lives in a diff,
 * and needs a reader. See the review skill.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const read = (f) => readFileSync(f, 'utf8');

const SRC = walk('src').filter((f) => !f.startsWith('src/content/'));
const TESTS = walk('tests').filter((f) => f.endsWith('.mjs'));
const styleSheets = SRC.filter((f) => f.startsWith('src/styles/') && f.endsWith('.css'));
const components = SRC.filter((f) => f.endsWith('.astro'));

/** Every class the stylesheets and component `<style>` blocks define. */
const styledClasses = (() => {
  const found = new Set();
  const collect = (css) => {
    // Comments first: `/* see EntryCard.astro */` would otherwise register
    // `astro` as a class, and then every `f.endsWith('.astro')` in a test reads
    // as a styling selector.
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const m of bare.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) found.add(m[1]);
  };
  for (const f of styleSheets) collect(read(f));
  for (const f of components) {
    for (const block of read(f).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) collect(block[1]);
  }
  return found;
})();

describe('AGENTS.md rule 5 — tests select behaviour, not styling', () => {
  test('no test selects a class the stylesheets define', () => {
    // The failure this prevents: renaming a class during a restyle turns a
    // behavioural test red for a reason that has nothing to do with behaviour,
    // and the next person "fixes" the test rather than the styling.
    //
    // `js-*` is exempt on purpose — those classes exist *for* behaviour and are
    // documented as a test surface in docs/testing.md.
    const offences = [];
    for (const f of TESTS) {
      read(f).split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // a comment may name a class
        for (const q of line.matchAll(/(['"`])([^'"`\n]*\.[-\w][-\w]*[^'"`\n]*)\1/g)) {
          const selector = q[2];
          if (!/^[.#[\w:>\s+~()="'-]+$/.test(selector)) continue; // not a selector
          // `'.astro'`, `'.css'` — a bare extension is a file suffix, not a
          // selector, and tests are full of them.
          if (/^\.[a-z0-9]{1,6}$/i.test(selector)) continue;
          for (const c of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
            const cls = c[1];
            if (cls.startsWith('js-')) continue;
            if (!styledClasses.has(cls)) continue;
            offences.push(`${f}:${i + 1}  selects .${cls}  →  ${line.trim().slice(0, 88)}`);
          }
        }
      });
    }
    assert.deepEqual(offences, [],
      `tests coupled to styling classes — give the element a [data-test] hook instead:\n${offences.join('\n')}`);
  });

  test('the hooks tests rely on are actually in the source', () => {
    // The other direction, and the one that rots silently: a `[data-test]` hook
    // deleted from a component leaves a test selecting nothing, which for a
    // "count the matches" assertion can still pass.
    const hooks = new Set();
    for (const f of SRC) {
      const src = read(f);
      for (const m of src.matchAll(/data-test="([\w-]+)"/g)) hooks.add(m[1]);
      // A hook can be conditional — `data-test={x ? 'draft' : undefined}` — so
      // take every string literal inside a `data-test={…}` expression too.
      for (const e of src.matchAll(/data-test=\{([^}]*)\}/g)) {
        for (const lit of e[1].matchAll(/['"]([\w-]+)['"]/g)) hooks.add(lit[1]);
      }
    }
    const missing = new Set();
    for (const f of TESTS) {
      for (const m of read(f).matchAll(/data-test=\\?["']([\w-]+)/g)) {
        if (!hooks.has(m[1])) {
          missing.add(`${basename(f)} selects [data-test="${m[1]}"], which no component emits`);
        }
      }
    }
    assert.deepEqual([...missing], []);
  });
});

describe('AGENTS.md rule 3 — the brand is the fixed point', () => {
  test('brand colour lives in tokens.css, not in a component', () => {
    // Neutral overlays are allowed to be literal: pure black and white are not
    // brand, and `rgba(255,255,255,…)` is a scrim rather than a colour choice.
    // Anything else hard-coded is a second opinion about the palette — and on
    // this site the palette is the one thing a component may not have an
    // opinion about, because whether text on it is readable was decided by
    // measurement. See the contrast test.
    const NEUTRAL = /^#(fff|ffffff|000|000000)$/i;
    const offences = [];
    for (const f of [...components, ...styleSheets]) {
      if (f === 'src/styles/tokens.css') continue;
      read(f).split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
          if (NEUTRAL.test(m[0])) continue;
          offences.push(`${f}:${i + 1}  ${m[0]}  →  use a token from tokens.css`);
        }
      });
    }
    assert.deepEqual(offences, [], `colour literals outside tokens.css:\n${offences.join('\n')}`);
  });
});

describe('additive bias — what nobody deleted', () => {
  test('every component is used somewhere', () => {
    // The cheapest bloat brake there is. A component nothing imports is either
    // a rename that left its original behind or a good idea that lost, and both
    // read as "the codebase does this four ways" to the next person.
    const imports = SRC.filter((f) => f.endsWith('.astro') || f.endsWith('.ts'))
      .map(read).join('\n');
    const orphans = components
      .filter((f) => f.startsWith('src/components/'))
      .filter((f) => !new RegExp(`/${basename(f)}['"]`).test(imports))
      .map((f) => `${f} is imported by nothing`);
    assert.deepEqual(orphans, []);
  });

  test('every exported helper is used outside its own file', () => {
    // An export used only where it is defined is API surface nobody asked for:
    // it invites a second caller, and it has to be understood before it can be
    // changed. Make it module-private, and export it when a second caller
    // actually arrives.
    //
    // Runtime code only — a type in an exported signature is legitimately
    // exported even when nothing imports it by name, and flagging those would
    // teach people to ignore this test.
    const libs = SRC.filter((f) => f.startsWith('src/lib/') && extname(f) === '.ts');
    const elsewhere = [...SRC, ...TESTS, ...walk('scripts')]
      .filter((f) => /\.(ts|astro|mjs)$/.test(f));
    const unused = [];
    for (const f of libs) {
      const others = elsewhere.filter((o) => o !== f).map(read).join('\n');
      for (const m of read(f).matchAll(/^export (?:const|(?:async )?function) (\w+)/gm)) {
        if (!new RegExp(`\\b${m[1]}\\b`).test(others)) {
          unused.push(`${f} exports ${m[1]}, which nothing outside it uses`);
        }
      }
    }
    assert.deepEqual(unused, []);
  });
});

describe('AGENTS.md rule 8 — the template seam', () => {
  /**
   * This repository is a reusable publishing pipeline *and* one site.
   * docs/template.md draws the line, and rule 8 admitted the line was held
   * "weakly — nothing yet fails a build for the wrong one". These two tests are
   * that machine.
   */
  const manifest = read('docs/template.md');

  /** File names out of one of the manifest's two tables. */
  const tableFiles = (heading) => {
    const section = manifest.split(heading)[1]?.split('\n## ')[0] ?? '';
    return [...section.matchAll(/^\| `([^`]+)`/gm)]
      .map((m) => m[1])
      .filter((f) => !f.includes('*') && !f.includes(' ') && !f.includes(','));
  };

  /**
   * Scoped to the *generic* table, and that scoping is the whole test.
   * Reading every row in the file sweeps up the site-specific table too — where
   * `site.config.ts` naming Kenny is the entire point of the file.
   */
  const generic = tableFiles('## Generic — copy as-is');

  test('every file the manifest names still exists', () => {
    // The manifest is what phase 8 copies from. MIGRATION.md promises it is
    // "kept current as we go so this phase is a copy rather than an
    // archaeology" — and a manifest naming files that were renamed months ago
    // is exactly the archaeology it was meant to prevent. It named five when
    // this test was written.
    const named = [...generic, ...tableFiles('## Site-specific — expect to rewrite')];
    const gone = named.filter((f) => !existsSync(f));
    assert.deepEqual(gone, [],
      `docs/template.md names files that do not exist:\n  ${gone.join('\n  ')}\n` +
      'Rename them in the manifest, or the phase 8 extraction starts with a lie.');
  });

  test('a generic file names nothing about this site', () => {
    // The rule from docs/template.md, in one sentence: a generic file may not
    // hard-code a hostname, a brand or a person. This is the failure that does
    // not announce itself — the file keeps working perfectly on *this* site,
    // and only the second site finds out.
    //
    // Comments are exempt: explaining why something is generic often means
    // naming the site it came from.
    const SITE_WORDS = /\b(weave-?it|kualo|baas|kenny|virtualddd)\b/i;
    const offences = [];
    for (const f of generic) {
      read(f).split('\n').forEach((line, i) => {
        const code = line.replace(/(\/\/|#).*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
        if (/^\s*(\*|<!--)/.test(line)) return;
        if (SITE_WORDS.test(code)) {
          offences.push(`${f}:${i + 1}  ${line.trim().slice(0, 80)}`);
        }
      });
    }
    assert.deepEqual(offences, [],
      `docs/template.md calls these files generic, but they name this site:\n${offences.join('\n')}\n` +
      'Read the value from site.config.ts, or move the file to the site-specific table.');
  });
});

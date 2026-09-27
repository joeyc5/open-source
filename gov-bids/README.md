# gov-bids

Free search for open government contracts and grants. It pulls federal contracts
from SAM.gov, federal grants from Grants.gov, and California state bids from Cal
eProcure into one Postgres table, then serves them as a fast, indexable Next.js
site. No accounts, no paywall.

**Live:** [gov-bids.vercel.app](https://gov-bids.vercel.app)

## Why it exists

Paid bid aggregators charge small contractors for data the government publishes
for free. The free data is hard to use directly:

- SAM.gov's public API key is capped at about ten requests a day, which rules it
  out for ingest. SAM also publishes a daily bulk CSV (about 245 MB) that needs
  no key and has no cap. gov-bids reads that file instead.
- Cal eProcure has no API. Its search grid is scraped with Playwright.
- The three sources disagree on every field name, date format and status value.

## Sources

| Key | Scope | How it is fetched |
| --- | --- | --- |
| `sam` | Federal contracts | Daily bulk CSV, no API key |
| `grants` | Federal grants | `POST api.grants.gov/v1/api/search2` |
| `caleprocure` | California state register | Playwright against the rendered grid |

A source is only added if it invites automated access or declares no
restriction in both its robots.txt and its posted terms. PlanetBids, Caltrans,
DemandStar and Public Purchase were left out because their terms, their
robots.txt or a login wall block automated access.

## How it works

```
adapters  ->  runner  ->  Postgres  ->  search.ts  ->  pages
(fetch)      (upsert)    (one table)   (one query)   (render)
```

- **Adapters** (`src/lib/adapters/`) fetch and normalize. Each yields
  `NormalizedOpportunity` rows and never touches the database.
- **The runner** (`src/lib/ingest/run.ts`) owns persistence: batched upsert on
  `(source, source_id)`, closing rows that disappeared or passed their deadline,
  and a row in `ingest_runs` for every attempt.
- **`search.ts`** is the only code that reads opportunities. It uses Postgres
  full text search today; swap the engine there without touching a page.
- **The website never writes.** It reads with a publishable key bounded by row
  level security. Only ingest holds the service role key.

Closed opportunities stay in the table with their own URL. Every filtered view
is a plain GET URL, and state, NAICS and agency pages are prerendered for
search engines. Facet pages with too few results get `noindex`.

## Run it locally

From this folder:

```bash
npm ci
npm run dev
```

With no database configured, local builds fall back to a small set of fixture
rows so you can work on the pages. Deployed builds refuse to do that.

## Set up your own copy

1. **Database.** Create a Supabase project and run the files in
   `supabase/migrations/` in order (`0001` to `0004`) in the SQL editor.
2. **Environment.** Copy `.env.example` to `.env` and fill in the URL, the
   publishable key and the service role key.
3. **Check a source without a database.**
   ```bash
   npm run ingest -- --dry --source grants
   ```
4. **Load data.**
   ```bash
   npx playwright install chromium   # needed for caleprocure
   npm run ingest                    # every source
   npm run ingest -- --source sam    # or one
   ```
5. **Deploy.** Vercel needs only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
6. **Nightly ingest.** Copy this folder into a repository of its own, since
   GitHub only runs workflows from a repository's root. Add `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` as Actions secrets, and
   `.github/workflows/ingest.yml` runs every night at 09:00 UTC. Ingest runs in
   Actions, not on Vercel, because the SAM file is too big for a serverless
   function and Cal eProcure needs a real browser.

## Add a source

Write one file in `src/lib/adapters/` that implements `Adapter` from
`types.ts`, and export it from `index.ts`. No schema change is needed: the
table is source-agnostic, and fields you have no column for go in `raw`.

Set `minExpectedRows` honestly. A run that returns fewer rows than that is
treated as broken and skips the close pass, so a scraper that silently breaks
cannot mark every open bid closed.

## Things the sources get wrong

These cost time to find, so they are written down here:

- SAM.gov answers `406` to `Accept: application/json`. It serves HAL. Send `*/*`.
- SAM's `PostedDate` is a bare date. Parse it as Pacific time, or every posting
  shows up a day early.
- SAM keeps expired notices marked active until it archives them. The runner
  closes anything past its deadline; without that, more than half of the open
  rows were dead.
- SAM writes the string `No Set aside used` instead of leaving the field empty.
- Deadlines are counted in calendar days, never rounded elapsed time. Rounding
  up tells a contractor they have more time than they do.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS v4, Supabase Postgres, Playwright,
GitHub Actions, Vercel.

## License

GNU AGPL v3 or later, with one added term: keep the copyright notice
"© 2026 Joey Childs Media. All Rights Reserved. joeychildsmedia.com" visible in
the site footer. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

In practice: you can use, change and host this, including commercially. If
you run a changed version as a public website, you must publish your source
under the same license and keep the notice. For a license without those
conditions, contact the author.

## Copyright

© 2026 Joey Childs Media. All Rights Reserved.
[joeychildsmedia.com](https://www.joeychildsmedia.com)

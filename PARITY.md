# Letterboxd parity plan

Living checklist for feature and rough layout parity with Letterboxd, while keeping pillarboxd’s design system (quiet chrome, posters as color, no cards/shadows/pills/metric heroes).

**How to use:** pick the next unchecked `[ ]` item in priority order. Mark `[x]` when done and verified with `pnpm check`. Prefer small PR-sized units. Read `AGENTS.md`, `DESIGN.md`, and `.scratch/design-system.html` before UI work.

**Status key:** `[x]` done · `[~]` partial · `[ ]` not started

---

## 0. Design constraints (always)

- Dark-first OKLCH tokens; Schibsted Grotesk; pink / gold / sage accent trio
- No cards, shadows, eyebrow labels, side-stripe borders, gradient text, glassmorphism, hero-metric blocks, pill buttons, em dashes
- Separation by hairline border or whitespace
- Layout: `max-w-[42rem]` prose/forms, `max-w-[64rem]` poster grids / diary / film pages
- Semantic gaps (`gap-tight` … `gap-step`); prefer `PageShell`, shared components
- Federation copy must stay honest until ActivityPub works

---

## 1. Correctness (P0)

- [x] Entry permalink route `/entries/:entryId` (matches minted `uri`)
- [x] Edit diary entry (owner only)
- [x] Delete diary entry (owner only)
- [x] Pagination cursors include `watchedOn` + `createdAt` + `id` (diary, reviews, activity)
- [x] Federation footer/auth copy: planned, not claimed as live
- [x] Soften homepage meta description (“federated” → accurate wording)
- [x] Apply migrations on all environments (`0001_activity_indexes`, `0002_parity`, `0003_film_credits`, `0004_parity_polish`) — applied locally; confirm Coolify/prod on deploy
- [ ] Confirm import hang fix under a large real Letterboxd zip on production

---

## 2. State model (P0)

Separate Letterboxd-style states from dated diary logs.

- [x] Schema `film_states`: watched, liked, watchlisted, standing rating
- [x] `setFilmState` / `getFilmState`; watchlist cleared when watched/liked/rated
- [x] Logging a diary entry upserts film state (watched + rating/liked sync)
- [x] Film page action rail: watched / like / watchlist / rating
- [x] Dedicated log route `/film/:tmdbId/log`
- [x] Watchlist page `/u/:username/watchlist`
- [x] Films page `/u/:username/films`
- [x] Likes page `/u/:username/likes`
- [~] Watched-without-diary is stored; UI for “mark watched only” exists via action rail (verify edge cases)
- [ ] Poster-tile quick actions (watched / watchlist / like) without opening the film page
- [x] Clear standing rating without deleting diary entries (Clear on star input + Save rating)

---

## 3. Import / export (P0–P1)

- [x] Parallel TMDB film resolution (concurrency) + timeouts
- [x] Parse `ratings.csv` → film states
- [x] Parse `watchlist.csv` → watchlisted state
- [x] Durable unmatched queue (`import_jobs` + `import_unmatched`)
- [x] Manual match passes `jobId` + entry id; remaining unmatched returned
- [x] Import progress copy for long runs
- [x] Import Letterboxd **lists** from zip (`lists/` / list CSVs)
- [x] Import spoiler flags when present in export (`Spoilers` / `Contains Spoilers`)
- [x] Ambiguous TMDB matches: surface candidates instead of first-hit only
- [ ] Same-film same-date multiple logs: do not silently collapse (or document + preserve Letterboxd URI)
- [x] CSV export includes liked + spoiler columns (or document JSON-only full fidelity)
- [x] Native pillarboxd JSON **re-import** / restore
- [x] Settings copy distinguishes full-fidelity JSON vs diary CSV

---

## 4. Film page layout (P1)

Target desktop composition: poster | content | action rail.

- [x] Three-column-ish film layout with `FilmActions` rail
- [x] Instance reviews list with links to `/entries/:id`
- [x] Instance average rating (plain text, not a metric card)
- [x] Your entries with links to edit
- [x] Cast (TMDB credits cast)
- [x] Genres
- [x] Trailer / external links (TMDB / IMDb)
- [x] Rating histogram (instance distribution)
- [x] Similar films
- [x] Lists that include this film
- [x] Richer “logged by” row (avatar, review excerpt, not rating-only)

---

## 5. Profile layout (P1)

- [x] Profile overview with counts, favorites, recent diary, recent reviews
- [x] `ProfileNav` tabs: Profile, Films, Diary, Reviews, Lists, Watchlist, Likes
- [x] Follow / unfollow on profile
- [x] Followers / following pages
- [x] Settings profile: display name + favorites
- [x] Diary table shows tags + entry permalinks (where wired)
- [~] Bio (done); avatar, location, links still open
- [~] Filter/sort diary (year, min rating, has review); films filters still open
- [ ] Owner empty-state CTAs polish across all tabs
- [ ] Display username vs handle consistency everywhere

---

## 6. Lists (P1)

- [x] Schema `lists` + `list_entries`
- [x] Create list `/lists/new`
- [x] Public list page `/lists/:listId`
- [x] Edit list `/lists/:listId/edit` (meta, add/remove, reorder)
- [x] Profile lists tab
- [ ] Ranked vs unranked presentation polish
- [ ] List tags
- [ ] Private lists UX clarity
- [x] Letterboxd list import
- [ ] List likes / comments (defer with social)

---

## 7. Social (P2)

- [x] Follow graph schema + server lib
- [x] Follow / unfollow UI
- [x] Followers / following lists
- [x] Homepage “From people you follow” slice
- [x] Personalized `/activity` mode (following vs instance)
- [ ] Review likes
- [ ] Review comments
- [ ] Notifications
- [ ] Blocks / mutes
- [ ] Member search

---

## 8. Federation (P2+)

Scaffolding only today (actor keys at signup, entry/list URIs).

- [ ] WebFinger
- [ ] Actor document
- [ ] Inbox / outbox
- [ ] HTTP signatures
- [ ] Delivery / remote objects
- [ ] Restore “can follow across instances” copy only after this works

---

## 9. Account / search / polish (P2)

- [ ] Password change / reset
- [ ] Email verification flows
- [ ] Account deletion
- [ ] Film search pagination
- [ ] Local diary / list / member search
- [ ] Homepage logged-in vs logged-out composition polish (2:1 content/sidebar where useful)
- [ ] Nav density: Log shortcut, Lists link (partially done)
- [ ] Branded empty states consistency
- [ ] Dark + light visual pass on new pages

---

## 10. Verification checklist

After each batch:

1. `pnpm check` (typecheck, lint, format, knip, test)
2. `node scripts/migrate.js` if schema changed
3. Manual smoke: register → import or log → film actions → entry edit/delete → profile tabs → list create → follow → home following feed
4. Confirm design bans (no cards/shadows/eyebrows)
5. Confirm federation copy still honest

---

## Suggested next loops

Work these in order; each is a self-contained loop:

1. **Poster quick actions** + films-page filters
2. **Same-film same-date** import dedupe honesty (preserve Letterboxd URI or allow multiples)
3. **Profile polish:** avatar/links, empty-state CTAs, username/handle consistency
4. **Social depth:** review likes, comments, notifications
5. **Federation:** only when product is ready to ship cross-instance follows
6. **Prod smoke:** large Letterboxd zip + confirm `0004_parity_polish` migrated on Coolify

---

## Key files

| Area       | Paths                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------- |
| Schema     | `app/lib/db/schema.ts`, `drizzle/0002_parity.sql`, `drizzle/0004_parity_polish.sql`      |
| Diary      | `app/lib/logs.server.ts`, `app/routes/entry.tsx`, `app/routes/film.log.tsx`              |
| Film state | `app/lib/film-state.server.ts`, `app/components/film-actions.tsx`, `app/routes/film.tsx` |
| Import     | `app/lib/importer.server.ts`, `app/lib/letterboxd.ts`, `app/lib/import-action.server.ts` |
| Profile    | `app/lib/profile.server.ts`, `app/routes/profile*.tsx`, `app/components/profile-nav.tsx` |
| Lists      | `app/lib/lists.server.ts`, `app/routes/list*.tsx`, `app/routes/lists.new.tsx`            |
| Social     | `app/lib/follows.server.ts`, profile follow actions, `app/routes/home.tsx`               |
| Design     | `AGENTS.md`, `DESIGN.md`, `.scratch/design-system.html`                                  |

---

## Done in recent sessions (summary)

- Design system tokens + shared components + curated homepage
- Activity feed moved to `/activity`
- Import concurrency + durable unmatched + ratings/watchlist CSV
- Entry permalink CRUD
- Film states + action rail + log subroute
- Profile tabs, favorites, follow graph
- Lists CRUD + public/edit pages
- Following activity on home
- Honest federation copy
- Film page: similar films, lists containing film, richer logged-by
- Import: Letterboxd lists, ambiguous TMDB candidates, spoiler flags, JSON restore
- Profile bio + diary year/rating/review filters
- Migration `0004_parity_polish` (candidates, spoilers on unmatched, `user_profiles`)

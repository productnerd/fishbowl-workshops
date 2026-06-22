# Fishbowl + Through Their Eyes — Dual-App Monorepo Plan

Branch: `claude/fishbowl-monorepo` (off the B2C source branch `claude/feedback-webapp-setup`).
Repo: `productnerd/fishbowl` (local folder still named `04-Responsive-profile`; GitHub auto-redirects).

## Goal
Two separate frontends/URLs sharing infrastructure:
- **Through Their Eyes** (B2C, exists) — anonymous friends-and-family feedback → Wrapped-style report.
- **Fishbowl** (B2B corporate, priority) — same flow for workplace peer feedback, Aristotelian virtue sliders + Likert + scenario + freetext → Wrapped-style report with live percentiles.

Same Supabase project (`knftyqkhampkqchoncel` / "SeeHer"), table prefixes `tte_` and `fishbowl_`.
B2C → GitHub Pages. Fishbowl → Cloudflare Pages. Never Vercel.

## Architecture (final)
```
fishbowl/ (repo root)
├── packages/
│   ├── feedback-core/   @fishbowl/feedback-core — non-visual: types, aggregation,
│   │                    supabase factory, prefix-aware session/response API, slug,
│   │                    percentile read-path, constants; /react subpath = useAiInsights
│   └── wrapped-ui/      @fishbowl/wrapped-ui — theme-agnostic visual kit (charts,
│                        gauge, cards, carousel, inputs, VirtueSlider)
├── apps/
│   ├── throughtheireyes/  tte_, GitHub Pages, base /fishbowl/throughtheireyes/
│   └── fishbowl/          fishbowl_, Cloudflare Pages, base /
├── supabase/             schema + edge functions (tte-ai-insights, fishbowl-ai-insights)
└── profile/             UNTOUCHED static site
```

## Key decisions (locked)
- Question types = **superset** `mc | rating | freetext | likert | scenario | virtue` (additive, never fold — protects live B2C).
- `AggregatedResults` keeps `mcResults`/`ratingResults`/`freetextResults`; ADDS `likertResults`/`virtueResults`/`scenarioResults`.
- Packages ship **source**; `exports` → `./src/index.ts`. Single root `npm install`; dedupe react/react-dom/framer-motion/react-router-dom; delete per-app lockfile.
- Theming = **CSS-variable token contract**. Kit uses semantic classes only; each app owns `@theme` values + gradient map. Tailwind `@source '../../../../packages/wrapped-ui/src/**/*.{ts,tsx}';`.
- Anonymity = structural: never collect respondent identity; reveal threshold = **5**; RLS gate.
- AI narrative cached by `response_count` (force-refresh allowed); numeric **percentiles always live**.
- Virtue percentile = distance from midpoint (3 = virtue), computed server-side; `<50` subjects → seeded default norm (mean 3); `>=50` → live population only.
- Edge fn model bump `claude-opus-4-6` → `claude-opus-4-8`.

## Empirical findings (verified)
- Prod URL currently 404s (not served after rename). Base fix + redeploy restores it.
- Supabase config IS provided via committed `apps/throughtheireyes/.env` (public anon key, no service_role). Once URL/base fixed + redeployed, backend works — no secret wiring needed. (Committing `.env` is unusual but fine for a public anon key; Fishbowl will use Cloudflare env vars.)
- Committed key in `auto_generate_trigger.sql` is the **anon** key (public by design) — low severity; move to Vault later.

---

## Phase 0 — Monorepo restructure (local, reversible, no deploy)
- [ ] Root `package.json`: `{ private, workspaces: ["apps/*","packages/*"], scripts.build }`.
- [ ] `git mv throughtheireyes apps/throughtheireyes` (keeps history); leave `profile/` alone.
- [ ] `git mv apps/throughtheireyes/supabase supabase` (DB/edge at root).
- [ ] Rename app package → `@fishbowl/throughtheireyes`.
- [ ] Fix vite base: `process.env.VITE_BASE ?? '/fishbowl/throughtheireyes/'` (was `/04-Responsive-profile/...`).
- [ ] Update deploy workflow ATOMICALLY: `working-directory: apps/throughtheireyes`, install at repo root, `npm run build -w @fishbowl/throughtheireyes`, folder `apps/throughtheireyes/dist`, target-folder `throughtheireyes`, paths `['apps/throughtheireyes/**','packages/**','.github/workflows/deploy-throughtheireyes.yml']`.
- [ ] Delete `apps/throughtheireyes/package-lock.json`; root `npm install --legacy-peer-deps`.
- [ ] **VERIFY**: `npm run build -w @fishbowl/throughtheireyes` green; `dist/index.html` asset URLs use `/fishbowl/throughtheireyes/`. Commit.

## Phase 1 — Extract shared packages
- [ ] Add root `tsconfig.base.json`; scaffold both packages (package.json `exports`→src, peerDeps, `/react` subpath).
- [ ] `git mv` non-visual → feedback-core (types→types.ts, aggregation, supabase→factory, aiInsights→react/useAiInsights). Add sessions.ts, slug.ts, constants.ts, percentile.ts (additive; B2C-unused branches don't change mc/rating behavior). Generic `useAiInsights<TInsights>`.
- [ ] `git mv` visual → wrapped-ui (ui + questions + wrapped components). Fix GaugeChart hex→CSS var; WrapCard keep backward-compat gradient prop. Add VirtueSlider.
- [ ] Rewrite B2C imports → `@fishbowl/*`; wire `FeedbackConfig{client,tablePrefix:'tte_'}`; single `REQUIRED_RESPONSES`; fix "6 friends"→bind to constant; `buildShareLink`.
- [ ] Add `@source` glob (4 levels) + `resolve.dedupe` + `server.fs.allow`.
- [ ] **VERIFY**: build green; `npm ls react` = 1 copy; visual diff vs Phase 0 (deck, gradients, gauge, locked-state, narrative identical); no `../lib/`/`../components/` imports remain. Commit.

## Phase 2 — Fishbowl backend (`fishbowl_*`)
- [ ] `fishbowl_sessions` (+`dimension_means jsonb`, email, notified_at), `fishbowl_responses`, `fishbowl_ai_insights`, `fishbowl_notify_config`. RLS threshold 5 + count trigger.
- [ ] `fishbowl_dimension_norms` view + SECURITY DEFINER rank fn (don't expose raw distribution).
- [ ] Edge fn `fishbowl-ai-insights` (own prompt + JSON schema, model opus-4-8). Write `dimension_means` from edge fn (service role), decoupled from AI timing.
- [ ] **VERIFY**: seed session, hit 5, get cached JSON + live percentile.

## Phase 3 — Question model + seed content
- [ ] virtue/likert/scenario types + aggregation (mu, sigma, classifyTendency; band <2.5 deficient / 2.5–3.5 balanced / >3.5 excessive). Concrete DEFAULT_NORM_SD.
- [ ] Seed 10 workplace virtues + placeholder Likert/scenario in `apps/fishbowl/src/data/questions.ts`.
- [ ] **VERIFY**: aggregation classifies deficiency/mean/excess correctly (unit-style check).

## Phase 4 — Fishbowl frontend
- [ ] App skeleton (copy B2C), corporate `@theme` + gradient map, own routes/copy. Create→Questionnaire→Done→Results on shared kit + VirtueSlider + percentile cards.
- [ ] **VERIFY**: full flow end-to-end locally.

## Phase 5 — Notifications + threshold + caching
- [ ] Report-ready email at threshold (default provider Resend — needs API key). Confirm/replace existing notify mechanism.
- [ ] **VERIFY**: email fires once at threshold.

## Phase 6 — Deploy
- [ ] B2C: push; confirm live + backend connected (Supabase config already in committed `.env`; optionally migrate to GH Actions secrets later).
- [ ] Fishbowl: Cloudflare Pages (root dir apps/fishbowl, build `npm run build -w @fishbowl/fishbowl`, output dist, base `/`, `_redirects`, NODE_VERSION=22, Supabase env). Custom domain when ready.
- [ ] **VERIFY**: both live; Fishbowl renders a real report.

## Open items / flags
- dimension_means write timing (edge fn, refresh as responses arrive) — decided: edge fn.
- Email provider (Resend default) — needs Maria's API key at Phase 5.
- Small-n free-text re-identification in B2B — consider AI-synthesizing rather than showing verbatim, or higher reveal threshold for free-text.
- Move anon key in `auto_generate_trigger.sql` to Vault (low priority).
- Edge fn does NOT import feedback-core (keep self-contained; avoid unproven Deno cross-import).

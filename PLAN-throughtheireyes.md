# Through Their Eyes — Product & Technical Plan

> _"Sometimes we don't see ourselves in the same light as others see us."_

A webapp where you share a link with friends for anonymous feedback about you — to discover your talents, blind spots, what annoys people, what they appreciate, and what makes you special. Results are revealed in a Spotify Wrapped-style experience after 6 people respond.

---

## Core Concepts

| Concept | Detail |
|---|---|
| **Creator** | The person who wants feedback. Creates a session, gets a shareable link. |
| **Responder** | A friend who fills out the anonymous questionnaire (~10 min). |
| **Reveal threshold** | Results are locked until **6 responders** complete the test. |
| **Anonymity** | No login required for responders. No names stored. No IP tracking. |
| **Wrapped reveal** | Results shown as an animated, card-by-card summary (like Spotify Wrapped). |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | SSR for link previews, API routes, fast DX |
| **Language** | TypeScript | Type safety across stack |
| **Styling** | Tailwind CSS + Framer Motion | Rapid UI + smooth Wrapped-style animations |
| **Database** | Supabase (Postgres + Row Level Security) | Free tier, real-time, auth-optional, hosted |
| **ORM** | Prisma | Type-safe DB access |
| **Hosting** | Vercel | Zero-config Next.js deploys |
| **Analytics** | PostHog (optional) | Privacy-friendly, free tier |

---

## Database Schema

```
┌──────────────────────────────┐
│ sessions                     │
├──────────────────────────────┤
│ id            UUID (PK)      │
│ creator_name  TEXT            │
│ slug          TEXT (unique)   │ ← shareable link ID
│ created_at    TIMESTAMP      │
│ reveal_ready  BOOLEAN        │ ← flips true at 6 responses
│ response_count INT DEFAULT 0 │
└──────────────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────────┐
│ responses                    │
├──────────────────────────────┤
│ id            UUID (PK)      │
│ session_id    UUID (FK)      │
│ answers       JSONB          │ ← all answers in one blob
│ completed_at  TIMESTAMP      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ questions (seed data)        │
├──────────────────────────────┤
│ id            INT (PK)       │
│ category      TEXT           │ ← "strengths", "improve", "personality", etc.
│ type          TEXT           │ ← "multiple_choice", "rating", "freetext"
│ text          TEXT           │
│ options       JSONB (nullable)│ ← for MC questions
│ order         INT            │
└──────────────────────────────┘
```

---

## Question Design (~10 minutes, ~20 questions)

### Categories & Mix

| # | Category | Type | Example |
|---|---|---|---|
| 1 | First impression | MC | "When you first met {name}, what word came to mind?" (options: Warm, Intense, Funny, Quiet, Confident, Weird-in-a-good-way) |
| 2 | Strengths | MC | "What is {name}'s superpower?" (options: Listening, Problem-solving, Making people laugh, Staying calm, Creativity, Leadership) |
| 3 | Strengths | Rating (1-5) | "How good is {name} at making people feel heard?" |
| 4 | Strengths | Freetext | "What's something {name} is great at that they probably don't realize?" |
| 5 | Communication | Rating (1-5) | "How clearly does {name} communicate?" |
| 6 | Communication | MC | "When {name} talks, you usually feel…" (Inspired, Informed, Confused, Entertained, Calm) |
| 7 | Growth areas | MC | "If {name} worked on one thing, it should be…" (Patience, Listening more, Being more assertive, Overthinking less, Following through, Being more open) |
| 8 | Growth areas | Rating (1-5) | "How well does {name} handle conflict?" |
| 9 | Growth areas | Freetext | "What's one thing {name} could improve that would make a big difference?" |
| 10 | Personality | MC | "Pick the emoji that best describes {name}" (🔥🌊🌸🎯🎭🧩) |
| 11 | Personality | MC | "If {name} were a character archetype, they'd be…" (The Mentor, The Rebel, The Caregiver, The Visionary, The Joker, The Rock) |
| 12 | Personality | Rating (1-5) | "How authentic is {name}? (1 = wears a mask, 5 = 100% real)" |
| 13 | Social | Rating (1-5) | "How much energy do you get from spending time with {name}?" |
| 14 | Social | MC | "In a group, {name} is usually the one who…" (Leads, Listens, Cracks jokes, Keeps peace, Zones out, Asks deep questions) |
| 15 | Annoying habits | MC | "{name}'s most annoying trait is probably…" (Overthinking, Being late, Interrupting, Being too blunt, Avoiding conflict, Over-apologizing) |
| 16 | Annoying habits | Freetext | "What's one small thing {name} does that low-key annoys you? (Be honest, it's anonymous!)" |
| 17 | Appreciation | Freetext | "What do you genuinely appreciate most about {name}?" |
| 18 | Unique factor | Freetext | "What makes {name} different from everyone else you know?" |
| 19 | Wildcard | MC | "If {name} started a business, it should be…" (Coaching, Creative agency, Restaurant, Tech startup, Nonprofit, Stand-up comedy) |
| 20 | Final word | Freetext | "Anything else you want {name} to know? (Remember, this is anonymous)" |

**Mix summary:** 8 MC + 5 Rating + 7 Freetext = 20 questions (~30s each = ~10 min)

---

## Pages / Routes

```
/                           → Landing page (hero + "Create your link")
/create                     → Enter your name → generates session → shows link
/s/[slug]                   → Responder questionnaire (anonymous, no auth)
/s/[slug]/done              → Thank you screen
/results/[slug]             → Wrapped-style reveal (locked until 6 responses)
```

---

## Wrapped-Style Reveal Flow

The results page (`/results/[slug]`) is the star of the show. Inspired by Spotify Wrapped, it's a **full-screen, swipeable/clickable card sequence** with animations:

### Card Sequence

1. **Intro card** — "6 people shared how they see you. Ready?" (tap to start)
2. **First Impression Cloud** — Word cloud of "first impression" answers, biggest word = most common
3. **Your Superpower** — Animated reveal of top-voted strength with a bold visual
4. **Rating Spotlight** — Animated bar charts for each rating question (avg scores)
5. **The Real You** — Personality archetype + emoji most people picked
6. **Your Vibe Score** — Average "energy" rating, shown as a meter/gauge
7. **Group Role** — What you do in groups (top MC answer with fun illustration)
8. **Growth Edge** — Top improvement area, shown gently ("Your friends think you could level up by…")
9. **The Annoying Truth** — Most common annoying habit, shown with humor
10. **Highlight Reel** — Scrollable carousel of freetext appreciation quotes
11. **What Makes You, You** — Scrollable carousel of "unique factor" freetext answers
12. **Hidden Talent** — Freetext answers about unrealized strengths
13. **The Business Card** — Fun card: "According to your friends, you should start a…"
14. **Final Messages** — Any anonymous "anything else" messages
15. **Summary Card** — Overview with all key stats + "Share your results" button

### Animation & Design Principles
- Each card = full viewport, bold typography, single focus
- Background gradients shift per card (like Wrapped)
- Framer Motion for enter/exit transitions (slide, fade, scale)
- Tap/click/swipe to advance
- Progress dots at bottom
- Mobile-first design (most sharing happens on mobile)

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Next.js project setup (App Router, TypeScript, Tailwind, Prisma)
- [ ] Supabase project + database schema
- [ ] Seed questions into DB
- [ ] `/create` page — enter name, generate session + slug
- [ ] `/s/[slug]` — full questionnaire with all 20 questions
  - Progress bar
  - MC / Rating / Freetext components
  - Submit → store as JSONB
  - Increment response count
- [ ] `/s/[slug]/done` — thank you page with "X of 6 responses so far"
- [ ] `/results/[slug]` — locked state ("Need X more responses")
- [ ] Landing page with hero

### Phase 2: The Reveal
- [ ] Answer aggregation logic (compute averages, top picks, group freetext)
- [ ] Wrapped card components (15 cards as above)
- [ ] Framer Motion animations (transitions, counters, reveals)
- [ ] Swipe/tap navigation between cards
- [ ] Progress indicator
- [ ] Mobile-responsive full-screen layout

### Phase 3: Polish & Share
- [ ] OG meta tags for link previews ("Someone wants to know how you see them!")
- [ ] Copy-link button with share sheet integration
- [ ] "Share your results" at the end (screenshot-friendly summary card)
- [ ] Loading states and error handling
- [ ] Rate limiting (prevent spam responses)
- [ ] Basic analytics (optional)

### Phase 4: Nice-to-haves
- [ ] Real-time response counter (Supabase realtime)
- [ ] Email/push notification when 6th response arrives
- [ ] Additional question packs (for couples, coworkers, family)
- [ ] Dark mode
- [ ] PDF export of results
- [ ] Comparison ("retake in 6 months and see what changed")

---

## Key Design Decisions

1. **No auth for responders** — Friction kills response rates. Anyone with the link can respond.
2. **Creator identifies only by name** — No signup required for MVP. Session slug = access token.
3. **JSONB for answers** — Flexible, no migration needed when questions change.
4. **6-response threshold** — Balances anonymity (can't guess who said what) with achievability.
5. **Questions use `{name}` templating** — Personalized feel without storing responder identity.
6. **Mobile-first** — Links will be shared via messaging apps, so mobile is primary.

---

## Estimated Build Timeline

| Phase | Scope |
|---|---|
| Phase 1 | Foundation + questionnaire flow |
| Phase 2 | Wrapped reveal experience |
| Phase 3 | Sharing, OG tags, polish |
| Phase 4 | Future enhancements |

---

## File Structure (Planned)

```
throughtheireyes/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts              ← question seed data
├── src/
│   ├── app/
│   │   ├── page.tsx          ← landing
│   │   ├── create/
│   │   │   └── page.tsx      ← create session
│   │   ├── s/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx  ← questionnaire
│   │   │       └── done/
│   │   │           └── page.tsx
│   │   ├── results/
│   │   │   └── [slug]/
│   │   │       └── page.tsx  ← wrapped reveal
│   │   ├── api/
│   │   │   ├── sessions/
│   │   │   │   └── route.ts
│   │   │   └── responses/
│   │   │       └── route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── questions/
│   │   │   ├── MultipleChoice.tsx
│   │   │   ├── Rating.tsx
│   │   │   └── FreeText.tsx
│   │   ├── wrapped/
│   │   │   ├── WrapCard.tsx
│   │   │   ├── WordCloud.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── VibeMeter.tsx
│   │   │   └── QuoteCarousel.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── ProgressBar.tsx
│   │       └── ProgressDots.tsx
│   ├── lib/
│   │   ├── db.ts             ← Prisma client
│   │   ├── questions.ts      ← question definitions
│   │   └── aggregation.ts    ← answer synthesis logic
│   └── styles/
│       └── globals.css
├── public/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

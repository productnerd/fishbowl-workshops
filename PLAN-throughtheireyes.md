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
| **Framework** | Vite + React 18 | Fast SPA, static export, GitHub Pages compatible |
| **Language** | TypeScript | Type safety across stack |
| **Routing** | React Router (HashRouter) | Client-side routing works on GitHub Pages without server config |
| **Styling** | Tailwind CSS + Framer Motion | Rapid UI + smooth Wrapped-style animations |
| **Database** | Supabase (Postgres + Row Level Security) | Free tier, real-time, auth-optional, client-side SDK |
| **Hosting** | GitHub Pages | Free, deploys from repo, custom domain support |
| **CI/CD** | GitHub Actions | Auto-build & deploy to Pages on push |

**Why no SSR/Next.js:** GitHub Pages serves static files only. We use Supabase JS client directly from the browser — no API routes needed. Supabase RLS policies enforce security at the database level.

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
```

Questions are hardcoded in the frontend (no questions table needed — simpler, faster, no extra DB call). Versioned in code.

### Supabase RLS Policies

- **sessions:** Anyone can INSERT (create). Anyone can SELECT (read by slug). No UPDATE/DELETE from client.
- **responses:** Anyone can INSERT. SELECT only allowed when `session.response_count >= 6` (enforced via RLS join or DB function).
- **response_count:** Incremented via a Supabase DB trigger on response INSERT (not from client — prevents manipulation).

---

## Question Design (~10 minutes, 50 questions)

### Design Philosophy
These aren't personality quiz fluff. Each question is designed to surface **actionable self-knowledge** — the kind of thing a therapist, coach, or brutally honest friend would help you see. Grouped into 10 categories that map to real dimensions of personal growth.

### Pacing Strategy
50 questions in ~10 min = ~12 seconds per question. To keep it moving:
- MC and Rating questions are fast (tap and go) — these make up the bulk
- Freetext questions are placed strategically (not back-to-back) and are short-answer
- Questions are shown one-at-a-time, full screen, with a progress bar
- Freetext fields have a character hint ("1-2 sentences") not a hard limit

### Categories & Questions

---

#### SECTION 1: First Impressions & Energy (Q1–5)
*How you land on people before they know you well.*

| # | Type | Question |
|---|---|---|
| 1 | MC | "What's the first thing people probably notice about {name}?" → Their energy, Their laugh, Their intensity, Their calmness, Their style, Their awkwardness |
| 2 | MC | "When you first met {name}, what did you assume about them that turned out to be wrong?" → That they were confident, That they were shy, That they were serious, That they were easygoing, That they didn't care, That they had it all figured out |
| 3 | Rating | "How quickly did {name} make you feel comfortable around them?" (1 = took a while, 5 = instantly) |
| 4 | MC | "The vibe {name} gives off in the first 5 minutes is…" → Warm & welcoming, Cool & mysterious, High-energy & fun, Nervous & endearing, Intense & magnetic, Chill & unbothered |
| 5 | Freetext | "What's a first impression of {name} that completely changed once you got to know them?" |

---

#### SECTION 2: Core Strengths & Talents (Q6–12)
*What you're actually great at — especially the things you can't see yourself.*

| # | Type | Question |
|---|---|---|
| 6 | MC | "What is {name}'s most underrated skill?" → Reading people, Explaining complex things simply, Making hard decisions, Staying calm in chaos, Connecting people together, Turning ideas into action |
| 7 | MC | "If your whole friend group was in a crisis, {name} would be the one who…" → Takes charge, Keeps everyone calm, Comes up with the plan, Makes sure everyone is okay emotionally, Finds the humor in it, Does the thing no one else wants to do |
| 8 | Rating | "How good is {name} at following through on what they say they'll do?" (1 = rarely, 5 = always) |
| 9 | Freetext | "What's something {name} is naturally talented at that they probably undervalue or don't even notice?" |
| 10 | Rating | "How much do you trust {name}'s judgment when it matters?" (1 = not much, 5 = completely) |
| 11 | MC | "What would {name} be famous for if talent alone decided it?" → Writing/storytelling, Leading people, Creating things, Understanding people, Performing/entertaining, Solving impossible problems |
| 12 | Freetext | "What's a specific moment where {name} really impressed you?" |

---

#### SECTION 3: Communication Style (Q13–18)
*How you talk, listen, and make people feel in conversation.*

| # | Type | Question |
|---|---|---|
| 13 | MC | "When {name} is telling a story, you usually feel…" → Hooked and entertained, Lost in the details, Inspired, Like they're rushing through it, Like you could listen forever, Slightly confused but charmed |
| 14 | Rating | "How well does {name} actually listen (vs. waiting for their turn to talk)?" (1 = poor listener, 5 = exceptional listener) |
| 15 | MC | "{name}'s texting style is best described as…" → Walls of text, One-word answers, Voice notes only, Memes and links, Thoughtful and delayed, Instant and chaotic |
| 16 | Rating | "How comfortable do you feel telling {name} something difficult or honest?" (1 = I'd avoid it, 5 = I'd go to them first) |
| 17 | MC | "In a disagreement, {name} tends to…" → Shut down and go quiet, Get defensive, Try to understand the other side, Argue to win, Over-explain their position, Avoid the disagreement entirely |
| 18 | Freetext | "What's one thing {name} does in conversation that either makes you feel really heard — or really unheard?" |

---

#### SECTION 4: Emotional Intelligence & Depth (Q19–24)
*How well you navigate feelings — yours and others'.*

| # | Type | Question |
|---|---|---|
| 19 | Rating | "How emotionally available is {name}? (1 = walls up, 5 = completely open)" |
| 20 | MC | "When you're going through something hard, {name} is the kind of friend who…" → Gives tough love, Listens without trying to fix, Sends you memes to cheer you up, Checks in days later to follow up, Doesn't really notice, Shows up physically |
| 21 | Rating | "How well does {name} handle their own emotions under stress?" (1 = falls apart, 5 = rock solid) |
| 22 | MC | "The emotion {name} probably struggles to express the most is…" → Anger, Sadness, Vulnerability, Joy/excitement, Gratitude, Fear |
| 23 | Freetext | "When has {name} shown you a side of themselves that felt really real and vulnerable?" |
| 24 | Rating | "How good is {name} at reading the room / picking up on how people feel?" (1 = oblivious, 5 = eerily accurate) |

---

#### SECTION 5: Reliability & Trust (Q25–29)
*Can people count on you? Do they?*

| # | Type | Question |
|---|---|---|
| 25 | MC | "If you needed someone at 2am, would you call {name}?" → Absolutely yes, Probably yes, Only for certain things, Honestly no, They'd be the one calling me, Depends on the situation |
| 26 | Rating | "How consistent is {name}? (1 = hot and cold, 5 = always the same person)" |
| 27 | MC | "Where does {name} sometimes let people down?" → Being flaky with plans, Not responding to messages, Overpromising, Being emotionally unavailable, Forgetting important things, They rarely let people down |
| 28 | Rating | "How safe do your secrets feel with {name}?" (1 = nervous, 5 = vault) |
| 29 | Freetext | "What's one thing {name} could do that would make you trust or rely on them even more?" |

---

#### SECTION 6: Growth Edges & Blind Spots (Q30–36)
*The stuff you can't see about yourself. This is the gold.*

| # | Type | Question |
|---|---|---|
| 30 | MC | "What's {name}'s biggest blind spot?" → They don't see how much they matter to people, They underestimate themselves, They overestimate how okay they seem, They don't realize when they're being closed off, They miss how their mood affects others, They don't see their own patterns |
| 31 | Rating | "How self-aware is {name}?" (1 = not very, 5 = deeply) |
| 32 | MC | "If {name} invested in ONE area of personal growth, it should be…" → Setting boundaries, Being more vulnerable, Thinking before reacting, Letting go of control, Asking for help, Finishing what they start |
| 33 | Freetext | "What's a pattern you've noticed in {name} that they might not see themselves? (e.g., always attracts the same kind of people, self-sabotages when things go well, etc.)" |
| 34 | MC | "What does {name} need to hear but no one tells them?" → You're allowed to rest, You don't have to be perfect, People like you more than you think, You're harder on yourself than anyone else is, It's okay to need people, Not everything is your responsibility |
| 35 | Rating | "How well does {name} handle criticism or feedback?" (1 = takes it personally, 5 = takes it constructively) |
| 36 | Freetext | "If you could sit {name} down and tell them one hard truth with love, what would it be?" |

---

#### SECTION 7: Social Dynamics & Role (Q37–41)
*Who you are in the group — and what you bring to the table.*

| # | Type | Question |
|---|---|---|
| 37 | MC | "In a friend group, {name} naturally becomes the…" → Leader/organizer, Emotional glue, Entertainer, Quiet observer, Devil's advocate, Peacemaker |
| 38 | Rating | "How much does {name}'s presence change the energy of a room?" (1 = blends in, 5 = shifts the entire vibe) |
| 39 | MC | "What would the friend group lose if {name} wasn't in it?" → The deep conversations, The spontaneity, The emotional safety, The laughter, The honesty, The plans actually happening |
| 40 | MC | "{name}'s social energy is best described as…" → Life of the party, Selectively social, Quiet but magnetic, Depends entirely on their mood, One-on-one person in a group world, The glue between different friend groups |
| 41 | Freetext | "What role does {name} play in your life that they might not fully realize?" |

---

#### SECTION 8: Habits & Pet Peeves (Q42–45)
*The small stuff that adds up — delivered with honesty and humor.*

| # | Type | Question |
|---|---|---|
| 42 | MC | "What's {name}'s most annoying habit?" → Overthinking everything, Being chronically late, Interrupting, Giving unsolicited advice, Being on their phone too much, Saying "I'm fine" when they're clearly not |
| 43 | MC | "What does {name} do that they think is charming but is actually a bit much?" → Self-deprecating jokes, Being overly modest, Trying to fix everyone's problems, Dominating conversations, Playing devil's advocate constantly, Over-apologizing |
| 44 | Rating | "How easy is {name} to make plans with?" (1 = nightmare, 5 = effortless) |
| 45 | Freetext | "What's a quirk or habit of {name} that's secretly endearing even though it's kind of annoying?" |

---

#### SECTION 9: Appreciation & What Makes Them Special (Q46–49)
*The good stuff. What people actually value about you.*

| # | Type | Question |
|---|---|---|
| 46 | Freetext | "What do you genuinely appreciate most about having {name} in your life?" |
| 47 | MC | "The thing that makes {name} truly one-of-a-kind is…" → The way they make people feel, Their mind / how they think, Their resilience, Their humor, Their authenticity, Their capacity to care |
| 48 | Freetext | "What's a quality {name} has that you genuinely wish you had more of yourself?" |
| 49 | Freetext | "What makes {name} irreplaceable? What would be impossible to find in someone else?" |

---

#### SECTION 10: The Final Word (Q50)
*Open floor.*

| # | Type | Question |
|---|---|---|
| 50 | Freetext | "If {name} could only read one message from this entire questionnaire, what would you want them to know?" |

---

### Question Mix Summary

| Type | Count | Avg time | Subtotal |
|---|---|---|---|
| Multiple Choice | 20 | ~8 sec | ~2.5 min |
| Rating (1–5) | 14 | ~6 sec | ~1.5 min |
| Freetext (short) | 16 | ~25 sec | ~6.5 min |
| **Total** | **50** | | **~10 min** |

---

## Pages / Routes

Using **HashRouter** for GitHub Pages compatibility:

```
/#/                         → Landing page (hero + "Create your link")
/#/create                   → Enter your name → generates session → shows shareable link
/#/s/:slug                  → Responder questionnaire (anonymous, no auth)
/#/s/:slug/done             → Thank you screen + response counter
/#/results/:slug            → Wrapped-style reveal (locked until 6 responses)
```

---

## Wrapped-Style Reveal Flow

The results page is the star of the show. Full-screen, swipeable/clickable card sequence with animations. With 50 questions across 10 deep categories, the reveal is much richer:

### Card Sequence (~20 cards)

1. **Intro** — "6 people looked at you — really looked. Ready to see what they saw?"
2. **First Impressions Cloud** — Aggregated MC answers from Q1–4. "Before they knew you, this is what they felt."
3. **The Misconception** — Q2 freetext highlights. "What people assumed about you that was dead wrong."
4. **Your Superpower** — Top-voted answer from Q6 + Q7 + Q11. Big animated reveal.
5. **Specific Moments** — Carousel of Q12 freetext answers. "Times you left an impression."
6. **Hidden Talent** — Q9 freetext carousel. "What you're great at and don't even realize."
7. **Trust Score** — Average of Q10, Q28, Q26 ratings. Animated gauge.
8. **How You Communicate** — Q13–15 MC results + Q14 rating. Visual style card.
9. **The Hard Conversation** — Q16 + Q17 combined. "Can people be honest with you?"
10. **Emotional Depth** — Q19–21 ratings visualized. "Your emotional availability map."
11. **What You Struggle to Show** — Q22 top answer. Gentle reveal.
12. **Your Role in the Group** — Q37–40 aggregated. "This is who you are to the people around you."
13. **What You'd Take With You** — Q39 top answer. "If you left, this is what they'd miss most."
14. **Your Blind Spots** — Q30 + Q31 rating. "The things you can't see about yourself."
15. **The Growth Edge** — Q32–33 combined. "Where your friends want to see you level up."
16. **What No One Tells You** — Q34 top answer + Q36 freetext carousel. Delivered with warmth.
17. **The Annoying Truth** — Q42–43 top answers. Delivered with humor and honesty.
18. **The Good Stuff** — Q46–48 freetext carousel. "What people genuinely cherish about you."
19. **One of a Kind** — Q47 MC + Q49 freetext. "What makes you irreplaceable."
20. **The Final Message** — Q50 freetext, one card per response. "If you only read one thing…"
21. **Summary Card** — All key stats, scores, top themes. Shareable screenshot.

### Animation & Design Principles
- Each card = full viewport, bold typography, single focus
- Background gradients shift per card (warm → cool → warm, like a journey)
- Framer Motion for enter/exit transitions (slide, fade, scale, counter animations)
- Tap/click/swipe to advance (touch + keyboard support)
- Progress dots at bottom
- Mobile-first design (most sharing happens on mobile)
- Emotional pacing: start light → go deep → end uplifting

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Vite + React + TypeScript + Tailwind project setup
- [ ] Supabase project + database schema + RLS policies + trigger for response_count
- [ ] Questions defined in code (all 50)
- [ ] `/#/create` — enter name, generate session + slug in Supabase, show shareable link
- [ ] `/#/s/:slug` — full questionnaire with all 50 questions
  - One question per screen, full viewport
  - Progress bar
  - MC / Rating / Freetext components
  - Submit → store answers as JSONB in Supabase
- [ ] `/#/s/:slug/done` — thank you page with "X of 6 responses so far"
- [ ] `/#/results/:slug` — locked state ("Need X more responses to unlock")
- [ ] Landing page with hero
- [ ] GitHub Actions workflow for auto-deploy to GitHub Pages

### Phase 2: The Reveal
- [ ] Answer aggregation logic (compute averages, top picks, group freetext by theme)
- [ ] All 21 Wrapped card components
- [ ] Framer Motion animations (transitions, counters, gauge fills, carousel)
- [ ] Swipe/tap/keyboard navigation between cards
- [ ] Progress indicator
- [ ] Mobile-responsive full-screen layout
- [ ] Emotional pacing with gradient backgrounds

### Phase 3: Polish & Share
- [ ] OG meta tags for link previews ("Someone wants to see themselves through your eyes")
- [ ] Copy-link button with Web Share API integration
- [ ] Screenshot-friendly summary card at the end
- [ ] Loading states, error handling, offline graceful degradation
- [ ] Rate limiting via Supabase RLS (one response per browser session using localStorage flag)
- [ ] Smooth scroll-snap or swipe gestures for mobile

### Phase 4: Nice-to-haves
- [ ] Real-time response counter (Supabase realtime subscriptions)
- [ ] Additional question packs (for couples, coworkers, family)
- [ ] Dark mode
- [ ] PDF/image export of results
- [ ] "Retake in 6 months" — compare how perception changes over time
- [ ] Custom domain setup guide

---

## Key Design Decisions

1. **No auth for responders** — Friction kills response rates. Anyone with the link can respond.
2. **Creator identifies only by name** — No signup required for MVP. Session slug = access token.
3. **JSONB for answers** — Flexible, no migration needed when questions change.
4. **6-response threshold** — Balances anonymity (can't guess who said what) with achievability.
5. **Questions use `{name}` templating** — Personalized feel without storing responder identity.
6. **Mobile-first** — Links will be shared via messaging apps, so mobile is primary.
7. **HashRouter** — GitHub Pages doesn't support server-side routing; hash routing works everywhere.
8. **Questions in code, not DB** — Faster load, no extra fetch, easier to version and iterate.
9. **Supabase client-side only** — No backend server needed. RLS handles security. Static hosting is free.
10. **DB trigger for response_count** — Prevents client-side manipulation of the counter.

---

## File Structure

```
throughtheireyes/
├── .github/
│   └── workflows/
│       └── deploy.yml            ← GitHub Actions: build + deploy to Pages
├── src/
│   ├── main.tsx                  ← entry point
│   ├── App.tsx                   ← router setup
│   ├── pages/
│   │   ├── Landing.tsx           ← hero + CTA
│   │   ├── Create.tsx            ← enter name, get link
│   │   ├── Questionnaire.tsx     ← one-at-a-time question flow
│   │   ├── Done.tsx              ← thank you + counter
│   │   └── Results.tsx           ← wrapped reveal orchestrator
│   ├── components/
│   │   ├── questions/
│   │   │   ├── MultipleChoice.tsx
│   │   │   ├── Rating.tsx
│   │   │   └── FreeText.tsx
│   │   ├── wrapped/
│   │   │   ├── WrapCard.tsx      ← base full-screen card
│   │   │   ├── WordCloud.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── GaugeChart.tsx
│   │   │   ├── QuoteCarousel.tsx
│   │   │   └── SummaryCard.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── ProgressBar.tsx
│   │       └── ProgressDots.tsx
│   ├── data/
│   │   └── questions.ts          ← all 50 questions defined here
│   ├── lib/
│   │   ├── supabase.ts           ← Supabase client init
│   │   └── aggregation.ts        ← answer synthesis logic for reveal
│   ├── types/
│   │   └── index.ts              ← shared TypeScript types
│   └── styles/
│       └── index.css             ← Tailwind imports + custom styles
├── public/
│   └── og-image.png              ← social preview image
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

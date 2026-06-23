// Fishbowl demo seed — creates a coherent team at a fictional company so every
// flow is exercisable: individual Wrapped reports, the manager team report, the
// incomplete "waiting" state, and (via a localStorage snippet) the real-time
// "you vs them" nudge. Uses the PUBLIC anon key + the same RPCs the app uses, so
// the DB triggers fire exactly as in production (response_count -> auto report).
//
// Run:  node supabase/seed/seed-demo.mjs
// Idempotency: not idempotent — each run creates fresh sessions. Run once.

const URL = 'https://knftyqkhampkqchoncel.supabase.co'
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZnR5cWtoYW1wa3FjaG9uY2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NDg4MzYsImV4cCI6MjA2NzAyNDgzNn0.fugiTRvgoD3YqAZPQMV3R6Eu0Wx_9vgE6ZK8zjqFutg'
const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const jit = (t, lo, hi, s = 1.2) => clamp(Math.round(t + (Math.random() * 2 - 1) * s), lo, hi)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── REST helpers (same surface the app uses) ──
async function identify(email, name) {
  const r = await fetch(`${URL}/rest/v1/rpc/fishbowl_identify`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ p_email: email, p_name: name }),
  })
  if (!r.ok) throw new Error(`identify ${email}: ${r.status} ${await r.text()}`)
  return await r.json() // uuid (text)
}
async function createSession(name, context, personId, slug) {
  const r = await fetch(`${URL}/rest/v1/fishbowl_sessions`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ creator_name: name, slug, response_count: 0, context, creator_person_id: personId }),
  })
  if (!r.ok) throw new Error(`session ${name}: ${r.status} ${await r.text()}`)
  return (await r.json())[0]
}
async function submit(sessionId, answers) {
  const r = await fetch(`${URL}/rest/v1/rpc/fishbowl_submit_response`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ p_session_id: sessionId, p_answers: answers, p_email: null }),
  })
  if (!r.ok) throw new Error(`submit: ${r.status} ${await r.text()}`)
}
async function hasReport(sessionId) {
  const r = await fetch(`${URL}/rest/v1/fishbowl_ai_insights?session_id=eq.${sessionId}&select=session_id`, { headers: H })
  const rows = await r.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}
async function forceInsights(sessionId) {
  const r = await fetch(`${URL}/functions/v1/fishbowl-ai-insights`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ session_id: sessionId, force: true }),
  })
  return r.ok
}

// Virtue ids 1-10 (1-9 scale, 5 = the virtue). Likert 11-16 (1-5, higher better).
// Scenario 17-19 (exact option strings). Freetext 20-22.
function buildAnswers(p, i) {
  const a = {}
  for (const [id, t] of Object.entries(p.virtues)) a[id] = jit(t, 1, 9)
  for (const [id, t] of Object.entries(p.likert)) a[id] = jit(t, 1, 5)
  // scenarios: persona's dominant choice, with the 5th response nudged for spread
  for (const [id, opts] of Object.entries(p.scenarios)) a[id] = opts[i % opts.length]
  a[20] = p.appreciation[i % p.appreciation.length]
  a[21] = p.growth[i % p.growth.length]
  a[22] = p.message[i % p.message.length]
  return a
}

const COMPANY = 'Northwind, a Series B fintech (~60 people).'

const personas = [
  {
    name: 'Maya Chen', email: 'maya@northwind.test', slug: 'mayademo', n: 5,
    context: `${COMPANY} Maya is VP of Product and a co-founder. Fast-moving, founder-mode.`,
    virtues: { 1: 8, 2: 6, 3: 7, 4: 8, 5: 7, 6: 3, 7: 4, 8: 3, 9: 5, 10: 7 },
    likert: { 11: 5, 12: 4, 13: 5, 14: 4, 15: 3, 16: 4 },
    scenarios: { 17: ['Push hard until they win'], 18: ['Pull all-nighters and burn out'], 19: ['Gets defensive', 'Considers it and adjusts'] },
    appreciation: [
      'Maya gets us unstuck when everyone else is stalling.',
      'Real conviction. When Maya commits to something it happens.',
      "Fearless with leadership, she'll say the thing nobody else will.",
      'Incredible energy, she raises the bar for the whole team.',
      'She makes bold calls and owns them. I trust her to push us forward.',
    ],
    growth: [
      'She runs hot under pressure, a beat to cool down would help.',
      'Sometimes she decides before looping the rest of us in.',
      "More patience when others aren't moving at her speed.",
      'She could pull people along instead of sprinting ahead alone.',
      'Hearing pushback before charging would land better.',
    ],
    message: [
      "Your drive is a gift, just don't burn the team out.",
      "We're with you, you don't have to carry it all at top speed.",
      'People back you more when you let them in on the call.',
      'Trust the team a little earlier in the process.',
      'Your boldness is why we win, temper it with a little calm.',
    ],
  },
  {
    name: 'Sam Rivera', email: 'sam@northwind.test', slug: 'samdemo', n: 5,
    context: `${COMPANY} Sam is a Senior Product Designer and the team's informal peacemaker.`,
    virtues: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 3, 6: 7, 7: 5, 8: 8, 9: 7, 10: 3 },
    likert: { 11: 4, 12: 4, 13: 4, 14: 5, 15: 5, 16: 3 },
    scenarios: { 17: ['Avoid it and let it slide'], 18: ['Quietly hope it works out'], 19: ['Over-corrects and loses their own view'] },
    appreciation: [
      'Sam makes everyone feel heard. The team is calmer with him in the room.',
      'Endlessly thoughtful and generous with his time.',
      'Sam is the glue, he smooths tension before it becomes a problem.',
      'He genuinely listens and adapts, rare and valuable.',
      'Kind and steady, Sam never lets a teammate struggle alone.',
    ],
    growth: [
      'I wish Sam would back his own view more, he gives in too easily.',
      'He avoids hard conversations that would actually help us.',
      "More confidence in his judgment, it's better than he thinks.",
      'Sometimes he says yes to everything and gets overloaded.',
      'He could decide instead of waiting for full consensus.',
    ],
    message: [
      "Your opinion matters, say it even when it's uncomfortable.",
      "We'd back you if you took a stronger stance, please do.",
      "It's okay to say no, protect your own time too.",
      'Trust yourself, your instincts are good.',
      "Don't shrink, the team needs your voice louder.",
    ],
  },
  {
    name: 'Jordan Lee', email: 'jordan@northwind.test', slug: 'jordandemo', n: 5,
    context: `${COMPANY} Jordan is an Engineering Manager over a team of eight.`,
    virtues: { 1: 5, 2: 5, 3: 5, 4: 6, 5: 5, 6: 5, 7: 5, 8: 5, 9: 6, 10: 5 },
    likert: { 11: 5, 12: 5, 13: 5, 14: 4, 15: 4, 16: 5 },
    scenarios: { 17: ['Raise it directly and hear them out'], 18: ['Flag it early and re-plan'], 19: ['Considers it and adjusts'] },
    appreciation: [
      'Jordan is the steady center of the team, unflappable and clear.',
      'Always knows the right next step and says it plainly.',
      'Dependable to the core, Jordan does exactly what they say.',
      'Calm, fair, and clear, the person everyone goes to.',
      'Jordan balances getting it done with getting it right.',
    ],
    growth: [
      'Jordan could take up more space, their judgment deserves it.',
      'So steady I forget to check if they need support.',
      'A bit more visible ambition would suit them.',
      'Could share more of the thinking behind their calls.',
      'Hard to fault, maybe push for the stretch goal more.',
    ],
    message: [
      "You're the anchor here, thank you, and aim higher for yourself too.",
      "Don't undersell how much you hold together.",
      "We'd follow you into bigger bets, go for them.",
      'Your steadiness is rare, keep it and step forward more.',
      'You make hard things look easy, claim that.',
    ],
  },
  {
    name: 'Riley Okafor', email: 'riley@northwind.test', slug: 'rileydemo', n: 5,
    context: `${COMPANY} Riley is a Staff Engineer and the team's tech lead.`,
    virtues: { 1: 6, 2: 8, 3: 6, 4: 7, 5: 6, 6: 4, 7: 8, 8: 4, 9: 3, 10: 4 },
    likert: { 11: 4, 12: 5, 13: 4, 14: 3, 15: 3, 16: 4 },
    scenarios: { 17: ['Push hard until they win', 'Raise it directly and hear them out'], 18: ['Flag it early and re-plan'], 19: ['Considers it and adjusts'] },
    appreciation: [
      "Riley's standards are sky-high and it makes our work genuinely better.",
      'You always know where you stand with Riley, no games.',
      'The most rigorous person here, nothing slips past Riley.',
      'Brilliant and honest, Riley catches what everyone else misses.',
      "When Riley signs off, I know it's actually right.",
    ],
    growth: [
      'The bluntness stings sometimes, a softer delivery would land better.',
      'Riley polishes past the point of useful, we need to ship.',
      'More credit-sharing, a lot of wins are team wins.',
      'Could trust good-enough instead of chasing perfect.',
      'Honesty is great, just wrap it in a little more warmth.',
    ],
    message: [
      'Your standards push us, just remember people have feelings.',
      "Done beats perfect more often than you'd like, trust us.",
      "Share the credit, you're more loved than you realize.",
      'Your honesty is a gift, deliver it with a touch more care.',
      "Ease up half a notch and you'll get even more from us.",
    ],
  },
  {
    // Incomplete on purpose (3/5) → demos the manager "waiting" state. No report.
    name: 'Priya Nair', email: 'priya@northwind.test', slug: 'priyademo', n: 3,
    context: `${COMPANY} Priya is a Product Manager who just joined the team.`,
    virtues: { 1: 5, 2: 5, 3: 6, 4: 6, 5: 5, 6: 6, 7: 6, 8: 5, 9: 5, 10: 5 },
    likert: { 11: 4, 12: 5, 13: 4, 14: 4, 15: 4, 16: 5 },
    scenarios: { 17: ['Raise it directly and hear them out'], 18: ['Flag it early and re-plan'], 19: ['Considers it and adjusts'] },
    appreciation: ['Priya is sharp and asks the questions that matter.', 'Great with clients, very polished.', 'Brings structure to messy projects.'],
    growth: ['Could delegate more.', 'A bit more follow-up on action items.', 'Sometimes over-prepares.'],
    message: ["You're doing great, keep going.", 'Trust the team more.', 'Looking forward to the full picture.'],
  },
]

async function main() {
  console.log('Seeding Northwind demo team…\n')
  for (const p of personas) {
    const pid = await identify(p.email, p.name)
    const sess = await createSession(p.name, p.context, pid, p.slug)
    p._id = sess.id
    for (let i = 0; i < p.n; i++) await submit(sess.id, buildAnswers(p, i))
    console.log(`  ${p.name.padEnd(13)} <${p.email.padEnd(22)}>  /r/${p.slug}  (${p.n} responses${p.n < 5 ? ' — incomplete' : ''})`)
  }

  // The 5-response trigger fires the report async via pg_net. Give it a beat,
  // then force-generate any that haven't landed (and verify each completes).
  console.log('\nWaiting for auto-generated reports…')
  const complete = personas.filter((p) => p.n >= 5)
  for (let attempt = 1; attempt <= 8; attempt++) {
    await sleep(attempt === 1 ? 18000 : 12000)
    const states = await Promise.all(complete.map((p) => hasReport(p._id)))
    const missing = complete.filter((_, i) => !states[i])
    console.log(`  attempt ${attempt}: ${complete.length - missing.length}/${complete.length} reports ready` + (missing.length ? ` — forcing ${missing.map((m) => m.name.split(' ')[0]).join(', ')}` : ''))
    if (!missing.length) break
    await Promise.all(missing.map((m) => forceInsights(m._id)))
  }

  console.log('\n✅ Done. Subject emails for the manager report (/manager-report):')
  for (const p of personas) console.log(`   ${p.email}${p.n < 5 ? '   (incomplete — 3/5)' : ''}`)
}

main().catch((e) => {
  console.error('\n❌ Seed failed:', e.message)
  process.exit(1)
})

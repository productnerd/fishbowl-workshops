// Supabase Edge Function: fishbowl-synthesis
// The deep, cross-referenced "full read": one synthesized portrait that weaves every
// activity together with personality + Jungian archetype, flags self-vs-team gaps,
// names strengths/weaknesses/biases, and ends with how to put it into practice.
// SELF-dependent, so bearer-gated and cached on the self row (ai_synthesis), keyed by
// the team response count. Generated with EXTENDED THINKING for quality.
//
// Deploy: supabase functions deploy fishbowl-synthesis --project-ref knftyqkhampkqchoncel --use-api
// Required secret: ANTHROPIC_API_KEY.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const MODEL = 'claude-opus-4-8'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = { ...cors, 'Content-Type': 'application/json' }
const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: json })
const round = (n: number) => Math.round(n * 10) / 10

async function sha256hex(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function verifyOwner(sb: any, bearer: string, slug: string) {
  if (!bearer || !slug) return { error: 'unauthorized', status: 401 as const }
  const hash = await sha256hex(bearer)
  const { data: sess } = await sb
    .from('fishbowl_subject_sessions')
    .select('id, person_id, expires_at')
    .eq('secret_hash', hash)
    .maybeSingle()
  if (!sess || new Date(sess.expires_at) < new Date()) return { error: 'unauthorized', status: 401 as const }
  const { data: session } = await sb
    .from('fishbowl_sessions')
    .select('id, creator_name, response_count, creator_person_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!session) return { error: 'not found', status: 404 as const }
  if (session.creator_person_id !== sess.person_id) return { error: 'forbidden', status: 403 as const }
  return { session }
}

// Clean dashes and stray whitespace, but PRESERVE paragraph breaks (\n\n) so the
// client can render real paragraphs instead of one wall of text.
const stripDashes = (s: string): string =>
  s
    .replace(/[ \t]*[—–]+[ \t]*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const HAT_NAMES: Record<string, string> = {
  hat_white: 'White (facts & data)', hat_red: 'Red (feelings & intuition)', hat_yellow: 'Yellow (optimism)',
  hat_black: 'Black (caution & risk)', hat_green: 'Green (creativity)', hat_blue: 'Blue (process & meta)',
}
const BELBIN_NAMES: Record<string, string> = {
  plant: 'Plant (ideas)', monitor_evaluator: 'Monitor-Evaluator (judgement)', specialist: 'Specialist',
  shaper: 'Shaper (drive)', implementer: 'Implementer', completer_finisher: 'Completer-Finisher',
  coordinator: 'Co-ordinator', teamworker: 'Teamworker', resource_investigator: 'Resource Investigator',
}
const SDT_NAMES: Record<string, string> = {
  autonomy: 'Autonomy', competence: 'Competence', relatedness: 'Relatedness',
  purpose: 'Purpose', safety: 'Safety', vitality: 'Vitality',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const force = !!body.force
    const arch = body.archetype && typeof body.archetype === 'object' ? body.archetype : null
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const v = await verifyOwner(sb, String(body.bearer || ''), String(body.slug || ''))
    if ('error' in v) return ok({ error: v.error }, v.status)
    const session = v.session
    const n = session.response_count || 0
    const name = session.creator_name || 'they'

    const { data: self } = await sb
      .from('fishbowl_self_assessments')
      .select('big_five, mbti, self_payload, completed, ai_synthesis')
      .eq('session_id', session.id)
      .maybeSingle()
    if (!self || !self.completed) return ok({ synthesis: null, reason: 'no self yet' })

    const { data: ins } = await sb
      .from('fishbowl_ai_insights')
      .select('insights')
      .eq('session_id', session.id)
      .maybeSingle()
    const team: any = ins?.insights
    if (!team || n < 5) return ok({ synthesis: null, reason: 'no team report yet' })

    const cached = self.ai_synthesis
    if (cached && cached.n === n && !force) return ok({ synthesis: cached })

    // ── Assemble every signal, with self vs team overlaid where both exist ──
    const sp = self.self_payload || {}
    const bf = self.big_five || {}
    const selfV = sp.virtues || {}
    const selfEn = sp.energizers || {}
    const selfHats = sp.hats || {}
    const selfBelbin = sp.belbin || {}
    const selfVia: string[] = Array.isArray(sp.via) ? sp.via : []
    const selfJohari: string[] = Array.isArray(sp.johari) ? sp.johari : []
    const selfNohari: string[] = Array.isArray(sp.nohari) ? sp.nohari : []

    const virtueLines = (team.virtues || [])
      .map((vv: any) => {
        const s = typeof selfV[vv.dimension] === 'number' ? selfV[vv.dimension] : null
        const diff = s != null ? round(s - vv.mu) : null
        return { ...vv, self: s, diff }
      })
      .sort((a: any, b: any) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0))

    const teamJohari: string[] = (team.johari?.counts || []).map((c: any) => c.word)
    const johariOpen = teamJohari.filter((w) => selfJohari.includes(w))
    const johariBlind = (team.johari?.counts || []).filter((c: any) => !selfJohari.includes(c.word)).map((c: any) => `${c.word} (${c.count}/${team.johari?.n})`)
    const johariHidden = selfJohari.filter((w) => !teamJohari.includes(w))

    const teamNohari: string[] = (team.nohari?.counts || []).filter((c: any) => c.count >= 2).map((c: any) => c.word)
    const nohariOpen = teamNohari.filter((w) => selfNohari.includes(w))
    const nohariBlind = (team.nohari?.counts || []).filter((c: any) => c.count >= 2 && !selfNohari.includes(c.word)).map((c: any) => `${c.word} (${c.count}/${team.nohari?.n})`)
    const nohariOwned = selfNohari.filter((w) => !teamNohari.includes(w))

    const teamViaIds: string[] = (team.via || []).map((x: any) => x.id)
    const viaMatched = teamViaIds.filter((id) => selfVia.includes(id))
    const viaBlind = (team.via || []).filter((x: any) => !selfVia.includes(x.id)).map((x: any) => `${x.id} (${x.count}/${x.n})`)
    const viaHidden = selfVia.filter((id) => !teamViaIds.includes(id))

    const hatLines = (team.hats || []).map((h: any) => {
      const s = typeof selfHats[h.key] === 'number' ? selfHats[h.key] : null
      return `- ${HAT_NAMES[h.key] || h.key}: team ${round(h.mu)}/9${s != null ? `, you ${s}/9` : ''} (1=too little, 5=ideal, 9=too much)`
    })

    const belbinTotalSelf = Object.values(selfBelbin).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    const belbinLines = (team.belbin || [])
      .sort((a: any, b: any) => b.teamShare - a.teamShare)
      .map((rr: any) => {
        const sp2 = belbinTotalSelf > 0 && selfBelbin[rr.key] ? Math.round((Number(selfBelbin[rr.key]) / belbinTotalSelf) * 100) : null
        return `- ${BELBIN_NAMES[rr.key] || rr.key}: team ${Math.round(rr.teamShare * 100)}%${sp2 != null ? `, you ${sp2}%` : ''}`
      })

    const sdtLines = (team.sdt || [])
      .sort((a: any, b: any) => b.meanPoints - a.meanPoints)
      .map((s: any) => `- ${SDT_NAMES[s.key] || s.key}: ${round(s.meanPoints)} pts (of 20)`)

    const energizerLines = Object.entries(selfEn).map(([id, val]) => `- ${id}: ${val} (-2 drains .. +2 energizes)`)

    const rc = team.radicalCandor
    const responsibilities = (team.responsibilities || []).map((r: any) =>
      `- "${r.label}": team tier ${r.teamTier}/3${(r.notes && r.notes.length) ? ` (${r.notes.map((x: string) => stripDashes(x)).join('; ')})` : ''}`)

    const type = self.mbti?.fullCode || self.mbti?.type || ''
    const nick = self.mbti?.nickname ? ` ("${self.mbti.nickname}")` : ''

    const systemPrompt = `You are writing the centerpiece of a Fishbowl report: a deep, synthesized portrait of ONE person that ties the whole report together. The person self-assessed; their colleagues assessed them anonymously across many activities. This is the long, reflective read, roughly 2 to 4 A4 pages.

You are given, for this one person: their Big Five personality and playful 16-type; their Jungian archetype (with light and shadow); the TEAM's aggregated read across every activity (virtues, at-work competencies, signature strengths, thinking hats, team role, what they fuel in others, feedback style, Johari words, watch-outs, responsibilities, appreciations); and the PERSON's OWN read on the same frameworks, so you can see where self and team agree and diverge.

=== YOUR JOB: SYNTHESIZE, DON'T LIST ===
The report already shows each activity on its own. Do NOT walk through them one by one. Instead find the THROUGH-LINES: the few traits, patterns and tensions that show up again and again across different exercises, and fold the repeated signals into one clear read with no duplication.
CROSS-REFERENCE constantly and explicitly. Whenever two activities point the same way, say so out loud and name both, e.g. "Your team pegs you as a Shaper, which tracks with your high Courage score and the Black hat coming in hot." Use personality and the Jungian archetype as the connective tissue that everything else hangs on.

=== COVER (woven into flowing prose, NOT a bare checklist) ===
1. WHO THEY ARE at the core (lead with this): a synthetic read grounded in personality + archetype + the strongest cross-activity themes.
2. STRENGTHS, summarized and cross-referenced.
3. The WAYS THEY LIKE TO WORK: energy, thinking style (hats), team role (Belbin), what fuels them (SDT), feedback style.
4. The biggest GAPS between how they see themselves and how the team sees them. Blind spots first (the team sees something they don't, including Johari/VIA blind spots and watch-outs they didn't own), then hidden strengths (they are harder on themselves than the team is). Use the pre-sorted gaps.
5. WEAKNESSES and WATCH-OUTS, named kindly but honestly: recurring vices (virtues pushed to an extreme) and the watch-outs colleagues flagged.
6. TENDENCIES and BIASES that likely flow from their profile: an archetype's shadow, a trait taken too far, the decision and social biases their exact mix predicts. Frame these as things to keep in the back of their mind.
7. HOW THEY SHOW UP day to day, in concrete situations (meetings, conflict, slipping deadlines, receiving feedback), drawing on the scenarios, hats and candor.
8. PRACTICE: concrete, specific ways to put all of this to work.

=== VOICE ===
Second person ("you", "your"). Warm, sharp, honest, a little playful, like a perceptive friend who has read everything about you and is leveling with you. Not a consultant, zero corporate-speak, zero horoscope vagueness. Every claim grounded in the data given; specific over generic. It can sting a little where the data is strong, never cruel, never a roast.

=== NO DASHES (critical) ===
Never use an em dash, en dash, double hyphen, or spaced hyphen anywhere. Use commas, periods, or parentheses.

=== FORMATTING FOR SCANNABILITY (important) ===
Write in SHORT paragraphs, 2 to 4 sentences each, separated by a blank line (\\n\\n). NEVER write a wall of text; if a paragraph runs past ~4 sentences, split it. Keep sentences short and punchy.
Wrap the few most important phrases per paragraph in **bold** (the claims someone should catch while skimming). Use *italic* for framework names, playful asides, and soft emphasis. Never bold or italicize a whole sentence. The title and section headings have no bold or italic.

=== OUTPUT (JSON only, no code fences, no prose outside the JSON) ===
{
  "title": "a short, evocative title for this person's read (<= 6 words, no bold, no dashes)",
  "portrait": "3 to 4 SHORT paragraphs (2 to 4 sentences each), ~250 to 350 words, on who they are at their core, grounded in personality + archetype + the strongest cross-activity themes. MUST separate every paragraph with a blank line \\n\\n. With **bold** and *italic*.",
  "sections": [
    { "heading": "Where you shine", "body": "3 to 4 SHORT paragraphs, ~220 to 300 words, cross-referenced across strengths/virtues/appreciations. **bold** and *italic*. MUST put \\n\\n between every paragraph." },
    { "heading": "How you like to work", "body": "energy, thinking style (hats), team role (Belbin), what you fuel in others (SDT), feedback style. 3 to 4 SHORT paragraphs, ~220 to 300 words." },
    { "heading": "You vs. how they see you", "body": "the biggest self-vs-team gaps; blind spots first (Johari/VIA/watch-outs/virtues the team sees and you don't), then hidden strengths where you are harder on yourself than the team is. 3 to 4 SHORT paragraphs, ~220 to 300 words." },
    { "heading": "Watch-outs and vices", "body": "weaknesses named kindly: virtues pushed to an extreme, the watch-outs colleagues flagged. 3 to 4 SHORT paragraphs, ~200 to 280 words." },
    { "heading": "Tendencies and biases to keep in mind", "body": "what the profile predicts: the archetype's shadow, traits taken too far, the decision and social biases your exact mix tends toward. 3 to 4 SHORT paragraphs, ~200 to 280 words." },
    { "heading": "How you show up day to day", "body": "the concrete situational read: how you land in meetings, conflict, slipping deadlines and receiving feedback, drawing on scenarios, hats and candor. 3 to 4 SHORT paragraphs, ~200 to 280 words." }
  ],
  "practice": ["6 to 8 concrete, specific practices. Each 1 to 2 sentences, **bold** the action verb or move."],
  "captions": {
    "strengths": "ONE punchy sentence (<= 18 words) on the through-line of their strengths",
    "virtues": "name BOTH in one line (~22 words ok): (a) which virtues they push PAST the golden mean (run too hot or too cold), AND (b) the single virtue where their OWN rating and the TEAM's differ the most (the biggest self-vs-team gap), said explicitly as a gap.",
    "hats": "ONE sentence on the SHAPE of how they think (which modes run hot, which run cold)",
    "energy": "ONE sentence on what energises vs drains them",
    "youVsTeam": "ONE sentence naming the single biggest self-vs-team gap and what it means",
    "blindspots": "ONE sentence contrasting their biggest blind spot with their biggest hidden strength",
    "watchouts": "ONE sentence on the main watch-out to keep in the back of their mind",
    "responsibilities": "ONE sentence on how the team reads their delivery on what they own",
    "vice": "ONE sentence: which strength, pushed too far, becomes the vice the team feels",
    "rooms": "ONE sentence naming the one situation (conflict / deadline / feedback) where their balance most breaks",
    "lockedDoor": "ONE sentence on how high confidence + low receptiveness keeps a blind spot shut"
  },
  "throughLine": {
    "from": "their archetype in 1 to 3 words (e.g. The Hero)",
    "via": ["one driving trait or signal, <= 4 words", "a second driving trait or signal, <= 4 words"],
    "to": "the ONE core tension this combination creates, second person, <= 14 words"
  },
  "constellation": [ { "label": "a 1 to 3 word name for the shared root theme", "words": ["EXACT blind-spot words from the Johari BLIND / Nohari BLIND / watch-out lists above that share this root", "another"] } ],
  "oneOnOne": ["4 to 6 concrete things to raise in a routine 1:1 with their manager so the report's weaknesses/gaps/watch-outs actually get actioned. EACH is a QUESTION to ask or something to SHARE, grounded in the data, <= 20 words, starting with 'Ask: ' or 'Share: '. Practical, specific, the kind of thing a manager can actually help with."],
  "biases": ["4 to 6 SHORT punchy notes-to-self (<= 9 words each) of the tendencies, blind spots and biases to keep at the back of their mind. No 'Ask/Share' prefix, no bold, just the pattern in plain words (e.g. 'I decide before I loop people in')."]
}
For "constellation": look ONLY at the words the team flagged that the person did NOT own (Johari blind spot, Nohari blind spot, watch-outs). If two or more of them trace to ONE underlying theme, group them into a named constellation (1, at most 2 groups). Use the words VERBATIM as given. If nothing coheres, return an empty array.
=== CAPTIONS + THROUGH-LINE (as important as the prose) ===
Each caption is the single one-line takeaway shown on that visual slide, so it must be SHARP and SPECIFIC to this person, never generic, never just restate the slide's title. Second person, one sentence, <= 18 words, **bold** the key phrase, no dashes.
CRUCIAL: read the ABSOLUTE result AND the self-vs-team gap. Whenever the person and their team meaningfully DISAGREE on that slide's topic (a gap of ~2+ on a 1-9 scale, or a clear blind spot / hidden strength), the caption MUST name that gap, not just the raw number. Where they agree, say what the number means. The through-line is the spine of the whole report: archetype -> two driving signals -> the one tension they create; make "to" sting a little and ring true.
This is a LONG read: aim for roughly 1800 to 2600 words total across portrait + sections + practice (2 to 4 full A4 pages). Rich and specific, cross-referenced, never padded, and never repeat a point already made in another section. Do not stop short.`

    const userPrompt = `SUBJECT: ${name}. Speak TO them in second person; never use their name.

=== PERSONALITY (Big Five, 0-100) ===
Openness ${Math.round(bf.openness ?? 0)}, Conscientiousness ${Math.round(bf.conscientiousness ?? 0)}, Extraversion ${Math.round(bf.extraversion ?? 0)}, Agreeableness ${Math.round(bf.agreeableness ?? 0)}, Neuroticism ${Math.round(bf.neuroticism ?? 0)} (Emotional stability ${Math.round(bf.emotionalStability ?? (100 - (bf.neuroticism ?? 0)))}).
Playful type: ${type}${nick}. (Use this exact type code if you mention it; never recompute or change it from the scores.)

=== JUNGIAN ARCHETYPE ===
${arch ? `${arch.name}: ${arch.essence || ''}\nLight: ${arch.light || ''}\nShadow: ${arch.shadow || ''}${arch.runnerUp ? `\nWith a touch of: ${arch.runnerUp}` : ''}` : '(not available)'}

=== VIRTUES (golden mean; 1-9, 5=ideal balance; sorted by biggest self-vs-team gap) ===
${virtueLines.map((g: any) => `- ${g.name}: team ${round(g.mu)}${g.self != null ? `, you ${g.self}` : ''}${g.diff != null ? ` (diff ${g.diff})` : ''}. Tendency: ${g.tendency}. Poles: ${g.deficientPole} (low) .. ${g.excessivePole} (high).`).join('\n')}

=== AT-WORK COMPETENCIES (team, 1-5) ===
${(team.competencies || []).map((c: any) => `- ${stripDashes(c.statement)}: ${round(c.average)}/5. ${stripDashes(c.interpretation || '')}`).join('\n')}

=== TOP STRENGTHS (team-named) ===
${(team.topStrengths || []).map((s: any) => `- ${s.label}: ${stripDashes(s.blurb || '')}`).join('\n')}

=== WHAT COLLEAGUES MOST APPRECIATE ===
${(team.appreciations || []).map((a: string) => `- ${stripDashes(a)}`).join('\n')}

=== SIGNATURE STRENGTHS (VIA) ===
Both you and team: ${viaMatched.join(', ') || '(none)'}
Team sees, you didn't claim (blind): ${viaBlind.join(', ') || '(none)'}
You claim, team didn't name (hidden): ${viaHidden.join(', ') || '(none)'}

=== JOHARI WORDS ===
Open (both picked): ${johariOpen.join(', ') || '(none)'}
Blind spot (team picked, you didn't): ${johariBlind.join(', ') || '(none)'}
Hidden (you picked, team didn't): ${johariHidden.join(', ') || '(none)'}

=== WATCH-OUTS (Nohari; team words named by 2+ colleagues) ===
Open (both flagged): ${nohariOpen.join(', ') || '(none)'}
Blind spot (team flagged, you didn't): ${nohariBlind.join(', ') || '(none)'}
You own (you flagged, team didn't): ${nohariOwned.join(', ') || '(none)'}

=== THINKING HATS ===
${hatLines.join('\n') || '(none)'}

=== TEAM ROLE (Belbin) ===
${belbinLines.join('\n') || '(none)'}

=== WHAT YOU FUEL IN OTHERS (SDT, team) ===
${sdtLines.join('\n') || '(none)'}

=== FEEDBACK STYLE (Radical Candor, team; 1-9) ===
${rc ? `Care ${round(rc.teamCare)}, Challenge ${round(rc.teamChallenge)}.` : '(none)'}

=== ENERGY (your own read; -2 drains .. +2 energizes) ===
${energizerLines.join('\n') || '(none)'}

=== RESPONSIBILITIES (team tier 1=under, 2=meets, 3=exceeds) ===
${responsibilities.join('\n') || '(none)'}

Return the JSON now.`

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return ok({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 26000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!claudeRes.ok) {
      const details = await claudeRes.text()
      return ok({ error: 'claude api error', status: claudeRes.status, details }, 502)
    }

    const claudeJson = await claudeRes.json()
    const textBlock = Array.isArray(claudeJson.content) ? claudeJson.content.find((b: any) => b.type === 'text') : null
    let raw = (textBlock?.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    // Keep only the outermost JSON object (the model sometimes adds a stray word around it).
    const first = raw.indexOf('{')
    const last = raw.lastIndexOf('}')
    if (first >= 0 && last > first) raw = raw.slice(first, last + 1)
    let prose: any
    try {
      prose = JSON.parse(raw)
    } catch {
      // Fallback: the model put literal newlines inside string values. Escape any
      // newline/tab/CR that sits inside a JSON string and retry once.
      try {
        let inStr = false, esc = false, out = ''
        for (const ch of raw) {
          if (esc) { out += ch; esc = false; continue }
          if (ch === '\\') { out += ch; esc = true; continue }
          if (ch === '"') { inStr = !inStr; out += ch; continue }
          if (inStr && ch === '\n') { out += '\\n'; continue }
          if (inStr && ch === '\r') { out += '\\r'; continue }
          if (inStr && ch === '\t') { out += '\\t'; continue }
          out += ch
        }
        prose = JSON.parse(out)
      } catch {
        return ok({ error: 'parse error', raw: raw.slice(0, 1200), stop: claudeJson.stop_reason }, 502)
      }
    }

    // One-line, per-slide takeaways: keep them tidy (no newlines, dashes cleaned).
    const oneLine = (v: any) => stripDashes(String(v ?? '')).replace(/\s+/g, ' ').trim()
    const CAP_KEYS = ['strengths', 'virtues', 'hats', 'energy', 'youVsTeam', 'blindspots', 'watchouts', 'responsibilities', 'vice', 'rooms', 'lockedDoor']
    const rawCaps = prose.captions && typeof prose.captions === 'object' ? prose.captions : {}
    const captions: Record<string, string> = {}
    for (const k of CAP_KEYS) {
      const c = oneLine(rawCaps[k])
      if (c) captions[k] = c
    }
    const tl = prose.throughLine && typeof prose.throughLine === 'object' ? prose.throughLine : null
    const throughLine = tl
      ? {
          from: oneLine(tl.from).slice(0, 40),
          via: (Array.isArray(tl.via) ? tl.via : []).map((s: any) => oneLine(s).slice(0, 44)).filter(Boolean).slice(0, 2),
          to: oneLine(tl.to),
        }
      : null
    const constellation = (Array.isArray(prose.constellation) ? prose.constellation : [])
      .filter((c: any) => c && c.label && Array.isArray(c.words))
      .map((c: any) => ({ label: oneLine(c.label).slice(0, 30), words: c.words.map((w: any) => oneLine(w)).filter(Boolean).slice(0, 5) }))
      .filter((c: any) => c.words.length >= 2)
      .slice(0, 2)
    const oneOnOne = (Array.isArray(prose.oneOnOne) ? prose.oneOnOne : []).map((s: any) => oneLine(s)).filter(Boolean).slice(0, 6)
    const biases = (Array.isArray(prose.biases) ? prose.biases : []).map((s: any) => oneLine(s)).filter(Boolean).slice(0, 6)

    const synthesis = {
      title: stripDashes(String(prose.title || 'Your full read')),
      portrait: stripDashes(String(prose.portrait || '')),
      sections: (Array.isArray(prose.sections) ? prose.sections : [])
        .filter((s: any) => s && s.heading && s.body)
        .map((s: any) => ({ heading: stripDashes(String(s.heading)), body: stripDashes(String(s.body)) }))
        .slice(0, 6),
      practice: (Array.isArray(prose.practice) ? prose.practice : []).map((s: any) => stripDashes(String(s))).slice(0, 8),
      captions,
      ...(throughLine && throughLine.to && throughLine.via.length ? { throughLine } : {}),
      ...(constellation.length ? { constellation } : {}),
      ...(oneOnOne.length ? { oneOnOne } : {}),
      ...(biases.length ? { biases } : {}),
      n,
    }

    await sb.from('fishbowl_self_assessments').update({ ai_synthesis: synthesis }).eq('session_id', session.id)
    return ok({ synthesis })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})

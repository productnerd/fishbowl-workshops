// Which topic a given fishbowl was created for.
//
// `fishbowl_sessions` has no topic column yet (see the P0 schema in
// docs/workshops-architecture.md, and supabase/migrations/0001_topics.sql for the migration
// that adds it). Until that runs, the creating device remembers the mapping so the share
// link it builds carries the topic. The topic also travels IN the link itself, so a
// respondent opening it on any device gets the right survey; this store only exists so the
// subject's own dashboard can rebuild that link later.
const KEY = 'fishbowl_session_topics'

type Map_ = Record<string, string>

const read = (): Map_ => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Map_) : {}
  } catch {
    return {}
  }
}

export function rememberSessionTopic(slug: string, topicKey: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [slug]: topicKey }))
  } catch {
    // A full or blocked localStorage just means the dashboard falls back to the default
    // topic when rebuilding the link. Not worth surfacing.
  }
}

export const sessionTopicKey = (slug: string | undefined): string | null =>
  (slug && read()[slug]) || null

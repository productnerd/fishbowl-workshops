// Unambiguous slug alphabet (no 0/o/1/l) for shareable links.
export function generateSlug(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let slug = ''
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

// Hash-router share link, base-path aware (origin + pathname + #/s/<slug>).
export function buildShareLink(slug: string): string {
  const base = window.location.origin + window.location.pathname
  return `${base}#/s/${slug}`
}

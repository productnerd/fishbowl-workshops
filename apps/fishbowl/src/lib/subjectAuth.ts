// The subject's device-portable bearer (minted on magic-link claim). Person-scoped:
// the edge fn enforces which sessions it owns, so we don't filter by slug here.
const KEY = 'fishbowl_subject_auth'

export interface SubjectAuth {
  bearer: string
  person_id: string
  slug: string
}

export function getSubjectAuth(): SubjectAuth | null {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) return null
    const a = JSON.parse(s)
    return a?.bearer ? (a as SubjectAuth) : null
  } catch {
    return null
  }
}

export function setSubjectAuth(a: SubjectAuth) {
  localStorage.setItem(KEY, JSON.stringify(a))
}

// Drop a dead/invalid device key so the app can re-establish identity instead of
// looping on a bearer whose server-side session was deleted or expired.
export function clearSubjectAuth() {
  localStorage.removeItem(KEY)
}

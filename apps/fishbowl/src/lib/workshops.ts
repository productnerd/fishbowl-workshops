// Trainer-side client for the fishbowl-workshops edge function.
//
// Everything here is bearer-gated except `peek` and `join`, which a participant hits as a
// stranger holding nothing but an invite link.
import { supabase } from './supabase'
import { getSubjectAuth } from './subjectAuth'

export interface WorkshopSummary {
  id: string
  name: string
  clientName: string | null
  topicKey: string
  inviteToken: string
  opensAt: string | null
  closesAt: string | null
  createdAt: string
  joined: number
  reports: number
}

/** What a trainer is allowed to know about one participant: progress, never content. */
export interface Participant {
  id: string
  displayName: string | null
  joinedAt: string
  responseCount: number
  selfDone: boolean
  reportReadyAt: string | null
}

export interface WorkshopDetail {
  id: string
  name: string
  clientName: string | null
  topicKey: string
  config: WorkshopConfig | null
  inviteToken: string
  opensAt: string | null
  closesAt: string | null
  createdAt: string
}

/**
 * A trainer's customisation of a topic. Composition only for now: which modules run, how
 * long, and who counts as a persona. Rewording individual questions comes with the deeper
 * builder. Absent fields mean "whatever the topic says".
 */
export interface WorkshopConfig {
  length?: string
  modules?: string[]
  personas?: string[]
  minResponses?: number
}

const call = async <T>(body: Record<string, unknown>): Promise<T | { error: string }> => {
  const { data, error } = await supabase.functions.invoke('fishbowl-workshops', { body })
  if (error) return { error: error.message }
  return data as T
}

const withBearer = (body: Record<string, unknown>) => {
  const auth = getSubjectAuth()
  return { ...body, bearer: auth?.bearer ?? '' }
}

export const listWorkshops = () =>
  call<{ workshops: WorkshopSummary[] }>(withBearer({ mode: 'list' }))

export const createWorkshop = (input: {
  name: string
  client_name?: string
  topic_key: string
  config?: WorkshopConfig
}) => call<{ id: string; inviteToken: string }>(withBearer({ mode: 'create', ...input }))

export const workshopDetail = (workshopId: string) =>
  call<{ workshop: WorkshopDetail; participants: Participant[] }>(
    withBearer({ mode: 'detail', workshop_id: workshopId })
  )

export const updateWorkshop = (workshopId: string, patch: Record<string, unknown>) =>
  call<{ updated: true }>(withBearer({ mode: 'update', workshop_id: workshopId, ...patch }))

/** Public: what an invite link points at, before the participant has identified themselves. */
export const peekWorkshop = (inviteToken: string) =>
  call<{ workshop: { name: string; clientName: string | null; topicKey: string; config: WorkshopConfig | null } }>(
    { mode: 'peek', invite_token: inviteToken }
  )

/** Public: attach a freshly created fishbowl to the workshop that invited it. */
export const joinWorkshop = (inviteToken: string, sessionId: string, displayName: string) =>
  call<{ joined: true }>({
    mode: 'join',
    invite_token: inviteToken,
    session_id: sessionId,
    display_name: displayName,
  })

export const inviteLink = (token: string): string => {
  const base = window.location.origin + window.location.pathname
  return `${base}#/j/${token}`
}

/**
 * Email a trainer a link to their workshops. Uses the same magic-link stack as everything
 * else, with `purpose: 'trainer'` so it authenticates the person rather than pointing at a
 * fishbowl they may not have. Always resolves: the function never reveals whether an
 * address is known.
 */
export async function trainerSignIn(email: string): Promise<{ sent: boolean; devClaimUrl?: string }> {
  const { data, error } = await supabase.functions.invoke('fishbowl-send-magic-link', {
    body: {
      email: email.trim(),
      slug: '',
      purpose: 'trainer',
      // So the emailed link returns to whichever app they signed in from.
      app_url: window.location.origin + window.location.pathname,
    },
  })
  // `devClaimUrl` only comes back while FISHBOWL_DEV_CLAIM is set on the server: the link
  // is handed over directly instead of emailed, so the flow is testable without mail.
  return { sent: !error && Boolean(data?.sent), devClaimUrl: data?.devClaimUrl }
}

/** Whether the server is handing out claim links instead of emailing them. */
export async function trainerTestMode(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('fishbowl-send-magic-link', {
    body: { purpose: 'devcheck' },
  })
  return !error && Boolean(data?.devClaim)
}

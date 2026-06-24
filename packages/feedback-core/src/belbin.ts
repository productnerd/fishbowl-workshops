// Belbin Team Roles. The nine ways people contribute in a team, grouped into
// three clusters (Thinking / Action / People). The subject and colleagues each
// spend a 20-chip budget across the nine roles; the report ranks roles by the
// team's chip share and overlays the subject's own allocation.

export interface BelbinRole {
  key: string
  name: string
  cluster: 'Thinking' | 'Action' | 'People'
  short: string
}

// Modern 9-role set (includes Specialist; not the older 8). Hyphens kept in
// "Completer-Finisher" and "Co-ordinator" per the canonical naming.
export const BELBIN_ROLES: BelbinRole[] = [
  // Thinking — "the brains"
  { key: 'plant', name: 'Plant', cluster: 'Thinking', short: 'Creative, imaginative, free-thinking; generates ideas and solves hard problems.' },
  { key: 'monitor_evaluator', name: 'Monitor Evaluator', cluster: 'Thinking', short: 'Sober, strategic, discerning; weighs the options and judges accurately.' },
  { key: 'specialist', name: 'Specialist', cluster: 'Thinking', short: 'Single-minded, self-starting, dedicated; brings deep knowledge in a narrow area.' },
  // Action — "the doers"
  { key: 'shaper', name: 'Shaper', cluster: 'Action', short: 'Challenging, dynamic, thrives on pressure; drives the team to push through.' },
  { key: 'implementer', name: 'Implementer', cluster: 'Action', short: 'Practical, reliable, efficient; turns ideas into workable actions.' },
  { key: 'completer_finisher', name: 'Completer-Finisher', cluster: 'Action', short: 'Painstaking, conscientious, anxious; polishes and perfects, catching errors.' },
  // People — "the glue"
  { key: 'coordinator', name: 'Co-ordinator', cluster: 'People', short: 'Mature, confident, a natural chair; clarifies goals and delegates well.' },
  { key: 'teamworker', name: 'Teamworker', cluster: 'People', short: 'Co-operative, perceptive, diplomatic; listens and smooths friction.' },
  { key: 'resource_investigator', name: 'Resource Investigator', cluster: 'People', short: 'Outgoing, enthusiastic, communicative; explores opportunities and contacts.' },
]

// Total chips each respondent allocates across the nine roles.
export const BELBIN_TOTAL = 20

// Cluster → riso ink. Thinking=blue and Action=pink are the brand pair; People
// needs a third ink. The theme has no warm-yellow/ochre token, so the warmest
// distinct ink available (sand-deep, an ochre-ish tan #d3bf96) stands in for the
// proposed "warm yellow/ochre" People cluster. Values are bare tokens — consumers
// compose them (e.g. `bg-${tone}`, `text-${tone}`).
export const CLUSTER_TONE: Record<string, string> = {
  Thinking: 'blue',
  Action: 'pink',
  People: 'sand-deep',
}

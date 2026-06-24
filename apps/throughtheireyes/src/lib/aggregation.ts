import { aggregateResponses as coreAggregate, topMcAnswers } from '@fishbowl/feedback-core'
import { questions } from '../data/questions'

// App-local binding: bind the generic aggregator to THIS app's question set,
// so callers keep the original (responses, creatorName) signature.
export function aggregateResponses(
  responses: Array<{ answers: Record<number, string | number> }>,
  creatorName: string
) {
  return coreAggregate(responses, questions, creatorName)
}

export { topMcAnswers }

/**
 * LLM Prompt Templates for Mha Phu La? recommendation system.
 *
 * Designed for a 1.5B-Instruct class model (e.g. WebLLM / Llama-3.2-1B-Instruct).
 * All outputs are structured JSON to keep parsing deterministic.
 *
 * Usage pattern:
 *   1. Feed the rendered prompt to the LLM
 *   2. Parse the JSON response
 *   3. Merge with rule-based scores (LLM output is additive, not authoritative)
 *   4. Fall back to defaults if JSON parse fails or model times out
 */

// ---------------------------------------------------------------------------
// 1. User profile tag extraction
// ---------------------------------------------------------------------------

/**
 * Extracts preference tags from a user's free-text bio.
 * Used once during onboarding or when bio is updated.
 * Output merged with explicit interest selections.
 */
export function buildProfileTagPrompt(bio: string, age: number | null): string {
  return `You are a mental-health app assistant. Extract preference tags from this user profile.

User bio: "${bio}"
User age: ${age ?? 'unknown'}

Return ONLY valid JSON in this exact format, no explanation:
{
  "preference_tags": ["tag1", "tag2"],
  "inferred_interests": ["interest1", "interest2"],
  "tone": "introvert" | "extrovert" | "mixed",
  "activity_level": "active" | "quiet" | "mixed",
  "support_needs": ["need1", "need2"]
}

Rules:
- preference_tags: 3-8 lowercase keywords from the bio (e.g. "meditation", "walking", "journaling")
- inferred_interests: lifestyle interests implied by the text (e.g. "Art", "Yoga", "Coffee")
- tone: whether the person seems socially oriented or more private
- activity_level: whether they prefer active or calm activities
- support_needs: ONLY use safe general terms like "peer support", "stress management", "mindfulness". Never infer diagnoses.
- If bio is empty or uninformative, return empty arrays and "mixed" for tone/activity_level.`
}

// ---------------------------------------------------------------------------
// 2. Event tag extraction
// ---------------------------------------------------------------------------

/**
 * Enriches event tags from its title + description.
 * Run once per event at generation time, or lazily on first view.
 * Output supplements the static tags[] array in MHEvent.
 */
export function buildEventTagPrompt(title: string, description: string, category: string): string {
  return `You are a mental-health event classifier. Extract structured tags from this event.

Event title: "${title}"
Category: "${category}"
Description: "${description}"

Return ONLY valid JSON in this exact format, no explanation:
{
  "tags": ["tag1", "tag2"],
  "vibe_tags": ["calm" | "energetic" | "reflective" | "social" | "structured" | "creative"],
  "support_tags": ["peer support" | "professional led" | "self-guided" | "group sharing" | "skill building"],
  "suitable_for": ["beginners" | "all levels" | "experienced"],
  "format_hint": "virtual" | "offline" | "either"
}

Rules:
- tags: 3-6 lowercase keywords describing the event's focus
- vibe_tags: 1-3 vibe descriptors from the allowed list only
- support_tags: 1-2 support type descriptors from the allowed list only
- suitable_for: who the event is targeted at
- format_hint: inferred from description context`
}

// ---------------------------------------------------------------------------
// 3. Recommendation explanation
// ---------------------------------------------------------------------------

/**
 * Generates a human-readable explanation for why an event was recommended.
 * Input: structured score breakdown + event + user context.
 * The rule-based engine already produces a fallback explanation.
 * This LLM call is optional and improves quality when latency allows.
 */
export function buildRecommendationExplanationPrompt(params: {
  eventTitle: string
  eventCategory: string
  userInterests: string[]
  matchedTags: string[]
  distanceKm: number | null
  scoreBreakdown: { interest: number; support: number; behavior: number; location: number }
  userTone?: string
}): string {
  const { eventTitle, eventCategory, userInterests, matchedTags, distanceKm, scoreBreakdown, userTone } = params

  return `You are a mental-health app assistant writing a short, warm recommendation reason.

Event: "${eventTitle}" (${eventCategory})
User interests: ${userInterests.join(', ') || 'none listed'}
Matching tags: ${matchedTags.join(', ') || 'none'}
Distance: ${distanceKm != null ? `${distanceKm.toFixed(1)} km away` : 'unknown'}
Score breakdown: interest=${scoreBreakdown.interest.toFixed(2)}, support=${scoreBreakdown.support.toFixed(2)}, behavior=${scoreBreakdown.behavior.toFixed(2)}, location=${scoreBreakdown.location.toFixed(2)}
User personality tone: ${userTone ?? 'unknown'}

Return ONLY valid JSON:
{
  "short_reason": "one sentence, warm, 10-15 words max",
  "detail": "optional second sentence if score is very high (>0.7), else null"
}

Rules:
- Be warm and encouraging, never clinical
- Never mention scores or numbers
- Never reference mental health diagnoses or conditions
- Focus on what makes the event a good match (interest, proximity, group type, timing)`
}

// ---------------------------------------------------------------------------
// 4. Moderation assistance
// ---------------------------------------------------------------------------

/**
 * Classifies a user post to check for content that may need moderation.
 * Used as a pre-filter before human review — NOT a final decision.
 * Designed to be privacy-preserving: no user ID is included in the prompt.
 */
export function buildModerationPrompt(content: string): string {
  return `You are a content safety classifier for a mental-health peer support app.

Post content: "${content}"

Return ONLY valid JSON in this exact format, no explanation:
{
  "flag": true | false,
  "severity": "none" | "low" | "medium" | "high",
  "categories": [],
  "reason": "brief reason if flagged, else null",
  "suggested_action": "none" | "soft_warn" | "human_review" | "immediate_escalate"
}

Severity guide:
- none: safe, supportive, no concerns
- low: mildly negative language, venting — no action needed, note for patterns
- medium: distress signals, mentions of feeling hopeless — soft_warn or human_review
- high: explicit self-harm, harm to others, crisis language — immediate_escalate

Categories (only include if applicable):
"self-harm-language" | "crisis-signal" | "harmful-advice" | "stigmatizing-language" | "spam" | "inappropriate"

Rules:
- You are an assistant to a human moderator, not the final decision
- When uncertain, lean toward human_review not immediate_escalate
- Never flag general expressions of sadness, stress, or frustration
- Privacy: no user identification information should be in the output`
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse LLM JSON output with a typed fallback.
 */
export function parseLLMJson<T>(raw: string, fallback: T): T {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

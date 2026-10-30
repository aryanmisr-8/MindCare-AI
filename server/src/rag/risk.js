// Crisis/risk detection — deliberately a weighted combination of signals rather
// than a single keyword trigger, per the algorithm analysis (Section 3.3): a pure
// keyword classifier over free text produces both false positives (distress
// language is not the same as intent) and false negatives (indirect expression).
//
// This module only ever produces a coarse severity tier used to route the person
// toward help faster. It is not a diagnostic tool and must never gate or delay
// the emergency pathway behind further conversation.

// General distress/crisis phrases — intentionally broad and non-exhaustive; this
// is a recall-oriented first-pass signal, not the sole basis for any decision.
const HIGH_RISK_PHRASES = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'end it all',
  'want to die', 'better off dead', 'no reason to live', 'can\u2019t go on',
  'cant go on', 'hurt myself', 'harm myself', 'self harm', 'self-harm'
];

const ELEVATED_PHRASES = [
  'hopeless', 'worthless', 'can\u2019t cope', 'cant cope', 'giving up',
  'no one would care', 'nothing matters', 'trapped', 'burden to everyone'
];

function lexicalSignal(freeText) {
  if (!freeText) return { tier: 'none', matched: [] };
  const lower = freeText.toLowerCase();
  const highMatches = HIGH_RISK_PHRASES.filter((p) => lower.includes(p));
  if (highMatches.length > 0) return { tier: 'immediate', matched: highMatches };
  const elevatedMatches = ELEVATED_PHRASES.filter((p) => lower.includes(p));
  if (elevatedMatches.length > 0) return { tier: 'elevated', matched: elevatedMatches };
  return { tier: 'none', matched: [] };
}

/**
 * Combine the free-text lexical signal with any structured item-level flag
 * (e.g. a PHQ-9 self-harm item) that was true for this user's most recent
 * screening. Either signal alone can raise the tier — neither is required to
 * "confirm" the other, so an indirect expression isn't dismissed just because
 * a questionnaire wasn't also flagged.
 */
function assessRisk({ freeText, recentItemLevelFlag }) {
  const lexical = lexicalSignal(freeText);
  let tier = lexical.tier;
  if (recentItemLevelFlag && tier === 'none') tier = 'elevated';
  if (recentItemLevelFlag && tier === 'elevated') tier = 'immediate';

  return {
    tier, // 'none' | 'elevated' | 'immediate'
    signals: { lexicalMatched: lexical.matched, itemLevelFlag: !!recentItemLevelFlag }
  };
}

const CRISIS_RESOURCES = {
  helpline: { name: 'Tele-MANAS (India, 24/7, free, multilingual)', number: '14416' },
  emergency: 'If you or someone else is in immediate danger, please call 112 (India\u2019s national emergency number) or go to the nearest emergency room.'
};

module.exports = { assessRisk, CRISIS_RESOURCES };

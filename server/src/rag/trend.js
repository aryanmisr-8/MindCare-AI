// Dual-window moving average trend detector (Section 3.6). Deliberately simple and
// auditable rather than a black-box model, because a user-facing wellbeing trend
// needs to be explainable on demand ("why is the app showing this").

function movingAverage(series, window) {
  if (series.length === 0) return [];
  const out = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
    if (i >= window) sum -= series[i - window];
    const count = Math.min(i + 1, window);
    out.push(sum / count);
  }
  return out;
}

/**
 * points: array of { value, at } ordered oldest -> newest (e.g. daily mood scores)
 * Returns null (NoTrend) or a TrendFlag describing direction/magnitude — phrased
 * as a pattern change, never a diagnosis or a causal claim.
 */
function detectTrend(points, { windowShort = 7, windowLong = 30, changeThreshold = 1.0, minDuration = 4 } = {}) {
  if (points.length < Math.min(windowShort, points.length)) return null;
  const values = points.map((p) => p.value);
  const shortAvg = movingAverage(values, windowShort);
  const longAvg = movingAverage(values, windowLong);

  const delta = shortAvg[shortAvg.length - 1] - longAvg[longAvg.length - 1];
  if (Math.abs(delta) < changeThreshold) return null;

  // Sustained-change check: require the same-direction delta to hold for the last
  // `minDuration` points, not just a single-day blip.
  let sustainedCount = 0;
  for (let i = shortAvg.length - 1; i >= 0 && sustainedCount < minDuration; i--) {
    const d = shortAvg[i] - longAvg[i];
    if (Math.sign(d) === Math.sign(delta) && Math.abs(d) >= changeThreshold * 0.6) {
      sustainedCount++;
    } else {
      break;
    }
  }
  if (sustainedCount < minDuration) return null;

  return {
    direction: delta > 0 ? 'up' : 'down',
    magnitude: Number(delta.toFixed(2)),
    note: 'This reflects a pattern change over time, not a diagnosis or a cause.'
  };
}

module.exports = { detectTrend, movingAverage };

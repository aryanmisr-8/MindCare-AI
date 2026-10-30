// MindCare AI — Patient Clinical Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuthOrRedirect();
  const user = Auth.getUser();

  const heading = document.getElementById('welcome-heading');
  if (heading && user) {
    heading.textContent = `Welcome, ${user.displayName || user.email}`;
  }

  // Fetch Screening Sessions
  try {
    const { sessions } = await apiFetch('/screenings/sessions');
    const latestEl = document.getElementById('latest-screening');
    const dateEl = document.getElementById('screening-date');
    const tbody = document.querySelector('#sessions-table tbody');

    if (!sessions || sessions.length === 0) {
      latestEl.innerHTML = `
        <div style="color:var(--text-muted);font-size:0.9rem;">
          No screening sessions recorded yet. Start with a baseline PHQ-9 or GAD-7 assessment.
        </div>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">
            No assessment history found. Take your first standardized screening to begin tracking.
          </td>
        </tr>
      `;
    } else {
      const latest = sessions[0];
      if (dateEl) dateEl.textContent = formatDate(latest.created_at);

      latestEl.innerHTML = `
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px;">
          <span style="font-family:'Outfit',sans-serif;font-size:2.2rem;font-weight:800;color:var(--accent-primary);">
            ${latest.total_score}
          </span>
          <b style="font-size:1.1rem;color:var(--text-primary);">${escapeHtml(latest.instrument_code)}</b>
        </div>
        <div style="font-size:0.88rem;color:var(--text-secondary);">
          Severity: <span class="pill pill-teal" style="font-size:0.75rem;margin-left:4px;">${escapeHtml(latest.severity_band)}</span>
        </div>
      `;

      tbody.innerHTML = sessions.slice(0, 15).map((s) => `
        <tr>
          <td><b style="color:var(--accent-primary);">${escapeHtml(s.instrument_code)}</b></td>
          <td><b style="font-size:1.05rem;color:var(--text-primary);">${s.total_score}</b></td>
          <td><span class="pill pill-teal" style="font-size:0.72rem;">${escapeHtml(s.severity_band)}</span></td>
          <td>${s.risk_flag ? '<span class="pill pill-unverified" style="color:var(--alert-red);border-color:var(--alert-red-border);">Flagged</span>' : '<span style="color:var(--text-muted);font-size:0.8rem;">Clear</span>'}</td>
          <td style="color:var(--text-secondary);font-size:0.86rem;">${formatDate(s.created_at)}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    document.getElementById('latest-screening').innerHTML = `<p style="color:var(--alert-red);font-size:0.85rem;">${escapeHtml(err.message)}</p>`;
  }

  // Fetch Mood & Anxiety Trend
  try {
    const { trend, pointCount } = await apiFetch('/journal/trend?metric=mood_score');
    const moodEl = document.getElementById('mood-trend');

    if (pointCount === 0) {
      moodEl.innerHTML = `
        <div style="color:var(--text-muted);font-size:0.9rem;">
          No journal data logged yet. Regular entries build emotional pattern recognition.
        </div>
      `;
    } else if (!trend) {
      moodEl.innerHTML = `
        <div style="font-size:0.95rem;color:var(--text-primary);margin-bottom:4px;">
          <b>${pointCount} check-in${pointCount > 1 ? 's' : ''} logged</b>
        </div>
        <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">
          Sustained baseline. Continue logging daily to evaluate trajectory shifts.
        </p>
      `;
    } else {
      const isUp = trend.direction === 'up';
      moodEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:1.4rem;">${isUp ? '📈' : '📉'}</span>
          <b style="font-size:1.1rem;color:${isUp ? '#34d399' : '#f59e0b'};">
            Mood trending ${isUp ? 'upward' : 'downward'}
          </b>
        </div>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">
          ${escapeHtml(trend.note)}
        </p>
      `;
    }
  } catch (err) {
    document.getElementById('mood-trend').innerHTML = `<p style="color:var(--alert-red);font-size:0.85rem;">${escapeHtml(err.message)}</p>`;
  }
});

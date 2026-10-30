// MindCare AI — Peer-Reviewed Evidence Library Logic

async function searchPapers() {
  const mount = document.getElementById('papers-mount');
  const params = new URLSearchParams();
  const q = document.getElementById('q')?.value.trim();
  const condition = document.getElementById('condition')?.value;
  const type = document.getElementById('type')?.value;

  if (q) params.set('q', q);
  if (condition) params.set('condition', condition);
  if (type) params.set('type', type);

  mount.innerHTML = `
    <div class="card" style="text-align:center;padding:40px;">
      <p style="color:var(--text-muted);">Searching scientific corpus…</p>
    </div>
  `;

  try {
    const { papers } = await apiFetch(`/papers?${params.toString()}`, { auth: false });

    if (!papers || papers.length === 0) {
      mount.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;">
          <h3>No matching studies found</h3>
          <p>Try clearing condition or evidence-type filters to broaden your search.</p>
        </div>
      `;
      return;
    }

    mount.innerHTML = papers.map((p) => {
      const typeLabels = {
        meta_analysis: 'Level 1 · Meta-Analysis',
        systematic_review: 'Systematic Review',
        rct: 'Randomized Controlled Trial',
        cohort_study: 'Cohort Study',
        guideline: 'Clinical Guideline'
      };
      const typeLabel = typeLabels[p.evidence_type] || p.evidence_type || 'Study';

      return `
        <div class="card card-glow-teal" style="padding:28px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="pill pill-teal">${escapeHtml(typeLabel)}</span>
              ${p.open_access ? '<span class="pill pill-verified">Open Access</span>' : ''}
              ${(p.condition_tags || []).map((t) => `<span class="pill pill-outline" style="font-size:0.7rem;">#${escapeHtml(t)}</span>`).join('')}
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);">
              Year: <b style="color:var(--text-primary);">${p.year || 'Recent'}</b>
            </div>
          </div>

          <h3 style="font-size:1.22rem;line-height:1.4;margin-bottom:10px;color:var(--text-primary);">
            ${escapeHtml(p.title)}
          </h3>

          <div style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px;">
            <b>Authors:</b> ${escapeHtml(p.authors || 'Collaborative Research Group')} · 
            <span style="color:var(--accent-primary);">Journal: ${escapeHtml(p.source || 'Medical Index')}</span>
          </div>

          <div style="background:rgba(0,0,0,0.25);border-left:3px solid var(--accent-primary);padding:14px 18px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;margin-bottom:16px;">
            <div style="font-size:0.8rem;font-weight:700;color:var(--accent-primary);text-transform:uppercase;margin-bottom:4px;">
              Key Clinical Finding / Summary
            </div>
            <p style="margin:0;font-size:0.92rem;color:var(--text-primary);line-height:1.55;">
              ${escapeHtml(p.plain_summary || p.outcome_summary || '')}
            </p>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.82rem;color:var(--text-muted);margin-bottom:16px;">
            <div><b>Study Cohort / Population:</b> ${escapeHtml(p.population || 'Documented clinical cohort')}</div>
            <div><b>Documented Limitations:</b> ${escapeHtml(p.limitations || 'Per published protocol')}</div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid var(--line);font-size:0.8rem;flex-wrap:wrap;gap:10px;">
            <span style="color:var(--text-muted);">Verified Review: ${p.review_date ? formatDate(p.review_date) : 'Archived'}</span>
            ${p.doi_or_url ? `
              <a href="${escapeHtml(p.doi_or_url)}" target="_blank" rel="noopener" class="btn btn-outline-teal btn-sm">
                View Original Paper &rarr;
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    mount.innerHTML = `<div class="card"><p style="color:var(--alert-red);">${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  searchPapers();

  document.getElementById('search-btn')?.addEventListener('click', searchPapers);
  document.getElementById('condition')?.addEventListener('change', searchPapers);
  document.getElementById('type')?.addEventListener('change', searchPapers);

  const q = document.getElementById('q');
  if (q) {
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchPapers();
    });
  }
});

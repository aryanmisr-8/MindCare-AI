// MindCare AI — AES-256 Encrypted Journal & RAG Reflection Interface

function bindSlider(id) {
  const input = document.getElementById(id);
  const label = document.getElementById(`${id}-val`);
  if (!input || !label) return;
  input.addEventListener('input', () => { label.textContent = input.value; });
}

async function loadEntries() {
  const mount = document.getElementById('entries-mount');
  try {
    const { entries } = await apiFetch('/journal/entries');
    if (entries.length === 0) {
      mount.innerHTML = `
        <div class="card" style="text-align:center;padding:36px;color:var(--text-muted);">
          No journal records saved yet. Your encrypted thoughts will appear here chronologically.
        </div>
      `;
      return;
    }

    mount.innerHTML = entries.map((e) => `
      <div class="card" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:0.84rem;color:var(--text-muted);">
            📅 ${formatDate(e.createdAt)}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span class="pill pill-teal" style="font-size:0.72rem;">Mood: ${e.moodScore ?? '—'}/10</span>
            <span class="pill pill-community" style="font-size:0.72rem;">Anxiety: ${e.anxietyScore ?? '—'}/10</span>
            <span class="pill pill-claimed" style="font-size:0.72rem;">Energy: ${e.energyScore ?? '—'}/10</span>
            ${e.sleepHours != null ? `<span class="pill pill-outline" style="font-size:0.72rem;">Sleep: ${e.sleepHours}h</span>` : ''}
          </div>
        </div>
        <p style="color:var(--text-primary);font-size:0.95rem;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(e.content)}</p>
      </div>
    `).join('');

  } catch (err) {
    mount.innerHTML = `<div class="card"><p style="color:var(--alert-red);">${escapeHtml(err.message)}</p></div>`;
  }
}

function renderReflection(result) {
  const mount = document.getElementById('reflection-mount');
  let html = '';

  if (result.crisisSupport) {
    html += `
      <div class="disclaimer-box alert-danger" style="margin-bottom:20px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <b style="font-size:1.05rem;color:#fff;">Immediate Safety Protocol:</b>
          <p style="margin:4px 0 10px;color:#fecdd3;">${escapeHtml(result.crisisSupport.message)}</p>
          <div style="background:rgba(0,0,0,0.3);padding:10px 16px;border-radius:var(--radius-sm);display:inline-block;">
            <b>${escapeHtml(result.crisisSupport.helpline.name)}:</b>
            <a href="tel:14416" style="color:#fff;font-size:1.2rem;font-weight:bold;margin-left:8px;">${result.crisisSupport.helpline.number}</a>
          </div>
        </div>
      </div>
    `;
  } else if (result.gentleNudge) {
    html += `
      <div class="disclaimer-box" style="margin-bottom:20px;border-left-color:#f59e0b;">
        <div>
          <b>Clinical Care Nudge:</b>
          <p style="margin:4px 0 0;">${escapeHtml(result.gentleNudge.message)}</p>
        </div>
      </div>
    `;
  }

  if (result.reflection && result.reflection.grounded && result.reflection.passages.length > 0) {
    html += `
      <div class="card" style="padding:24px;margin-bottom:24px;background:#FFF;">
        <p style="font-style:italic;color:var(--ink-700);margin-bottom:18px;">
          "${escapeHtml(document.getElementById('content')?.value || 'Your recent reflection')}"
        </p>
        <div class="reflection-box">
          <p style="margin-bottom:14px;font-weight:500;color:var(--teal-900);">${escapeHtml(result.reflection.message)}</p>
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${result.reflection.passages.map((p) => `
              <div>
                <p style="margin-bottom:4px;color:var(--ink-900);">${escapeHtml(p.text)}</p>
                <div class="source-tag">
                  Source: <b>${escapeHtml(p.source)}</b>${p.reviewDate ? ` · reviewed ${p.reviewDate}` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  mount.innerHTML = html;
  if (html) {
    mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuthOrRedirect();
  ['mood', 'anxiety', 'energy'].forEach(bindSlider);
  loadEntries();

  const form = document.getElementById('journal-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-btn');
      saveBtn.textContent = 'Encrypting…';
      saveBtn.disabled = true;

      const payload = {
        content: document.getElementById('content').value,
        moodScore: Number(document.getElementById('mood').value),
        anxietyScore: Number(document.getElementById('anxiety').value),
        energyScore: Number(document.getElementById('energy').value),
        sleepHours: Number(document.getElementById('sleep').value)
      };

      try {
        const result = await apiFetch('/journal/entries', { method: 'POST', body: payload });
        renderReflection(result);
        document.getElementById('content').value = '';
        loadEntries();
        toast('Entry safely encrypted and stored.');
      } catch (err) {
        toast(err.message);
      } finally {
        saveBtn.textContent = 'Encrypt & Save Entry';
        saveBtn.disabled = false;
      }
    });
  }
});

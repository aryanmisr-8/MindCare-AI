// MindCare AI — Clinical Records & Prescription Vault Logic

async function loadRecords() {
  const mount = document.getElementById('records-mount');
  try {
    const { records } = await apiFetch('/records');

    if (!records || records.length === 0) {
      mount.innerHTML = `
        <div class="card" style="text-align:center;padding:36px;color:var(--text-muted);">
          No clinical records or prescriptions saved yet. Use the form above to log diagnostic reports or prescriptions.
        </div>
      `;
      return;
    }

    const typeLabels = {
      prescription: 'Prescription',
      report: 'Lab / Diagnostic Report',
      discharge_summary: 'Discharge Summary',
      clinician_note: 'Clinician Note',
      other: 'Medical Document'
    };

    mount.innerHTML = records.map((r) => {
      const isShared = r.sharing_state === 'shared_with_clinician';
      return `
        <div class="card" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:8px;">
            <div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--text-primary);">
                ${escapeHtml(typeLabels[r.record_type] || r.record_type)}
              </div>
              <div style="font-size:0.84rem;color:var(--text-muted);margin-top:2px;">
                Issued by: <b style="color:var(--text-secondary);">${escapeHtml(r.source || 'Self-Uploaded Reference')}</b> · ${formatDate(r.uploaded_at)}
              </div>
            </div>
            <span class="pill ${isShared ? 'pill-verified' : 'pill-outline'}">
              ${isShared ? 'Shared with Clinician' : 'Private Vault Only'}
            </span>
          </div>

          <div style="font-family:monospace;font-size:0.82rem;color:var(--accent-cyan);background:rgba(0,0,0,0.25);padding:8px 12px;border-radius:var(--radius-xs);margin:10px 0;">
            Pointer: ${escapeHtml(r.storage_key)}
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn ${isShared ? 'btn-ghost' : 'btn-outline-teal'} btn-sm toggle-share" data-id="${r.record_id}" data-current="${r.sharing_state}">
              ${isShared ? 'Revoke Clinician Access' : 'Authorize Clinician Sharing'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    mount.querySelectorAll('.toggle-share').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const next = btn.dataset.current === 'shared_with_clinician' ? 'private' : 'shared_with_clinician';
        try {
          await apiFetch(`/records/${btn.dataset.id}/sharing`, { method: 'PATCH', body: { sharingState: next } });
          loadRecords();
          toast(`Record access updated to ${next === 'private' ? 'Private' : 'Shared with Clinician'}.`);
        } catch (err) {
          toast(err.message);
        }
      });
    });

  } catch (err) {
    mount.innerHTML = `<div class="card"><p style="color:var(--alert-red);">${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuthOrRedirect();
  loadRecords();

  const form = document.getElementById('record-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-record-btn');
      saveBtn.textContent = 'Saving…';
      saveBtn.disabled = true;

      const payload = {
        recordType: document.getElementById('recordType').value,
        source: document.getElementById('source').value,
        storageKey: `vault/${Date.now()}-${document.getElementById('fileName').value.trim()}`
      };

      try {
        await apiFetch('/records', { method: 'POST', body: payload });
        document.getElementById('fileName').value = '';
        document.getElementById('source').value = '';
        loadRecords();
        toast('Record successfully logged to secure vault.');
      } catch (err) {
        toast(err.message);
      } finally {
        saveBtn.textContent = 'Save Record to Vault';
        saveBtn.disabled = false;
      }
    });
  }
});

// MindCare AI — DPDP Act 2023 Consent Management Interface

const PURPOSES = [
  { key: 'screening_tools', label: 'Validated psychometric screening instruments (PHQ-9, GAD-7)' },
  { key: 'journaling', label: 'AES-256 encrypted reflective health journaling' },
  { key: 'doctor_directory_gps', label: 'GPS coordinates processing for nearby specialist proximity' },
  { key: 'research_library', label: 'Access to peer-reviewed scientific literature repository' },
  { key: 'record_upload', label: 'Encrypted clinical record & prescription storage' },
  { key: 'clinician_export', label: 'Explicit authorization to export medical data to chosen practitioners' }
];

async function renderConsentUI() {
  const mount = document.getElementById('consent-mount');
  if (!mount) return;

  if (!Auth.isLoggedIn()) {
    mount.innerHTML = `
      <div class="card" style="text-align:center;padding:32px;background:rgba(255,255,255,0.02);">
        <p style="color:var(--text-secondary);margin-bottom:14px;">
          Sign in to your private health account to view and modify your purpose-limited consent settings.
        </p>
        <a href="login.html?next=privacy.html" class="btn btn-primary btn-sm">Sign In to Manage Consent</a>
      </div>
    `;
    return;
  }

  let userConsents = {};
  try {
    const data = await apiFetch('/auth/consents');
    userConsents = data.consents || {};
  } catch (_) {
    userConsents = {};
  }

  mount.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      ${PURPOSES.map((p) => {
        const isGranted = userConsents[p.key] !== false; // default true if granted on signup
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:var(--radius-sm);">
            <div style="padding-right:16px;">
              <b style="color:var(--text-primary);font-size:0.94rem;">${escapeHtml(p.label)}</b>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Purpose key: ${p.key}</div>
            </div>
            <label style="position:relative;display:inline-block;width:50px;height:26px;flex-shrink:0;">
              <input type="checkbox" id="consent-${p.key}" ${isGranted ? 'checked' : ''} style="opacity:0;width:0;height:0;">
              <span class="slider-toggle" data-key="${p.key}" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:${isGranted ? '#10b981' : 'rgba(255,255,255,0.2)'};border-radius:34px;transition:.3s;">
                <span style="position:absolute;content:'';height:18px;width:18px;left:${isGranted ? '28px' : '4px'};bottom:4px;background-color:white;border-radius:50%;transition:.3s;"></span>
              </span>
            </label>
          </div>
        `;
      }).join('')}
    </div>
  `;

  PURPOSES.forEach((p) => {
    const input = document.getElementById(`consent-${p.key}`);
    const toggleSpan = mount.querySelector(`.slider-toggle[data-key="${p.key}"]`);
    const knob = toggleSpan?.querySelector('span');

    if (!input || !toggleSpan) return;

    input.addEventListener('change', async (e) => {
      const nextStatus = e.target.checked ? 'granted' : 'revoked';
      try {
        await apiFetch('/auth/consent', {
          method: 'POST',
          body: { purpose: p.key, status: nextStatus }
        });

        toggleSpan.style.backgroundColor = e.target.checked ? '#10b981' : 'rgba(255,255,255,0.2)';
        if (knob) knob.style.left = e.target.checked ? '28px' : '4px';

        toast(`${p.label}: Consent ${e.target.checked ? 'granted' : 'revoked'}.`);
      } catch (err) {
        toast(err.message);
        e.target.checked = !e.target.checked;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', renderConsentUI);

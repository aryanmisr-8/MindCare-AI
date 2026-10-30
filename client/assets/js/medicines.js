// MindCare AI — Multi-Company Medicine Directory & NPPA Price Comparison

let currentMedicines = [];

async function loadCompanies() {
  const select = document.getElementById('company-filter');
  if (!select) return;

  try {
    const { companies } = await apiFetch('/medicines/companies', { auth: false });
    companies.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.legal_name;
      opt.textContent = `${c.legal_name} (${c.medicine_count} formulations)`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn('Could not fetch companies:', err);
  }
}

async function searchMedicines() {
  const tbody = document.querySelector('#medicine-table tbody');
  const q = document.getElementById('q')?.value.trim();
  const company = document.getElementById('company-filter')?.value;
  const category = document.getElementById('category-filter')?.value;
  const form = document.getElementById('form-filter')?.value;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (company) params.set('company', company);
  if (category) params.set('category', category);
  if (form) params.set('form', form);

  tbody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align:center;padding:36px;color:var(--text-muted);">
        Searching formulations…
      </td>
    </tr>
  `;

  try {
    const { medicines, disclaimer } = await apiFetch(`/medicines?${params.toString()}`, { auth: false });
    currentMedicines = medicines;

    if (medicines.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;padding:36px;color:var(--text-muted);">
            No medicine formulations matched your filters. Try clearing the company or therapeutic category filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = medicines.map((m) => {
      const isRx = m.requires_prescription;
      const schedClass = m.schedule === 'H1' ? 'pill-community' : 'pill-outline';
      
      const genericPrice = m.min_price && m.max_price && m.min_price < m.max_price ? `₹${m.min_price.toFixed(2)}` : '—';
      const brandPrice = m.max_price ? `₹${m.max_price.toFixed(2)}` : '—';

      return `
        <tr>
          <td>
            <b style="color:var(--text-primary);font-size:0.96rem;">${escapeHtml(m.generic_name)}</b>
          </td>
          <td>
            <span style="color:var(--accent-primary);font-weight:600;">${escapeHtml(m.brand_name || 'Generic')}</span>
          </td>
          <td>
            <span style="font-size:0.86rem;color:var(--text-secondary);">${escapeHtml(m.company_name || 'Various')}</span>
          </td>
          <td>
            <span class="pill pill-teal" style="font-size:0.72rem;">${escapeHtml(m.category || 'General')}</span>
          </td>
          <td>
            ${escapeHtml(m.strength || '')} · <span style="color:var(--text-muted);font-size:0.82rem;">${escapeHtml(m.dosage_form || '')} (${escapeHtml(m.pack_size || '')})</span>
          </td>
          <td>
            <span class="pill ${schedClass}" style="font-size:0.72rem;">Sched ${escapeHtml(m.schedule || 'H')}${isRx ? ' (Rx)' : ''}</span>
          </td>
          <td>
            <span class="price-generic">${genericPrice}</span>
          </td>
          <td>
            <span class="price-tag">${brandPrice}</span>
          </td>
          <td>
            <button class="btn btn-outline-teal btn-sm view-prices-btn" data-id="${m.medicine_id}" data-name="${escapeHtml(m.generic_name + ' (' + (m.brand_name || 'Generic') + ')')}">
              Price Details
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-prices-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openPriceModal(btn.dataset.id, btn.dataset.name);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--alert-red);padding:24px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function openPriceModal(medicineId, medName) {
  const modal = document.getElementById('price-modal');
  const title = document.getElementById('modal-med-title');
  const sub = document.getElementById('modal-med-sub');
  const mount = document.getElementById('modal-prices-mount');

  title.textContent = medName;
  sub.textContent = 'Official NPPA Pharma Sahi Daam & Jan Aushadhi Comparative Pricing:';
  mount.innerHTML = '<p>Loading price data…</p>';
  modal.style.display = 'flex';

  try {
    const { prices, disclaimer } = await apiFetch(`/medicines/${medicineId}/prices`, { auth: false });

    if (!prices || prices.length === 0) {
      mount.innerHTML = '<p>No historical price listings recorded for this formulation.</p>';
      return;
    }

    mount.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${prices.map((p) => `
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;color:var(--text-primary);font-size:0.92rem;">${escapeHtml(p.source)}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Coverage: ${escapeHtml(p.geography || 'All India')}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1.25rem;color:var(--accent-primary);">
                ₹${p.mrp_inr != null ? p.mrp_inr.toFixed(2) : '—'}
              </div>
              ${p.ceiling_price_inr ? `<div style="font-size:0.75rem;color:var(--text-muted);">NPPA Ceiling: ₹${p.ceiling_price_inr.toFixed(2)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:16px;line-height:1.4;">
        ${escapeHtml(disclaimer)}
      </div>
    `;
  } catch (err) {
    mount.innerHTML = `<p style="color:var(--alert-red);">${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
  searchMedicines();

  document.getElementById('search-btn')?.addEventListener('click', searchMedicines);
  document.getElementById('company-filter')?.addEventListener('change', searchMedicines);
  document.getElementById('category-filter')?.addEventListener('change', searchMedicines);
  document.getElementById('form-filter')?.addEventListener('change', searchMedicines);

  const q = document.getElementById('q');
  if (q) {
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchMedicines();
    });
  }

  const closeBtn = document.getElementById('close-modal');
  const modal = document.getElementById('price-modal');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }
});

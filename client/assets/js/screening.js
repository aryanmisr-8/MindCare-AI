// MindCare AI — Validated Psychometric Screening Instruments

let currentInstrument = null;

async function loadInstrumentList() {
  const mount = document.getElementById('instrument-list');
  try {
    const { instruments } = await apiFetch('/screenings/instruments', { auth: false });
    mount.innerHTML = instruments.map((i) => `
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;background:#FFF;">
        <div>
          <div style="margin-bottom:10px;">
            <span class="pill ${i.licensing === 'requires_license' ? 'pill-unverified' : 'pill-verified'}">
              ${i.licensing === 'requires_license' ? 'Licensed instrument required' : 'Available'}
            </span>
          </div>
          <h3 style="margin-bottom:8px;font-family:'Fraunces',Georgia,serif;font-size:1.25rem;">${escapeHtml(i.displayName)}</h3>
          ${i.itemCount ? `
            <p style="font-size:0.88rem;color:var(--ink-600);margin-bottom:12px;">
              ${i.itemCount} items · a few minutes to complete
            </p>
          ` : `
            <p style="font-size:0.86rem;color:var(--ink-600);">${escapeHtml(i.note || '')}</p>
          `}
        </div>

        <div style="margin-top:16px;">
          ${i.licensing === 'requires_license'
            ? `<button class="btn btn-ghost btn-sm" disabled style="opacity:0.6;">Requires license</button>`
            : `<button class="btn btn-primary btn-sm start-btn" data-code="${i.code}">Start ${i.code}</button>`}
        </div>
      </div>
    `).join('');

    mount.querySelectorAll('.start-btn').forEach((btn) => {
      btn.addEventListener('click', () => startInstrument(btn.dataset.code));
    });
  } catch (err) {
    mount.innerHTML = `<div class="card"><p style="color:var(--alert-red);">${escapeHtml(err.message)}</p></div>`;
  }
}

async function startInstrument(code) {
  if (!Auth.isLoggedIn()) {
    window.location.href = `login.html?next=screening.html`;
    return;
  }

  try {
    const instrument = await apiFetch(`/screenings/instruments/${code}`, { auth: false });
    currentInstrument = instrument;

    document.getElementById('instrument-list').style.display = 'none';
    document.getElementById('result-shell').style.display = 'none';
    document.getElementById('questionnaire-shell').style.display = 'block';

    document.getElementById('q-title').textContent = instrument.displayName;
    document.getElementById('q-progress').textContent = `${instrument.items.length} Questions`;

    const form = document.getElementById('q-form');
    form.innerHTML = instrument.items.map((item, idx) => `
      <div class="question-card" id="q-card-${idx}">
        <div class="question-title">
          <span style="color:var(--accent-primary);margin-right:8px;">${idx + 1}.</span>
          ${escapeHtml(item)}
        </div>
        <div class="option-group">
          ${instrument.scale.map((opt) => `
            <label class="option-label" data-q="${idx}" data-val="${opt.value}">
              <input type="radio" name="q_${idx}" value="${opt.value}" required>
              <b>${escapeHtml(opt.label)}</b>
              <span style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">(Score: ${opt.value})</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('') + `
      <div style="display:flex;justify-content:flex-end;margin-top:28px;">
        <button type="submit" class="btn btn-primary btn-lg" id="submit-screening">
          Submit &amp; Calculate Score
        </button>
      </div>
    `;

    // Interactive label highlighting
    form.querySelectorAll('.option-label').forEach((label) => {
      label.addEventListener('click', () => {
        const qIdx = label.dataset.q;
        form.querySelectorAll(`.option-label[data-q="${qIdx}"]`).forEach((l) => l.classList.remove('selected'));
        label.classList.add('selected');
      });
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const responses = [];
      for (let i = 0; i < instrument.items.length; i++) {
        const checked = form.querySelector(`input[name="q_${i}"]:checked`);
        if (!checked) {
          toast(`Please provide a response for question ${i + 1}.`);
          document.getElementById(`q-card-${i}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        responses.push(Number(checked.value));
      }

      const submitBtn = document.getElementById('submit-screening');
      submitBtn.textContent = 'Analyzing responses…';
      submitBtn.disabled = true;

      try {
        const result = await apiFetch('/screenings/sessions', {
          method: 'POST',
          body: { instrumentCode: instrument.code, responses }
        });
        showResult(result);
      } catch (err) {
        toast(err.message);
        submitBtn.textContent = 'Submit & Calculate Score';
        submitBtn.disabled = false;
      }
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    toast(err.message);
  }
}

function showResult(result) {
  document.getElementById('questionnaire-shell').style.display = 'none';
  const resultShell = document.getElementById('result-shell');
  resultShell.style.display = 'block';

  document.getElementById('result-total').textContent = result.totalScore;
  document.getElementById('result-band').textContent = result.severityBand;
  document.getElementById('result-note').textContent = `${result.note} This is a screening tool, not a diagnosis. Results are meant to help you notice patterns and prepare for a conversation with a qualified professional.`;

  const crisisMount = document.getElementById('result-crisis');
  if (result.immediateSupport) {
    crisisMount.innerHTML = `
      <div class="disclaimer-box alert-danger">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <b style="font-size:1.05rem;color:#fff;">Immediate Crisis Support Available:</b>
          <p style="margin:4px 0 10px;color:#fecdd3;">${escapeHtml(result.immediateSupport.message)}</p>
          <div style="background:rgba(0,0,0,0.3);padding:10px 16px;border-radius:var(--radius-sm);display:inline-block;">
            <b>${escapeHtml(result.immediateSupport.helpline.name)}:</b>
            <a href="tel:14416" style="color:#fff;font-size:1.2rem;font-weight:bold;margin-left:8px;">${result.immediateSupport.helpline.number}</a>
          </div>
        </div>
      </div>
    `;
  } else {
    crisisMount.innerHTML = '';
  }

  window.scrollTo({ top: resultShell.offsetTop - 80, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  loadInstrumentList();

  document.getElementById('back-to-list')?.addEventListener('click', () => {
    document.getElementById('questionnaire-shell').style.display = 'none';
    document.getElementById('result-shell').style.display = 'none';
    document.getElementById('instrument-list').style.display = 'grid';
  });

  document.getElementById('retake-btn')?.addEventListener('click', () => {
    document.getElementById('result-shell').style.display = 'none';
    document.getElementById('instrument-list').style.display = 'grid';
  });
});

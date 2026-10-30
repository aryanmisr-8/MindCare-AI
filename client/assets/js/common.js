// MindCare AI — Core Shared Utilities & Medical Navigation Layer (Light Clinical Theme)

const API_BASE = window.MINDCARE_API_BASE || (window.location.origin.includes('5173') ? 'http://localhost:4000/api' : '/api');

const Auth = {
  getToken: () => localStorage.getItem('mc_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('mc_user') || 'null');
    } catch (_) {
      return null;
    }
  },
  setSession(token, user) {
    localStorage.setItem('mc_token', token);
    localStorage.setItem('mc_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_user');
  },
  isLoggedIn() {
    return Boolean(Auth.getToken());
  },
  requireAuthOrRedirect() {
    if (!Auth.isLoggedIn()) {
      const current = window.location.pathname.split('/').pop() || 'index.html';
      window.location.href = `login.html?next=${encodeURIComponent(current)}`;
    }
  }
};

async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.getToken()) {
    headers.Authorization = `Bearer ${Auth.getToken()}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    console.error('API connection failure:', networkErr);
    throw new Error('Unable to communicate with the MindCare AI server. Please verify the server is running on port 4000.');
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (data && data.error) || (typeof data === 'string' ? data : `Error ${res.status}`);
    throw new Error(message);
  }

  return data;
}

function toast(message, duration = 3500) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), duration);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return isoString;
  }
}

function renderEmergencyBanner() {
  const existing = document.getElementById('emergency-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'emergency-banner';
  banner.className = 'emergency-banner';
  banner.innerHTML = `
    <div class="container banner-content">
      <span>
        In immediate danger or thinking about self-harm? Call 
        <b>Tele-MANAS: 14416</b> (24/7, free, India) or <b>112</b> for emergencies.
      </span>
    </div>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
}

function renderHeader(activePage = '') {
  const header = document.getElementById('site-header');
  if (!header) return;

  renderEmergencyBanner();

  const user = Auth.getUser();

  header.innerHTML = `
    <div class="container header-inner">
      <a href="index.html" class="brand-logo">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#1D4E4C"/>
          <circle cx="16" cy="16" r="8" fill="#8FB4A3" opacity="0.8"/>
        </svg>
        <span>MindCare AI</span>
      </a>

      <ul class="nav-menu" id="nav-menu">
        <li><a href="index.html" class="nav-link ${activePage === 'index.html' ? 'active' : ''}">Home</a></li>
        ${user ? `<li><a href="dashboard.html" class="nav-link ${activePage === 'dashboard.html' ? 'active' : ''}">Dashboard</a></li>` : ''}
        <li><a href="screening.html" class="nav-link ${activePage === 'screening.html' ? 'active' : ''}">Screening tools</a></li>
        <li><a href="journal.html" class="nav-link ${activePage === 'journal.html' ? 'active' : ''}">Journal</a></li>
        <li><a href="research.html" class="nav-link ${activePage === 'research.html' ? 'active' : ''}">Research library</a></li>
        <li><a href="doctors.html" class="nav-link ${activePage === 'doctors.html' ? 'active' : ''}">Find a doctor</a></li>
        <li><a href="medicines.html" class="nav-link ${activePage === 'medicines.html' ? 'active' : ''}">Medicines</a></li>
        <li><a href="records.html" class="nav-link nav-pill-outline ${activePage === 'records.html' ? 'active' : ''}">Records</a></li>
      </ul>

      <div class="nav-actions">
        ${user ? `
          <button class="btn-signout" id="logout-btn">Sign out</button>
        ` : `
          <a href="login.html" class="btn btn-ghost btn-sm">Sign in</a>
          <a href="signup.html" class="btn btn-primary btn-sm">Sign up</a>
        `}
        <button class="mobile-toggle" id="mobile-toggle" aria-label="Toggle navigation">☰</button>
      </div>
    </div>
  `;

  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clear();
      window.location.href = 'index.html';
    });
  }
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <h4 style="font-family:'Fraunces',Georgia,serif;font-size:1.15rem;color:var(--teal-900);">MindCare AI</h4>
        <p style="font-size:0.86rem;line-height:1.6;color:var(--ink-600);">
          A guided self-reflection, education, and care-navigation layer for India. 
          Not a diagnostic, prescribing, or emergency-response service.
        </p>
      </div>
      <div>
        <h4>Platform</h4>
        <ul>
          <li><a href="screening.html">Screening tools</a></li>
          <li><a href="journal.html">Daily journal</a></li>
          <li><a href="research.html">Research library</a></li>
          <li><a href="doctors.html">Doctor directory</a></li>
          <li><a href="medicines.html">Medicine directory</a></li>
        </ul>
      </div>
      <div>
        <h4>Trust &amp; safety</h4>
        <ul>
          <li><a href="privacy.html">Privacy &amp; data protection</a></li>
          <li><a href="privacy.html#consent">Your consent controls</a></li>
          <li><a href="index.html#reviews-grid" onclick="if(typeof openReviewModal === 'function'){ openReviewModal(); }">Website Feedback &amp; Reviews</a></li>
          <li><a href="tel:14416">Tele-MANAS (14416)</a></li>
        </ul>
      </div>
      <div>
        <h4>Reference sources</h4>
        <ul>
          <li>WHO depression &amp; anxiety fact sheets</li>
          <li>MoHFW Tele-MANAS programme</li>
          <li>NMC Indian Medical Register</li>
          <li>NPPA Pharma Sahi Daam / Jan Aushadhi</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom container">
      Screening results are not a diagnosis. Directory listings show verification status and last-verified date.
      Built for the Indian regulatory context (DPDP Act, 2023) — © MindCare AI, academic project, 2026.
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const active = window.location.pathname.split('/').pop() || 'index.html';
  renderHeader(active);
  renderFooter();
});

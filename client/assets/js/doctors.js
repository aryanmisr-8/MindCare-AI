// MindCare AI — GPS & Leaflet Interactive Map Doctor Directory

let userCoords = null;
let mapInstance = null;
let markersLayer = null;
let userMarker = null;
let currentDoctors = [];

function verificationBadge(state) {
  const map = {
    registry_matched: { cls: 'pill-verified', label: 'NMC Registry Matched' },
    provider_claimed: { cls: 'pill-claimed', label: 'Provider Claimed' },
    community_reported: { cls: 'pill-community', label: 'Community Reported' },
    unverified: { cls: 'pill-unverified', label: 'Unverified' }
  };
  const v = map[state] || map.unverified;
  return `<span class="pill ${v.cls}">${v.label}</span>`;
}

function initMap() {
  const mapEl = document.getElementById('map-container');
  if (!mapEl || mapInstance) return;

  // Default view centered on India
  mapInstance = L.map('map-container').setView([20.5937, 78.9629], 5);

  // Modern Dark CartoDB / OpenStreetMap tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
}

function updateMapMarkers(doctors) {
  if (!mapInstance || !markersLayer) return;
  markersLayer.clearLayers();

  const bounds = [];

  if (userCoords && userMarker) {
    bounds.push([userCoords.lat, userCoords.lng]);
  }

  doctors.forEach((d) => {
    if (!d.latitude || !d.longitude) return;

    const lat = Number(d.latitude);
    const lng = Number(d.longitude);
    bounds.push([lat, lng]);

    // Custom SVG Medical pin icon for light theme
    const customIcon = L.divIcon({
      className: 'custom-doctor-marker',
      html: `
        <div style="background:linear-gradient(135deg,#1D4E4C,#2E6F6B);width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(18,57,54,0.3);border:2px solid #fff;">
          <div style="transform:rotate(45deg);font-size:14px;color:#fff;font-weight:bold;">+</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    const popupHtml = `
      <div style="font-family:'Inter',sans-serif;padding:4px;min-width:200px;">
        <div style="font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1.05rem;color:#123936;margin-bottom:2px;">${escapeHtml(d.full_name)}</div>
        <div style="font-size:0.8rem;color:#4A5450;margin-bottom:6px;">${escapeHtml(d.specialty)} · ${escapeHtml(d.city || '')}</div>
        <div style="font-size:0.84rem;margin-bottom:4px;color:#1B211F;"><b>Clinic:</b> ${escapeHtml(d.clinic_name || 'Private Practice')}</div>
        <div style="font-size:0.84rem;margin-bottom:6px;color:#1B211F;"><b>Consultation:</b> ₹${d.fees_inr || 'Standard'}</div>
        ${d.distance_km != null ? `<div style="font-size:0.78rem;color:#1D4E4C;font-weight:600;">📍 ${d.distance_km} km away</div>` : ''}
      </div>
    `;

    marker.bindPopup(popupHtml);
    marker.on('click', () => {
      highlightDoctorCard(d.doctor_id);
    });

    marker.doctorId = d.doctor_id;
    markersLayer.addLayer(marker);
  });

  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}

function highlightDoctorCard(doctorId) {
  document.querySelectorAll('.doctor-card').forEach((el) => {
    el.classList.toggle('active-doctor', el.dataset.id === doctorId);
  });
  const targetCard = document.querySelector(`.doctor-card[data-id="${doctorId}"]`);
  if (targetCard) {
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function focusDoctorOnMap(doctor) {
  if (!mapInstance || !doctor.latitude || !doctor.longitude) return;
  const lat = Number(doctor.latitude);
  const lng = Number(doctor.longitude);

  mapInstance.setView([lat, lng], 14, { animate: true });

  markersLayer.eachLayer((layer) => {
    if (layer.doctorId === doctor.doctor_id) {
      layer.openPopup();
    }
  });
}

async function searchDoctors() {
  const mount = document.getElementById('doctors-mount');
  const statusEl = document.getElementById('location-status');
  const params = new URLSearchParams();

  const specialty = document.getElementById('specialty')?.value;
  const city = document.getElementById('city')?.value;
  const modality = document.getElementById('modality')?.value;
  const q = document.getElementById('q')?.value.trim();
  const radius = document.getElementById('radius')?.value || '50';

  if (specialty) params.set('specialty', specialty);
  if (city) params.set('city', city);
  if (modality) params.set('modality', modality);
  if (q) params.set('q', q);

  if (userCoords) {
    params.set('lat', userCoords.lat);
    params.set('lng', userCoords.lng);
    params.set('radiusKm', radius);
  }

  mount.innerHTML = `
    <div class="card" style="text-align:center;padding:40px;">
      <p>Searching verified medical registry…</p>
    </div>
  `;

  try {
    const { doctors, rankingNote } = await apiFetch(`/doctors?${params.toString()}`, { auth: false });
    currentDoctors = doctors;

    if (doctors.length === 0) {
      mount.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;">
          <h3>No doctors match this filter</h3>
          <p>Try widening the search radius, switching city, or clearing specialty filters.</p>
        </div>
      `;
      markersLayer.clearLayers();
      return;
    }

    mount.innerHTML = `
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">
        Found <b>${doctors.length}</b> verified specialist${doctors.length > 1 ? 's' : ''}.
      </div>
    ` + doctors.map((d) => `
      <div class="doctor-card" data-id="${d.doctor_id}">
        <div class="doctor-header">
          <div>
            <div class="doctor-name">${escapeHtml(d.full_name)}</div>
            <div style="font-size:0.86rem;color:var(--accent-primary);font-weight:600;">
              ${escapeHtml(d.specialty)}
            </div>
          </div>
          ${verificationBadge(d.verification_state)}
        </div>

        <div class="doctor-meta">
          <span>🏥 ${escapeHtml(d.clinic_name || 'Independent Practice')}</span>
          <span>📍 ${escapeHtml(d.city || '')}${d.state ? ', ' + escapeHtml(d.state) : ''}</span>
          ${d.distance_km != null ? `<span class="distance-tag">${d.distance_km} km away</span>` : ''}
        </div>

        <p style="font-size:0.86rem;margin-bottom:8px;color:var(--text-secondary);">
          <b>Address:</b> ${escapeHtml(d.address || 'Central Consultation OPD')}
        </p>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:0.85rem;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="color:var(--text-muted);">Consultation:</span>
            <b style="color:var(--text-primary);">₹${d.fees_inr || 'Standard'}</b>
            ${d.modalities && d.modalities.includes('teleconsultation') ? '<span class="pill pill-outline" style="font-size:0.68rem;margin-left:6px;">Online Video</span>' : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline-teal btn-sm view-map-btn" data-id="${d.doctor_id}">Show on Map</button>
            <button class="btn btn-ghost btn-sm report-btn" data-id="${d.doctor_id}" title="Report outdated info">Flag</button>
          </div>
        </div>
      </div>
    `).join('');

    updateMapMarkers(doctors);

    // Bind map buttons
    mount.querySelectorAll('.view-map-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const doc = currentDoctors.find((item) => item.doctor_id === btn.dataset.id);
        if (doc) {
          highlightDoctorCard(doc.doctor_id);
          focusDoctorOnMap(doc);
        }
      });
    });

    mount.querySelectorAll('.doctor-card').forEach((card) => {
      card.addEventListener('click', () => {
        const doc = currentDoctors.find((item) => item.doctor_id === card.dataset.id);
        if (doc) {
          highlightDoctorCard(doc.doctor_id);
          focusDoctorOnMap(doc);
        }
      });
    });

    mount.querySelectorAll('.report-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        reportDoctor(btn.dataset.id);
      });
    });

  } catch (err) {
    mount.innerHTML = `<div class="card"><p style="color:var(--alert-red);">${escapeHtml(err.message)}</p></div>`;
  }
}

async function reportDoctor(doctorId) {
  if (!Auth.isLoggedIn()) {
    window.location.href = `login.html?next=doctors.html`;
    return;
  }
  const issue = prompt('Please describe any correction or issue (e.g., changed address, updated consultation hours):');
  if (!issue) return;
  try {
    await apiFetch(`/doctors/${doctorId}/report`, { method: 'POST', body: { issue } });
    toast('Thank you — your report has been submitted for verification review.');
  } catch (err) {
    toast(err.message);
  }
}

function handleGeolocation() {
  const statusEl = document.getElementById('location-status');
  if (!navigator.geolocation) {
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--alert-red);">Geolocation is not supported by your browser.</span>`;
    return;
  }

  if (statusEl) statusEl.innerHTML = `<span>Requesting GPS access from your browser…</span>`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--accent-primary);">📍 GPS Active: Showing specialists sorted by direct distance from your coordinates.</span>`;
      }

      if (mapInstance) {
        if (userMarker) mapInstance.removeLayer(userMarker);

        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="width:20px;height:20px;background:#38bdf8;border:3px solid #fff;border-radius:50%;box-shadow:0 0 15px #38bdf8;"></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
          .addTo(mapInstance)
          .bindPopup('<b>Your Current Location</b>');

        mapInstance.setView([userCoords.lat, userCoords.lng], 11);
      }

      searchDoctors();
    },
    (err) => {
      console.warn('Geolocation denied or failed:', err);
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--text-muted);">GPS access was declined — showing national listings. You can select a city above.</span>`;
      }
      searchDoctors();
    },
    { timeout: 8000, enableHighAccuracy: true }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  searchDoctors();

  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) searchBtn.addEventListener('click', searchDoctors);

  const locBtn = document.getElementById('use-location-btn');
  if (locBtn) locBtn.addEventListener('click', handleGeolocation);

  const citySelect = document.getElementById('city');
  if (citySelect) citySelect.addEventListener('change', searchDoctors);

  const specSelect = document.getElementById('specialty');
  if (specSelect) specSelect.addEventListener('change', searchDoctors);

  const modSelect = document.getElementById('modality');
  if (modSelect) modSelect.addEventListener('change', searchDoctors);

  const qInput = document.getElementById('q');
  if (qInput) {
    qInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchDoctors();
    });
  }
});

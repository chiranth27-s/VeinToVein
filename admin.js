// ========================================================
// VeinToVein — Hospital & Blood Bank Administration Controller
// ========================================================

'use strict';

const BANGALORE_HOSPITALS = [
  { name: 'Apollo Hospitals', location: 'Seshadripuram', fullName: 'Apollo Hospitals · Seshadripuram' },
  { name: 'Fortis Hospital', location: 'Cunningham Road, Vasanth Nagar', fullName: 'Fortis Hospital · Cunningham Road, Vasanth Nagar' },
  { name: 'Aster CMI Hospital', location: 'Hebbal, Sahakara Nagar', fullName: 'Aster CMI Hospital · Hebbal, Sahakara Nagar' },
  { name: 'Manipal Hospitals', location: 'Old Airport Road, Kodihalli', fullName: 'Manipal Hospitals · Old Airport Road, Kodihalli' },
  { name: 'Narayana Health City', location: 'Bommasandra', fullName: 'Narayana Health City · Bommasandra' },
  { name: 'Manipal Hospitals Sarjapur Road', location: 'Bellandur, Sarjapur Road', fullName: 'Manipal Hospitals Sarjapur Road · Bellandur, Sarjapur Road' }
];

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

let currentHospitalFilter = 'ALL';
let activeDonorsCache = [];

// ── Toast Notification Helper ──
function adminToast(title, msg, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  if (type === 'success') el.style.borderLeftColor = '#34d399';
  if (type === 'alert') el.style.borderLeftColor = '#ef4444';
  el.innerHTML = `<div><b style="color:${type === 'success' ? '#a7f3d0' : '#ffd166'};">${title}</b><p>${msg}</p></div>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ── Storage Helpers ──
function getDispatches() {
  try {
    const raw = localStorage.getItem('veintovein_dispatches');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveDispatches(list) {
  try {
    localStorage.setItem('veintovein_dispatches', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('veintovein_dispatch_updated'));
  } catch (e) {
    console.error('Failed to save dispatches:', e);
  }
}

function getInventory() {
  try {
    const raw = localStorage.getItem('veintovein_inventory');
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  // Initial standard inventory per hospital
  const initial = {};
  BANGALORE_HOSPITALS.forEach(h => {
    initial[h.fullName] = {
      'O-': 6, 'O+': 22, 'A-': 5, 'A+': 18,
      'B-': 7, 'B+': 24, 'AB-': 4, 'AB+': 15
    };
  });
  localStorage.setItem('veintovein_inventory', JSON.stringify(initial));
  return initial;
}

function saveInventory(inv) {
  try {
    localStorage.setItem('veintovein_inventory', JSON.stringify(inv));
  } catch (e) {}
}

function getRequisitions() {
  try {
    const raw = localStorage.getItem('veintovein_requisitions');
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  // Default requisitions
  const initial = [
    { id: 'REQ-101', hospital: 'Apollo Hospitals · Seshadripuram', bloodGroup: 'O-', urgency: 'Critical', units: 3, ward: 'Emergency Trauma 4A', status: 'Seeking Donors', created: '2026-11-13T10:00:00Z' },
    { id: 'REQ-102', hospital: 'Fortis Hospital · Cunningham Road, Vasanth Nagar', bloodGroup: 'B+', urgency: 'Urgent', units: 2, ward: 'Surgical ICU 2B', status: 'Seeking Donors', created: '2026-11-13T11:20:00Z' },
    { id: 'REQ-103', hospital: 'Aster CMI Hospital · Hebbal, Sahakara Nagar', bloodGroup: 'AB-', urgency: 'Critical', units: 2, ward: 'Transplant Ward 6C', status: 'Seeking Donors', created: '2026-11-13T12:00:00Z' },
    { id: 'REQ-104', hospital: 'Manipal Hospitals · Old Airport Road, Kodihalli', bloodGroup: 'A+', urgency: 'Stable', units: 1, ward: 'Oncology Unit 3', status: 'Seeking Donors', created: '2026-11-13T13:45:00Z' },
    { id: 'REQ-105', hospital: 'Narayana Health City · Bommasandra', bloodGroup: 'O+', urgency: 'Urgent', units: 4, ward: 'Cardiac Surgery OR 2', status: 'Seeking Donors', created: '2026-11-13T14:15:00Z' },
    { id: 'REQ-106', hospital: 'Manipal Hospitals Sarjapur Road · Bellandur, Sarjapur Road', bloodGroup: 'AB+', urgency: 'Urgent', units: 2, ward: 'ICU Bed 12', status: 'Seeking Donors', created: '2026-11-13T15:30:00Z' }
  ];
  localStorage.setItem('veintovein_requisitions', JSON.stringify(initial));
  return initial;
}

function saveRequisitions(reqs) {
  try {
    localStorage.setItem('veintovein_requisitions', JSON.stringify(reqs));
  } catch (e) {}
}

// ── Calculate 90-Day NBTC Legal Waiting Period ──
function calculateLegalEligibility(lastDonationStr) {
  if (!lastDonationStr) {
    return { eligible: true, daysRemaining: 0, nextDate: 'Eligible Today', lastDateStr: 'Never Donated' };
  }
  const lastDate = new Date(lastDonationStr);
  if (isNaN(lastDate.getTime())) {
    return { eligible: true, daysRemaining: 0, nextDate: 'Eligible Today', lastDateStr: 'Unknown' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastTime = new Date(lastDate);
  lastTime.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - lastTime) / (1000 * 60 * 60 * 24));
  const WAITING_PERIOD = 90; // Mandatory whole blood recovery interval

  const nextDateObj = new Date(lastTime);
  nextDateObj.setDate(nextDateObj.getDate() + WAITING_PERIOD);
  const nextDateFormatted = nextDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const lastDateFormatted = lastDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (diffDays >= WAITING_PERIOD) {
    return {
      eligible: true,
      daysElapsed: diffDays,
      daysRemaining: 0,
      nextDate: 'Eligible Today',
      lastDateStr: lastDateFormatted
    };
  } else {
    return {
      eligible: false,
      daysElapsed: diffDays,
      daysRemaining: WAITING_PERIOD - diffDays,
      nextDate: nextDateFormatted,
      lastDateStr: lastDateFormatted
    };
  }
}

// ────────────────────────────────────────────────────────────
// RENDER KPI & COUNTERS
// ────────────────────────────────────────────────────────────
function updateKPIs() {
  const dispatches = getDispatches();
  const requisitions = getRequisitions();

  let filteredDisp = dispatches;
  let filteredReq = requisitions;

  if (currentHospitalFilter !== 'ALL') {
    filteredDisp = dispatches.filter(d => d.hospitalName === currentHospitalFilter);
    filteredReq = requisitions.filter(r => r.hospital === currentHospitalFilter);
  }

  const enRouteCount = filteredDisp.filter(d => d.status === 'en_route').length;
  const arrivedCount = filteredDisp.filter(d => d.status === 'arrived').length;
  const completedCount = filteredDisp.filter(d => d.status === 'completed').length;
  const reqCount = filteredReq.filter(r => r.status !== 'Fulfilled').length;

  document.getElementById('kpiEnRoute').textContent = enRouteCount;
  document.getElementById('kpiArrived').textContent = arrivedCount;
  document.getElementById('kpiCompleted').textContent = completedCount;
  document.getElementById('kpiRequisitions').textContent = reqCount;

  // Update tabs badge counts
  document.getElementById('badgeAllCount').textContent = dispatches.filter(d => d.status !== 'completed').length;
  document.getElementById('badgeApolloCount').textContent = dispatches.filter(d => d.hospitalName.includes('Apollo') && d.status !== 'completed').length;
  document.getElementById('badgeFortisCount').textContent = dispatches.filter(d => d.hospitalName.includes('Fortis') && d.status !== 'completed').length;
  document.getElementById('badgeAsterCount').textContent = dispatches.filter(d => d.hospitalName.includes('Aster') && d.status !== 'completed').length;
  document.getElementById('badgeManipalCount').textContent = dispatches.filter(d => d.hospitalName.includes('Old Airport') && d.status !== 'completed').length;
  document.getElementById('badgeNarayanaCount').textContent = dispatches.filter(d => d.hospitalName.includes('Narayana') && d.status !== 'completed').length;
  document.getElementById('badgeSarjapurCount').textContent = dispatches.filter(d => d.hospitalName.includes('Sarjapur') && d.status !== 'completed').length;
}

// ────────────────────────────────────────────────────────────
// RENDER ARRIVALS & CHECK-IN TABLE
// ────────────────────────────────────────────────────────────
function renderArrivalsTable() {
  const tbody = document.getElementById('arrivalsTableBody');
  if (!tbody) return;

  const allDispatches = getDispatches();
  const list = currentHospitalFilter === 'ALL'
    ? allDispatches
    : allDispatches.filter(d => d.hospitalName === currentHospitalFilter);

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div style="font-size:0.95rem;font-weight:700;color:rgba(250,245,239,0.8);margin-bottom:4px;">No Inbound Donors for this Centre</div>
          <div style="font-size:0.78rem;">When a donor accepts an emergency request on the homepage, their live arrival ticket will appear here automatically.</div>
          <button type="button" class="btn btn-ghost-light btn-sm" id="btnEmptyTestArrival" style="margin-top:1rem;color:var(--admin-gold);border-color:var(--admin-gold);">
            + Simulate Test Donor Arrival
          </button>
        </td>
      </tr>
    `;
    document.getElementById('btnEmptyTestArrival')?.addEventListener('click', simulateTestArrival);
    return;
  }

  // Sort: En Route & Arrived on top, Completed at bottom
  const statusWeight = { en_route: 1, arrived: 2, completed: 3 };
  list.sort((a, b) => {
    const wa = statusWeight[a.status] || 99;
    const wb = statusWeight[b.status] || 99;
    if (wa !== wb) return wa - wb;
    return new Date(b.acceptedAt) - new Date(a.acceptedAt);
  });

  tbody.innerHTML = list.map(item => {
    const timeFormatted = item.acceptedAt ? new Date(item.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
    
    let statusBadge = '';
    let actionButtons = '';

    if (item.status === 'en_route') {
      statusBadge = `<span class="status-pill status-enroute"><span style="width:6px;height:6px;border-radius:50%;background:#ffd166;"></span>En Route (~${item.eta || '25 mins'})</span>`;
      actionButtons = `
        <button class="btn-sm-action btn-mark-arrived" onclick="handleMarkArrived('${item.ticketId}')" title="Donor has physically arrived at blood bank desk">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Mark Arrived</span>
        </button>
        <button class="btn-sm-action btn-complete-donation" onclick="openCompleteDonationModal('${item.ticketId}')" title="Proceed to verify vitals and collect 1 unit">
          <span>Finalize</span>
        </button>
      `;
    } else if (item.status === 'arrived') {
      statusBadge = `<span class="status-pill status-arrived"><span style="width:6px;height:6px;border-radius:50%;background:#60a5fa;"></span>At Desk · Pre-Screening</span>`;
      actionButtons = `
        <button class="btn-sm-action btn-complete-donation" onclick="openCompleteDonationModal('${item.ticketId}')" style="background:#10b981;color:#fff;font-weight:700;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Verify & Complete Donation</span>
        </button>
      `;
    } else if (item.status === 'completed') {
      const cooling = calculateLegalEligibility(item.completedAt || item.acceptedAt);
      statusBadge = `<span class="status-pill status-completed">✓ 1 Unit Collected</span>`;
      actionButtons = `
        <div style="font-size:0.72rem;color:#fca5a5;line-height:1.3;text-align:right;">
          <span class="status-pill status-cooling" style="font-size:0.65rem;padding:2px 6px;">🔒 Cooling Period</span><br>
          <small>Next eligible: ${cooling.nextDate}</small>
        </div>
      `;
    }

    return `
      <tr data-ticket="${item.ticketId}">
        <td>
          <div class="donor-cell">
            <div class="donor-badge-grp">${item.bloodGroup || 'O+'}</div>
            <div>
              <div style="font-weight:700;color:#fff;font-size:0.92rem;">${item.donorName || 'Verified Donor'}</div>
              <div style="font-size:0.72rem;color:rgba(250,245,239,0.5);">ID: <b style="color:var(--admin-gold);">${item.donorId || 'VT-IN-2026-PENDING'}</b> · Ticket: ${item.ticketId}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-weight:800;color:#fff;font-size:0.95rem;">${item.bloodGroup}</span>
          <div style="font-size:0.68rem;color:#6ee7b7;">Red Cell Match</div>
        </td>
        <td>
          <div style="font-weight:600;color:rgba(250,245,239,0.9);">${item.hospitalName}</div>
          <div style="font-size:0.72rem;color:rgba(250,245,239,0.5);">${item.urgency || 'Urgent'} Requisition · 1 Unit</div>
        </td>
        <td>
          <div style="font-size:0.8rem;color:#fff;">📞 ${item.phone || '—'}</div>
          <div style="font-size:0.72rem;color:rgba(250,245,239,0.5);">Departed at ${timeFormatted}</div>
        </td>
        <td>${statusBadge}</td>
        <td style="text-align:right;">
          <div class="action-btn-row" style="justify-content:flex-end;">
            ${actionButtons}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ────────────────────────────────────────────────────────────
// MARK ARRIVED HANDLER
// ────────────────────────────────────────────────────────────
window.handleMarkArrived = function (ticketId) {
  const dispatches = getDispatches();
  const target = dispatches.find(d => d.ticketId === ticketId);
  if (!target) return;

  target.status = 'arrived';
  target.arrivedAt = new Date().toISOString();
  saveDispatches(dispatches);

  adminToast(
    'Donor Check-In Verified',
    `<b>${target.donorName}</b> (${target.bloodGroup}) marked as arrived at <b>${target.hospitalName}</b>. Donor is now at the pre-screening desk.`,
    'info'
  );

  updateKPIs();
  renderArrivalsTable();
};

// ────────────────────────────────────────────────────────────
// OPEN FINALIZE DONATION MODAL
// ────────────────────────────────────────────────────────────
window.openCompleteDonationModal = function (ticketId) {
  const dispatches = getDispatches();
  const target = dispatches.find(d => d.ticketId === ticketId);
  if (!target) return;

  document.getElementById('modalTicketId').value = target.ticketId;
  document.getElementById('modalDonorEmail').value = target.email || '';
  document.getElementById('modalDonorId').value = target.donorId || '';
  document.getElementById('modalHospitalName').value = target.hospitalName || '';
  document.getElementById('modalBloodGroupVal').value = target.bloodGroup || 'O+';

  document.getElementById('modalDonorName').innerHTML = `${target.donorName} &middot; <span style="color:#ff6b6b;">${target.bloodGroup}</span>`;
  document.getElementById('modalDonorDetails').textContent = `Donor ID: ${target.donorId || 'VT-IN-2026-PENDING'} · ${target.hospitalName}`;

  document.getElementById('completeDonationModal').classList.add('open');
};

// ────────────────────────────────────────────────────────────
// FINALIZE DONATION & UPDATE SUPABASE PROFILE & ENFORCE 90-DAY LOCK
// ────────────────────────────────────────────────────────────
document.getElementById('finalizeDonationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ticketId = document.getElementById('modalTicketId').value;
  const donorEmail = document.getElementById('modalDonorEmail').value;
  const donorId = document.getElementById('modalDonorId').value;
  const hospitalName = document.getElementById('modalHospitalName').value;
  const bloodGroup = document.getElementById('modalBloodGroupVal').value;
  const hb = document.getElementById('modalHb').value || '14.0';
  const component = document.getElementById('modalComponent').value || 'Whole Blood · 350 ml';

  const todayStr = new Date().toISOString().split('T')[0];
  const certId = `VT-CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // 1. Update dispatch ticket
  const dispatches = getDispatches();
  const ticket = dispatches.find(d => d.ticketId === ticketId);
  if (ticket) {
    ticket.status = 'completed';
    ticket.completedAt = new Date().toISOString();
    ticket.hb = hb;
    ticket.component = component;
    ticket.certId = certId;
    saveDispatches(dispatches);
  }

  // 2. Increment hospital blood inventory
  const inv = getInventory();
  if (inv[hospitalName] && inv[hospitalName][bloodGroup] !== undefined) {
    inv[hospitalName][bloodGroup] += 1;
    saveInventory(inv);
  }

  // 3. Update Supabase public.profiles & localStorage profile
  try {
    let currentProfile = null;
    const rawLocal = localStorage.getItem('vtv_donor_profile');
    if (rawLocal) {
      try { currentProfile = JSON.parse(rawLocal); } catch (e) {}
    }

    const sb = typeof getSupabase === 'function' ? getSupabase() : null;

    if (sb) {
      // Find user id by email or donor_id in Supabase
      const { data: dbUser } = await sb
        .from('profiles')
        .select('*')
        .or(`email.eq.${donorEmail || 'NONE'},donor_id.eq.${donorId || 'NONE'}`)
        .maybeSingle();

      if (dbUser) {
        const newCount = (dbUser.donations_count || 0) + 1;
        const newLives = (dbUser.lives_impacted || 0) + 3;
        const newPoints = (dbUser.impact_points || 0) + 150;

        await sb
          .from('profiles')
          .update({
            last_donation: todayStr,
            donations_count: newCount,
            lives_impacted: newLives,
            impact_points: newPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbUser.id);

        // Also record completed donation in Supabase public.donations table
        const { error: donErr } = await sb
          .from('donations')
          .insert({
            donor_id: dbUser.id,
            centre: hospitalName,
            component: component,
            hb: parseFloat(hb) || 14.2,
            status: 'Completed',
            donated_at: todayStr
          });

        if (donErr) {
          console.warn('[VeinToVein] Supabase donations table insert notice:', donErr);
        } else {
          console.log('[VeinToVein] Donation successfully inserted into Supabase donations table for:', dbUser.email);
        }
      }
    }

    // Always update cached profile in localStorage if matches or current user
    if (currentProfile) {
      currentProfile.last_donation = todayStr;
      currentProfile.donations_count = (currentProfile.donations_count || 1) + 1;
      currentProfile.lives_impacted = (currentProfile.lives_impacted || 3) + 3;
      currentProfile.impact_points = (currentProfile.impact_points || 100) + 150;
      localStorage.setItem('vtv_donor_profile', JSON.stringify(currentProfile));
    }

    // Append to donation history ledger
    const historyEntry = {
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      centre: hospitalName,
      component: component,
      hb: hb,
      status: 'Completed',
      certId: certId,
      timestamp: new Date().toISOString()
    };
    const histRaw = localStorage.getItem('veintovein_donation_history');
    const histList = histRaw ? JSON.parse(histRaw) : [];
    histList.unshift(historyEntry);
    localStorage.setItem('veintovein_donation_history', JSON.stringify(histList));

    // Broadcast update across open tabs (profile.html, index.html)
    window.dispatchEvent(new CustomEvent('veintovein_profile_updated', { detail: { lastDonation: todayStr } }));

  } catch (err) {
    console.error('Error synchronizing donation to Supabase:', err);
  }

  // Close modal
  document.getElementById('completeDonationModal').classList.remove('open');

  const cooling = calculateLegalEligibility(todayStr);

  adminToast(
    'Donation Finalized & Profile Synced!',
    `1 unit of <b>${bloodGroup}</b> collected at <b>${hospitalName}</b>. Donor profile updated (+1 donation, +3 lives). <b>90-day NBTC waiting period locked</b> until ${cooling.nextDate}.`,
    'success'
  );

  updateKPIs();
  renderArrivalsTable();
  renderInventory();
  loadAndRenderDonorRegistry();
});

// ────────────────────────────────────────────────────────────
// RENDER HOSPITAL INVENTORY
// ────────────────────────────────────────────────────────────
function renderInventory() {
  const grid = document.getElementById('inventoryGrid');
  if (!grid) return;

  const inv = getInventory();
  let totals = {};
  BLOOD_TYPES.forEach(t => totals[t] = 0);

  if (currentHospitalFilter === 'ALL') {
    Object.values(inv).forEach(hospCounts => {
      BLOOD_TYPES.forEach(t => {
        totals[t] += (hospCounts[t] || 0);
      });
    });
  } else {
    totals = inv[currentHospitalFilter] || totals;
  }

  grid.innerHTML = BLOOD_TYPES.map(type => {
    const units = totals[type] || 0;
    let statusClass = 'ok';
    let statusLabel = 'Optimal';
    if (units <= 5) {
      statusClass = 'critical';
      statusLabel = 'Critical';
    } else if (units <= 12) {
      statusClass = 'low';
      statusLabel = 'Low Supply';
    }

    return `
      <div class="inv-card">
        <div class="inv-type">${type}</div>
        <div class="inv-units">${units} <small style="font-size:0.68rem;color:rgba(250,245,239,0.5);">units</small></div>
        <div class="inv-status ${statusClass}">${statusLabel}</div>
        <div class="inv-ctrls">
          <button class="inv-ctrl-btn" onclick="adjustInventory('${type}', -1)" title="Decrement unit">-</button>
          <button class="inv-ctrl-btn" onclick="adjustInventory('${type}', 1)" title="Increment unit">+</button>
        </div>
      </div>
    `;
  }).join('');
}

window.adjustInventory = function (type, delta) {
  const inv = getInventory();
  if (currentHospitalFilter === 'ALL') {
    // Apply delta to first hospital
    const firstHosp = BANGALORE_HOSPITALS[0].fullName;
    inv[firstHosp][type] = Math.max(0, (inv[firstHosp][type] || 0) + delta);
  } else {
    if (!inv[currentHospitalFilter]) inv[currentHospitalFilter] = {};
    inv[currentHospitalFilter][type] = Math.max(0, (inv[currentHospitalFilter][type] || 0) + delta);
  }
  saveInventory(inv);
  renderInventory();
};

// ────────────────────────────────────────────────────────────
// RENDER ACTIVE REQUISITIONS TABLE
// ────────────────────────────────────────────────────────────
function renderRequisitions() {
  const tbody = document.getElementById('requisitionsTableBody');
  if (!tbody) return;

  const allReqs = getRequisitions();
  const list = currentHospitalFilter === 'ALL'
    ? allReqs
    : allReqs.filter(r => r.hospital === currentHospitalFilter);

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No active emergency requisitions for this hospital centre.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    let urgencyClass = 'status-arrived';
    if (r.urgency === 'Critical') urgencyClass = 'status-cooling';
    if (r.urgency === 'Urgent') urgencyClass = 'status-enroute';

    return `
      <tr>
        <td><b style="color:var(--admin-gold);">${r.id}</b></td>
        <td>
          <div style="font-weight:600;color:#fff;">${r.hospital}</div>
          <div style="font-size:0.72rem;color:rgba(250,245,239,0.5);">${r.ward || 'General'}</div>
        </td>
        <td><b style="font-size:1.1rem;color:#ff6b6b;">${r.bloodGroup}</b></td>
        <td><span class="status-pill ${urgencyClass}">${r.urgency}</span></td>
        <td><b>${r.units}</b> units</td>
        <td><span style="font-size:0.75rem;color:#6ee7b7;">● Broadcasting Live</span></td>
        <td style="text-align:right;">
          <button class="btn-sm-action" onclick="fulfillRequisition('${r.id}')" style="background:rgba(52,211,153,0.15);color:#6ee7b7;border:1px solid rgba(52,211,153,0.3);">
            Mark Fulfilled
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.fulfillRequisition = function (id) {
  const reqs = getRequisitions();
  const target = reqs.find(r => r.id === id);
  if (target) {
    target.status = 'Fulfilled';
    saveRequisitions(reqs);
    adminToast('Requisition Closed', `Requisition ${id} marked fulfilled and archived.`, 'info');
    updateKPIs();
    renderRequisitions();
  }
};

// ────────────────────────────────────────────────────────────
// BROADCAST NEW REQUISITION MODAL SUBMIT
// ────────────────────────────────────────────────────────────
document.getElementById('broadcastReqForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const hospital = document.getElementById('modalHospitalSelect').value;
  const bloodGroup = document.getElementById('modalBloodGroup').value;
  const urgency = document.getElementById('modalUrgency').value;
  const units = parseInt(document.getElementById('modalUnits').value, 10) || 2;
  const ward = document.getElementById('modalWard').value || 'Emergency ICU';
  const notes = document.getElementById('modalNotes').value || '';

  const newId = `REQ-${Math.floor(100 + Math.random() * 900)}`;

  const newReq = {
    id: newId,
    hospital: hospital,
    bloodGroup: bloodGroup,
    urgency: urgency,
    units: units,
    ward: ward,
    notes: notes,
    status: 'Seeking Donors',
    created: new Date().toISOString()
  };

  const reqs = getRequisitions();
  reqs.unshift(newReq);
  saveRequisitions(reqs);

  // Broadcast to Live Requests in Homepage if open
  window.dispatchEvent(new CustomEvent('veintovein_new_requisition', { detail: newReq }));

  document.getElementById('broadcastModal').classList.remove('open');
  adminToast(
    'Requisition Broadcast Dispatched!',
    `Emergency alert for <b>${bloodGroup} (${urgency})</b> at <b>${hospital}</b> broadcasted across the network!`,
    'success'
  );

  updateKPIs();
  renderRequisitions();
});

// ────────────────────────────────────────────────────────────
// LOAD & RENDER REGISTERED DONOR REGISTRY & 90-DAY COMPLIANCE
// ────────────────────────────────────────────────────────────
async function loadAndRenderDonorRegistry() {
  const tbody = document.getElementById('donorRegistryTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:rgba(250,245,239,0.5);">Syncing donor profiles from Supabase...</td></tr>`;

  let donors = [];

  // 1. Fetch from Supabase
  try {
    const sb = typeof getSupabase === 'function' ? getSupabase() : null;
    if (sb) {
      const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        donors = data;
      }
    }
  } catch (err) {
    console.warn('Could not read profiles table from Supabase:', err);
  }

  // 2. Fallback to localStorage active donor profile if DB returned empty
  if (donors.length === 0) {
    const cached = localStorage.getItem('vtv_donor_profile');
    if (cached) {
      try { donors.push(JSON.parse(cached)); } catch (e) {}
    }
  }

  // Add default demo donors if needed so admin table is always illustrative
  if (donors.length < 3) {
    donors.push(
      { full_name: 'Pooja Hegde', donor_id: 'VT-IN-2026-19402', blood_group: 'O-', city: 'Bengaluru', phone: '9845012345', donations_count: 5, last_donation: '2026-06-10' },
      { full_name: 'Vikramaditya Rao', donor_id: 'VT-IN-2026-88410', blood_group: 'B+', city: 'Bengaluru', phone: '9741238901', donations_count: 3, last_donation: '2026-10-28' }
    );
  }

  activeDonorsCache = donors;
  renderDonorRegistryRows(donors);
}

function renderDonorRegistryRows(donors) {
  const tbody = document.getElementById('donorRegistryTableBody');
  if (!tbody) return;

  if (donors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching registered donors found.</td></tr>`;
    return;
  }

  tbody.innerHTML = donors.map(d => {
    const eligibility = calculateLegalEligibility(d.last_donation);

    let statusPill = '';
    if (eligibility.eligible) {
      statusPill = `<span class="status-pill status-completed">✓ Eligible Now</span>`;
    } else {
      statusPill = `
        <span class="status-pill status-cooling">
          🔒 Cooling (${eligibility.daysRemaining}d left)
        </span>
        <div style="font-size:0.68rem;color:rgba(250,245,239,0.5);margin-top:2px;">Eligible: ${eligibility.nextDate}</div>
      `;
    }

    return `
      <tr>
        <td>
          <div style="font-weight:700;color:#fff;">${d.full_name || 'Donor'}</div>
          <div style="font-size:0.72rem;color:rgba(250,245,239,0.5);">ID: <b style="color:var(--admin-gold);">${d.donor_id || 'VT-IN-2026-PENDING'}</b> · ${d.email || ''}</div>
        </td>
        <td><b style="font-size:1.05rem;color:#fff;">${d.blood_group || 'O+'}</b></td>
        <td>
          <div>${d.city || 'Bengaluru'}</div>
          <div style="font-size:0.72rem;color:rgba(250,245,239,0.5);">${d.phone || '—'}</div>
        </td>
        <td><b>${d.donations_count || 1}</b> donations</td>
        <td>
          <div>${eligibility.lastDateStr}</div>
        </td>
        <td>${statusPill}</td>
        <td style="text-align:right;">
          <button class="btn-sm-action" onclick="simulateDispatchForDonor('${d.donor_id || d.email}', '${d.full_name}', '${d.blood_group}', '${d.phone}', '${d.email}')" style="background:rgba(255,255,255,0.06);color:#fff;">
            Simulate Arrival
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ────────────────────────────────────────────────────────────
// SIMULATE TEST ARRIVAL FOR INSTANT LIVE TESTING
// ────────────────────────────────────────────────────────────
function simulateTestArrival() {
  // Grab active donor profile if logged in
  let donorName = 'Chiranth';
  let donorId = 'VT-IN-2026-04817';
  let bloodGroup = 'AB+';
  let phone = '9870987987';
  let email = 'chiru57@gmail.com';

  const raw = localStorage.getItem('vtv_donor_profile');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      donorName = parsed.full_name || donorName;
      donorId = parsed.donor_id || donorId;
      bloodGroup = parsed.blood_group || bloodGroup;
      phone = parsed.phone || phone;
      email = parsed.email || email;
    } catch (e) {}
  }

  simulateDispatchForDonor(donorId, donorName, bloodGroup, phone, email);
}

window.simulateDispatchForDonor = function (donorId, donorName, bloodGroup, phone, email) {
  const targetHospital = currentHospitalFilter === 'ALL'
    ? BANGALORE_HOSPITALS[0].fullName
    : currentHospitalFilter;

  const ticketId = `VT-ARR-${Math.floor(1000 + Math.random() * 9000)}`;

  const newDispatch = {
    ticketId: ticketId,
    donorId: donorId,
    donorName: donorName,
    bloodGroup: bloodGroup,
    phone: phone,
    email: email,
    hospitalName: targetHospital,
    urgency: 'Critical',
    status: 'en_route',
    eta: '20 mins',
    acceptedAt: new Date().toISOString()
  };

  const dispatches = getDispatches();
  dispatches.unshift(newDispatch);
  saveDispatches(dispatches);

  adminToast(
    'New Inbound Donor En Route!',
    `<b>${donorName}</b> (${bloodGroup}) has accepted an emergency requisition for <b>${targetHospital}</b>. Arrival ticket <b>${ticketId}</b> created!`,
    'info'
  );

  updateKPIs();
  renderArrivalsTable();
};

// ────────────────────────────────────────────────────────────
// INITIALIZE ADMIN DASHBOARD & LISTENERS
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Hospital Selector Buttons
  document.querySelectorAll('#hospitalTabs .hosp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#hospitalTabs .hosp-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentHospitalFilter = btn.dataset.hosp;

      // Update Header title
      const titleEl = document.getElementById('activeHospTitle');
      const subEl = document.getElementById('activeHospSubtitle');
      if (currentHospitalFilter === 'ALL') {
        if (titleEl) titleEl.textContent = 'Bengaluru Network Overview (All 6 Centres)';
        if (subEl) subEl.textContent = 'Centralized donor arrival monitoring, NBTC cooling period enforcement, and blood inventory ledger.';
      } else {
        if (titleEl) titleEl.textContent = currentHospitalFilter;
        if (subEl) subEl.textContent = 'Designated blood bank receiving desk, donor triage, and local cold-chain inventory.';
      }

      updateKPIs();
      renderArrivalsTable();
      renderInventory();
      renderRequisitions();
    });
  });

  // 2. Modals
  const broadcastModal = document.getElementById('broadcastModal');
  const completeModal = document.getElementById('completeDonationModal');

  document.getElementById('btnOpenBroadcastModal')?.addEventListener('click', () => {
    broadcastModal?.classList.add('open');
  });
  document.getElementById('btnBroadcastSecondary')?.addEventListener('click', () => {
    broadcastModal?.classList.add('open');
  });
  document.querySelectorAll('[data-close-modal]').forEach(b => {
    b.addEventListener('click', () => {
      broadcastModal?.classList.remove('open');
      completeModal?.classList.remove('open');
    });
  });

  // 3. Test Arrival Buttons
  document.getElementById('btnSimulateArrival')?.addEventListener('click', simulateTestArrival);

  // 4. Refresh Button
  document.getElementById('btnRefreshData')?.addEventListener('click', () => {
    updateKPIs();
    renderArrivalsTable();
    renderInventory();
    renderRequisitions();
    loadAndRenderDonorRegistry();
    adminToast('Data Refreshed', 'Synced latest state with Supabase and active dispatches.', 'info');
  });

  // 5. Donor Search Filter
  document.getElementById('donorSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderDonorRegistryRows(activeDonorsCache);
      return;
    }
    const filtered = activeDonorsCache.filter(d =>
      (d.full_name || '').toLowerCase().includes(q) ||
      (d.email || '').toLowerCase().includes(q) ||
      (d.donor_id || '').toLowerCase().includes(q) ||
      (d.blood_group || '').toLowerCase().includes(q) ||
      (d.city || '').toLowerCase().includes(q)
    );
    renderDonorRegistryRows(filtered);
  });

  // Listen for storage changes across tabs
  window.addEventListener('storage', () => {
    updateKPIs();
    renderArrivalsTable();
    renderInventory();
  });

  // Initial load
  updateKPIs();
  renderArrivalsTable();
  renderInventory();
  renderRequisitions();
  loadAndRenderDonorRegistry();
});

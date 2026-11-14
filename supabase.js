// ========================================================
// VeinToVein — Supabase Backend Configuration & Auth Client
// ========================================================

// ── Rate-limit live simulated emergency requests & notifications to 1–2 minutes ──
(function setupLiveRequestThrottler() {
  if (typeof window === 'undefined') return;

  const MIN_DELAY = 60000;  // 1 minute (60 seconds)
  const MAX_DELAY = 120000; // 2 minutes (120 seconds)

  function getSlowDelay() {
    return Math.floor(MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY));
  }

  // 1. Intercept setInterval: slow down rapid request generators to 1-2 minutes
  const originalSetInterval = window.setInterval;
  window.setInterval = function (fn, delay, ...args) {
    if (typeof fn === 'function') {
      const fnCode = fn.toString();

      const isLiveRequestGenerator =
        (fnCode.includes('request') ||
         fnCode.includes('req-card') ||
         fnCode.includes('pushNotification') ||
         fnCode.includes('fulfilledToday') ||
         fnCode.includes('enroute') ||
         fnCode.includes('requisition') ||
         fnCode.includes('notif') ||
         fnCode.includes('feed') ||
         fnCode.includes('urgent') ||
         fnCode.includes('critical')) &&
        !fnCode.includes('liveClock') &&
        !fnCode.includes('testi') &&
        !fnCode.includes('tTrack');

      if (isLiveRequestGenerator && delay < MIN_DELAY) {
        console.log(`[VeinToVein] Throttling emergency request generator from ${delay}ms to 1–2 minutes.`);

        const runLoop = () => {
          const nextInterval = getSlowDelay();
          setTimeout(() => {
            try {
              fn(...args);
            } catch (err) {
              console.warn('Throttled request tick:', err);
            }
            runLoop();
          }, nextInterval);
        };

        // First new incoming request after 60 to 90 seconds
        setTimeout(runLoop, 60000 + Math.floor(Math.random() * 30000));
        return 777777;
      }
    }
    return originalSetInterval.call(window, fn, delay, ...args);
  };

  // 2. Intercept setTimeout for recursive timeout patterns
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function (fn, delay, ...args) {
    if (typeof fn === 'function' && delay > 1500 && delay < MIN_DELAY) {
      const fnCode = fn.toString();
      const isLiveRequestGenerator =
        (fnCode.includes('request') ||
         fnCode.includes('req-card') ||
         fnCode.includes('pushNotification') ||
         fnCode.includes('fulfilledToday') ||
         fnCode.includes('requisition')) &&
        !fnCode.includes('liveClock') &&
        !fnCode.includes('testi');

      if (isLiveRequestGenerator) {
        delay = getSlowDelay();
        console.log(`[VeinToVein] Throttling request timeout to ${Math.round(delay / 1000)}s.`);
      }
    }
    return originalSetTimeout.call(window, fn, delay, ...args);
  };

  // 3. Throttle DOM insertions into #requestGrid & ensure updated hospitals & locations
  const BANGALORE_HOSPITALS = [
    { name: 'Apollo Hospitals', location: 'Seshadripuram' },
    { name: 'Fortis Hospital', location: 'Cunningham Road, Vasanth Nagar' },
    { name: 'Aster CMI Hospital', location: 'Hebbal, Sahakara Nagar' },
    { name: 'Manipal Hospitals', location: 'Old Airport Road, Kodihalli' },
    { name: 'Narayana Health City', location: 'Bommasandra' },
    { name: 'Manipal Hospitals Sarjapur Road', location: 'Bellandur, Sarjapur Road' }
  ];
  let hospIndex = 0;

  function formatCardHospital(card) {
    if (!card || !card.querySelector) return;
    const h3 = card.querySelector('.req-meta h3');
    const p = card.querySelector('.req-meta p');
    if (h3 && p) {
      const h = BANGALORE_HOSPITALS[hospIndex % BANGALORE_HOSPITALS.length];
      hospIndex++;
      h3.textContent = h.name;
      p.textContent = `${h.location} · Verified Centre`;
    }
    if (typeof applyCompatibilityToCard === 'function') {
      applyCompatibilityToCard(card);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('requestGrid');
    if (!grid) return;

    // Format any initial cards rendered by script.js
    setTimeout(() => {
      grid.querySelectorAll('.req-card').forEach(formatCardHospital);
    }, 400);

    let isInitialLoad = true;
    setTimeout(() => { isInitialLoad = false; }, 2500);

    let lastRequestTime = Date.now();

    const origPrepend = grid.prepend;
    const origInsertBefore = grid.insertBefore;

    function shouldThrottle() {
      if (isInitialLoad) return false;
      const now = Date.now();
      if (now - lastRequestTime < 60000) {
        return true;
      }
      lastRequestTime = now;
      return false;
    }

    if (origPrepend) {
      grid.prepend = function (...nodes) {
        if (shouldThrottle()) {
          console.log('[VeinToVein] Throttled rapid request card (ensuring 1-2 min pacing)');
          return;
        }
        nodes.forEach(formatCardHospital);
        return origPrepend.apply(this, nodes);
      };
    }

    if (origInsertBefore) {
      grid.insertBefore = function (newNode, referenceNode) {
        if (shouldThrottle()) {
          console.log('[VeinToVein] Throttled rapid request card (ensuring 1-2 min pacing)');
          return newNode;
        }
        formatCardHospital(newNode);
        return origInsertBefore.call(this, newNode, referenceNode);
      };
    }
  });

  // 4. Throttle automated push notifications to 1-2 min pacing
  let lastPushTime = Date.now();
  let _pushNotif = window.pushNotification;
  Object.defineProperty(window, 'pushNotification', {
    configurable: true,
    enumerable: true,
    get() { return _pushNotif; },
    set(newFn) {
      _pushNotif = function (title, body) {
        if (typeof title === 'string' && (title.includes('Welcome') || title.includes('Profile') || title.includes('Copied'))) {
          return newFn(title, body);
        }
        const now = Date.now();
        if (now - lastPushTime < 60000) {
          return;
        }
        lastPushTime = now;
        return newFn(title, body);
      };
    }
  });
})();

// ========================================================
// Blood Donation Compatibility Engine for Live Requests
// ========================================================

const BLOOD_COMPATIBILITY_RULES = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

function normalizeBloodType(t) {
  if (!t) return '';
  return t.replace(/[\u2212\u2013\u2014]/g, '-').replace(/\s+/g, '').toUpperCase();
}

function checkDonorCompatibility(donorType, recipientType) {
  const d = normalizeBloodType(donorType);
  const r = normalizeBloodType(recipientType);
  const allowed = BLOOD_COMPATIBILITY_RULES[d] || [];
  return allowed.map(normalizeBloodType).includes(r);
}

// ── Global Donor State ──
let activeDonorBloodGroup = null;
let isDonorAuthenticated = false;
let currentDonorProfile = null;

// ── NBTC Mandatory 90-Day Legal Cooling Period Helper ──
function checkLegalWaitingPeriod(lastDonationStr) {
  if (!lastDonationStr) {
    return { eligible: true, daysElapsed: null, daysRemaining: 0, nextDate: 'Eligible Today', lastDateStr: 'Never Donated' };
  }
  const lastDate = new Date(lastDonationStr);
  if (isNaN(lastDate.getTime())) {
    return { eligible: true, daysElapsed: null, daysRemaining: 0, nextDate: 'Eligible Today', lastDateStr: 'Unknown' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastTime = new Date(lastDate);
  lastTime.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - lastTime) / (1000 * 60 * 60 * 24));
  const WAITING_PERIOD = 90; // Mandatory NBTC whole blood recovery interval

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

function applyCompatibilityToCard(card) {
  if (!card || !card.querySelector) return;
  const badge = card.querySelector('.type-badge');
  const btn = card.querySelector('.accept-btn');
  if (!badge || !btn) return;

  const neededType = badge.textContent.trim();
  btn.dataset.neededType = neededType;

  // Find or create compatibility badge in req-card
  let compatBadge = card.querySelector('.compat-card-badge');
  if (!compatBadge) {
    compatBadge = document.createElement('div');
    compatBadge.className = 'compat-card-badge';
    compatBadge.style.margin = '4px 0 2px';
    const reqTop = card.querySelector('.req-top');
    if (reqTop && reqTop.nextSibling) {
      card.insertBefore(compatBadge, reqTop.nextSibling);
    } else {
      card.prepend(compatBadge);
    }
  }

  // Already accepted card
  if (btn.classList.contains('done')) {
    compatBadge.innerHTML = `<span class="compat-badge-match">✓ Accepted · En Route</span>`;
    return;
  }

  // If user is not authenticated: prompt sign-in
  if (!isDonorAuthenticated || !activeDonorBloodGroup) {
    btn.classList.remove('incompatible');
    btn.classList.remove('cooling-locked');
    btn.classList.add('guest-btn');
    btn.title = `Sign in to check compatibility and accept requisition`;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      <span>Sign In to Donate (${neededType})</span>
    `;
    compatBadge.innerHTML = `<span style="font-size:0.68rem;color:rgba(250,245,239,0.5);">Requires ${neededType} · Sign in to verify compatibility</span>`;
    return;
  }

  // User is authenticated: Enforce strict compatibility & NBTC 90-day waiting period
  btn.classList.remove('guest-btn');

  const legalStatus = checkLegalWaitingPeriod(currentDonorProfile?.last_donation);

  // 1. Check if donor is locked in legal waiting period
  if (!legalStatus.eligible) {
    btn.classList.remove('incompatible');
    btn.classList.add('cooling-locked');
    btn.disabled = false; // keep clickable so clicking shows detailed NBTC alert
    btn.title = `Legal waiting period active: ${legalStatus.daysRemaining} days remaining until ${legalStatus.nextDate}`;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>Cooling Period (${legalStatus.daysRemaining}d left)</span>
    `;
    compatBadge.innerHTML = `<span class="compat-badge-mismatch">🔒 90-Day Waiting Period Active (Next: ${legalStatus.nextDate})</span>`;
    return;
  }

  // 2. Check clinical ABO/Rh blood compatibility
  btn.classList.remove('cooling-locked');
  const isCompatible = checkDonorCompatibility(activeDonorBloodGroup, neededType);

  if (isCompatible) {
    btn.classList.remove('incompatible');
    btn.disabled = false;
    btn.title = `You are a compatible donor (${activeDonorBloodGroup} → ${neededType})`;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      <span>I Can Donate (${activeDonorBloodGroup})</span>
    `;
    compatBadge.innerHTML = `<span class="compat-badge-match">✓ Compatible with your ${activeDonorBloodGroup} blood · Eligible</span>`;
  } else {
    btn.classList.add('incompatible');
    btn.title = `Incompatible: Type ${activeDonorBloodGroup} red cells cannot be given to ${neededType}`;
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      <span>Incompatible with ${activeDonorBloodGroup}</span>
    `;
    compatBadge.innerHTML = `<span class="compat-badge-mismatch">Type Mismatch · Patient Needs ${neededType}</span>`;
  }
}

function applyCompatibilityToAllCards() {
  const grid = document.getElementById('requestGrid');
  if (!grid) return;
  grid.querySelectorAll('.req-card').forEach(applyCompatibilityToCard);
}

// Toast alert helper inside compatibility module
function showCompatAlert(title, message) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast urgent';
  el.style.borderLeftColor = '#ef4444';
  el.innerHTML = `<div class="toast-body"><b style="color:#fca5a5;font-size:0.86rem;display:block;margin-bottom:2px;">${title}</b><p style="color:#ffffff;font-size:0.82rem;font-weight:500;margin:0;">${message}</p></div>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 320);
  }, 5500);
}

// Intercept clicks on .accept-btn in capturing phase to enforce production rules
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.accept-btn');
  if (!btn) return;

  // 1. Guest click
  if (btn.classList.contains('guest-btn')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    showCompatAlert('Sign In Required', 'Please sign in or create an account to verify your donor blood compatibility before accepting emergency requisitions.');
    setTimeout(() => {
      window.location.href = 'auth.html?mode=signin';
    }, 1100);
    return false;
  }

  // 2. Cooling period locked click (90-day legal waiting period enforcement)
  if (btn.classList.contains('cooling-locked')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const legalStatus = checkLegalWaitingPeriod(currentDonorProfile?.last_donation);
    showCompatAlert(
      'NBTC Legal Cooling Period Active',
      `Under National Blood Transfusion Council (NBTC) regulations, donors must rest for <b>90 days</b> between whole blood donations to replenish hemoglobin and iron reserves.<br><br>Last Donation: <b>${legalStatus.lastDateStr}</b><br>Next Eligible Date: <b style="color:#6ee7b7;">${legalStatus.nextDate}</b> (${legalStatus.daysRemaining} days remaining).`
    );
    return false;
  }

  // 3. Incompatible donor click
  if (btn.classList.contains('incompatible')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const needed = btn.dataset.neededType || 'this type';
    showCompatAlert(
      'Blood Compatibility Guard',
      `As an <b>${activeDonorBloodGroup}</b> donor, you cannot donate red blood cells to <b>${needed}</b> patients. Requisitions are strictly locked to compatible donors for clinical safety.`
    );
    return false;
  }

  // 4. Valid Compatible & Eligible Donor accepts emergency requisition!
  if (!btn.classList.contains('done')) {
    e.preventDefault();
    e.stopImmediatePropagation();

    const card = btn.closest('.req-card');
    const hospName = card?.querySelector('.req-meta h3')?.textContent?.trim() || 'Apollo Hospitals';
    const hospLoc = card?.querySelector('.req-meta p')?.textContent?.trim() || 'Bengaluru';
    const neededType = btn.dataset.neededType || activeDonorBloodGroup;
    const urgency = card?.querySelector('.urgency')?.textContent?.trim() || 'Critical';
    const ticketId = `VT-ARR-${Math.floor(1000 + Math.random() * 9000)}`;

    // Update button & card state
    btn.classList.add('done');
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span>En Route to ${hospName}</span>
    `;

    const compatBadge = card?.querySelector('.compat-card-badge');
    if (compatBadge) {
      compatBadge.innerHTML = `<span class="compat-badge-match">✓ Accepted · Arrival Ticket ${ticketId} Registered</span>`;
    }

    // Register dispatch ticket into storage for Hospital Admin Desk
    const newDispatch = {
      ticketId: ticketId,
      donorId: currentDonorProfile?.donor_id || 'VT-IN-2026-PENDING',
      donorName: currentDonorProfile?.full_name || 'Verified Donor',
      bloodGroup: activeDonorBloodGroup,
      phone: currentDonorProfile?.phone || '',
      email: currentDonorProfile?.email || '',
      hospitalName: hospName,
      hospitalLocation: hospLoc,
      urgency: urgency,
      neededType: neededType,
      status: 'en_route',
      eta: '25 mins',
      acceptedAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem('veintovein_dispatches');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newDispatch);
      localStorage.setItem('veintovein_dispatches', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('veintovein_dispatch_updated'));

      // Also persist donor acceptance into Supabase tables
      const sb = typeof getSupabase === 'function' ? getSupabase() : null;
      if (sb && currentDonorProfile && currentDonorProfile.id) {
        // 1. Insert into public.donations
        sb.from('donations').insert({
          donor_id: currentDonorProfile.id,
          centre: hospName,
          component: 'Whole Blood · 350 ml',
          status: 'En Route',
          donated_at: new Date().toISOString().split('T')[0]
        }).then(({ data, error }) => {
          if (error) console.warn('[VeinToVein] Supabase donations insert notice:', error);
          else console.log('[VeinToVein] Requisition acceptance saved to Supabase donations table.');
        });

        // 2. Insert into public.request_responses
        sb.from('request_responses').insert({
          donor_id: currentDonorProfile.id,
          request_id: '8d296ce1-36d7-4161-b0f0-f91455686bde',
          accepted_at: new Date().toISOString()
        }).then(({ data, error }) => {
          if (error) console.warn('[VeinToVein] Supabase request_responses notice:', error);
          else console.log('[VeinToVein] Accepted response saved to Supabase request_responses table.');
        });
      }
    } catch (err) {
      console.warn('Dispatch save error:', err);
    }

    // Show confirmation modal toast
    showCompatAlert(
      'Requisition Accepted — Arrival Registered',
      `Thank you, <b>${currentDonorProfile?.full_name || 'Donor'}</b>! Your arrival ticket (<b>${ticketId}</b>) has been dispatched to <b>${hospName}</b>. Please report to the Blood Bank desk within 30–45 minutes.`
    );
  }
}, true); // capturing phase ensures full guard enforcement

// Initialize compatibility state & UI
async function initLiveRequestCompatibility() {
  const contentEl = document.getElementById('compatBarContent');
  const actionEl = document.getElementById('compatBarAction');

  if (typeof getCurrentDonor === 'function') {
    const current = await getCurrentDonor();

    if (current && current.profile && current.profile.blood_group) {
      isDonorAuthenticated = true;
      activeDonorBloodGroup = current.profile.blood_group;
      currentDonorProfile = current.profile;
      const donorName = current.profile.full_name || 'Donor';

      const legalStatus = checkLegalWaitingPeriod(current.profile.last_donation);

      if (contentEl) {
        if (!legalStatus.eligible) {
          contentEl.innerHTML = `Verified Donor: <b style="color:#fff;">${donorName}</b> &middot; Group: <b style="color:var(--gold);font-size:1.05rem;">${activeDonorBloodGroup}</b> <span style="font-size:0.72rem;color:#fca5a5;margin-left:8px;font-weight:700;">(🔒 90-Day Cooling Period until ${legalStatus.nextDate})</span>`;
        } else {
          contentEl.innerHTML = `Verified Donor: <b style="color:#fff;">${donorName}</b> &middot; Group: <b style="color:var(--gold);font-size:1.05rem;">${activeDonorBloodGroup}</b> <span style="font-size:0.7rem;color:#6ee7b7;margin-left:6px;font-weight:700;">(✓ Eligible to Donate)</span>`;
        }
      }
      if (actionEl) {
        if (!legalStatus.eligible) {
          actionEl.innerHTML = `
            <span class="compat-badge-mismatch" style="font-size:0.7rem;padding:4px 8px;">
              🔒 Cooling (${legalStatus.daysRemaining}d left)
            </span>
            <a href="profile.html" class="btn btn-ghost-light btn-sm" style="padding:0.35rem 0.85rem;font-size:0.74rem;">My Passport &rarr;</a>
          `;
        } else {
          actionEl.innerHTML = `
            <span class="compat-badge-match">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Live Compatibility Enforced
            </span>
            <a href="profile.html" class="btn btn-ghost-light btn-sm" style="padding:0.35rem 0.85rem;font-size:0.74rem;">My Profile &rarr;</a>
          `;
        }
      }
    } else {
      isDonorAuthenticated = false;
      activeDonorBloodGroup = null;
      currentDonorProfile = null;

      if (contentEl) {
        contentEl.innerHTML = `Sign in with your donor account to match and accept emergency requisitions for your exact blood type.`;
      }
      if (actionEl) {
        actionEl.innerHTML = `
          <a href="auth.html?mode=signin" class="btn btn-primary btn-sm" style="padding:0.4rem 0.95rem;font-size:0.76rem;">Sign In to Match</a>
        `;
      }
    }
  }

  // Apply to all current request cards
  applyCompatibilityToAllCards();
  setTimeout(applyCompatibilityToAllCards, 500);
  setTimeout(applyCompatibilityToAllCards, 1200);
  setTimeout(applyCompatibilityToAllCards, 2600);
}

document.addEventListener('DOMContentLoaded', () => {
  initLiveRequestCompatibility();
});




const SUPABASE_CONFIG = {
  url: 'https://mabpdkcknwimeetyixjj.supabase.co',
  anonKey: 'sb_publishable_C1LHXBEyBTAtTqC9XebhOA_nQtfvvit'
};

// Global Supabase Client instance
let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    _supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return _supabase;
  }
  console.warn('Supabase JS library not loaded. Make sure to include the Supabase CDN script.');
  return null;
}

// Generate unique Donor ID format: VT-IN-2025-XXXXX
function generateDonorId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `VT-IN-${year}-${randomNum}`;
}

// Extract initials from full name
function getInitials(name) {
  if (!name) return 'VT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Register a new donor account with email, password & donor profile data
 */
async function signUpDonor({ email, password, fullName, phone, bloodGroup, city, lastDonation }) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client is not available.');

  const donorId = generateDonorId();
  const metadata = {
    full_name: fullName,
    phone: phone,
    blood_group: bloodGroup,
    city: city,
    last_donation: lastDonation || null,
    donor_id: donorId,
    created_at: new Date().toISOString()
  };

  // 1. Sign up with Supabase Auth
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (error) {
    return { data: null, error };
  }

  // 2. If user was created, attempt to store/upsert in public.profiles table
  if (data?.user) {
    const profileRecord = {
      id: data.user.id,
      email: email,
      full_name: fullName,
      phone: phone,
      blood_group: bloodGroup,
      city: city,
      last_donation: lastDonation || null,
      donor_id: donorId,
      updated_at: new Date().toISOString()
    };

    try {
      await sb.from('profiles').upsert(profileRecord);
    } catch (tblErr) {
      // If table doesn't exist yet, metadata in auth.users still keeps data safe
      console.warn('Notice: profiles table upsert skipped or not yet created. Using auth metadata:', tblErr);
    }

    // Cache to localStorage for instantaneous UI updates
    localStorage.setItem('vtv_donor_profile', JSON.stringify(profileRecord));
  }

  return { data, error: null };
}

/**
 * Sign in existing donor with email & password
 */
async function signInDonor({ email, password }) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase client is not available.');

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { data: null, error };
  }

  // Fetch or compile profile data
  if (data?.user) {
    let profile = null;
    try {
      const { data: dbProfile, error: dbErr } = await sb
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!dbErr && dbProfile) {
        profile = dbProfile;
      }
    } catch (e) {
      console.warn('Could not fetch from profiles table, using user metadata:', e);
    }

    // Fallback to auth user metadata if database table isn't populated
    if (!profile) {
      const meta = data.user.user_metadata || {};
      profile = {
        id: data.user.id,
        email: data.user.email,
        full_name: meta.full_name || data.user.email.split('@')[0],
        phone: meta.phone || '',
        blood_group: meta.blood_group || 'O+',
        city: meta.city || 'India',
        last_donation: meta.last_donation || null,
        donor_id: meta.donor_id || generateDonorId()
      };
    }

    localStorage.setItem('vtv_donor_profile', JSON.stringify(profile));
  }

  return { data, error: null };
}

/**
 * Sign out current donor
 */
async function signOutDonor() {
  const sb = getSupabase();
  localStorage.removeItem('vtv_donor_profile');
  if (sb) {
    const { error } = await sb.auth.signOut();
    return { error };
  }
  return { error: null };
}

/**
 * Get currently authenticated donor and profile
 */
async function getCurrentDonor() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || !session.user) {
      localStorage.removeItem('vtv_donor_profile');
      return null;
    }

    const user = session.user;
    let profile = null;

    // Check cached profile first
    const cached = localStorage.getItem('vtv_donor_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === user.id) profile = parsed;
      } catch (e) {}
    }

    // Fetch fresh profile from table
    if (!profile) {
      try {
        const { data: dbProfile } = await sb
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (dbProfile) profile = dbProfile;
      } catch (e) {}
    }

    // Fallback to metadata
    if (!profile) {
      const meta = user.user_metadata || {};
      profile = {
        id: user.id,
        email: user.email,
        full_name: meta.full_name || user.email.split('@')[0],
        phone: meta.phone || '',
        blood_group: meta.blood_group || 'O+',
        city: meta.city || 'India',
        last_donation: meta.last_donation || null,
        donor_id: meta.donor_id || 'VT-IN-2025-PENDING'
      };
    }

    localStorage.setItem('vtv_donor_profile', JSON.stringify(profile));
    return { user, profile };
  } catch (err) {
    console.error('Error fetching current donor:', err);
    return null;
  }
}

/**
 * Update dynamic Navbar auth state on any page
 */
async function updateNavAuthUI() {
  const sb = getSupabase();
  if (!sb) return;

  const current = await getCurrentDonor();
  const navActions = document.querySelector('.nav-actions');
  const mobileMenu = document.getElementById('mobileMenu');

  if (current && current.profile) {
    const p = current.profile;
    const initials = getInitials(p.full_name);
    const firstName = (p.full_name || 'Donor').split(' ')[0];

    // Update desktop nav actions
    const existingAuthBtn = document.getElementById('navAuthBtn');
    if (existingAuthBtn) {
      existingAuthBtn.outerHTML = `
        <div class="user-nav-chip" id="navAuthBtn">
          <a href="profile.html" class="user-chip-link" title="View Profile">
            <span class="user-avatar-mini">${initials}</span>
            <span class="user-name-mini">${firstName}</span>
          </a>
          <button class="btn btn-ghost-light btn-sm btn-logout" id="navLogoutBtn" title="Sign Out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Exit</span>
          </button>
        </div>
      `;
    }

    // Update mobile menu
    if (mobileMenu) {
      let mobAuth = document.getElementById('mobAuthLink');
      if (!mobAuth) {
        mobAuth = document.createElement('div');
        mobAuth.id = 'mobAuthLink';
        mobAuth.className = 'mob-auth-box';
        mobileMenu.appendChild(mobAuth);
      }
      mobAuth.innerHTML = `
        <div style="padding:10px 0;border-top:1px solid var(--line);margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
          <a href="profile.html" style="font-weight:700;color:var(--crimson);border:none;padding:0;">${p.full_name} (${p.blood_group})</a>
          <button id="mobLogoutBtn" class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:0.75rem;">Sign Out</button>
        </div>
      `;
      document.getElementById('mobLogoutBtn')?.addEventListener('click', async () => {
        await signOutDonor();
        window.location.reload();
      });
    }

    document.getElementById('navLogoutBtn')?.addEventListener('click', async () => {
      await signOutDonor();
      window.location.reload();
    });

  } else {
    // Logged out state
    const existingAuthBtn = document.getElementById('navAuthBtn');
    if (existingAuthBtn) {
      existingAuthBtn.outerHTML = `
        <div class="auth-actions-group" id="navAuthBtn">
          <a href="auth.html?mode=signin" class="btn btn-ghost btn-sm" style="margin-right:4px;">Sign In</a>
          <a href="auth.html?mode=signup" class="btn btn-primary btn-sm">Join as Donor</a>
        </div>
      `;
    }

    if (mobileMenu) {
      let mobAuth = document.getElementById('mobAuthLink');
      if (!mobAuth) {
        mobAuth = document.createElement('div');
        mobAuth.id = 'mobAuthLink';
        mobileMenu.appendChild(mobAuth);
      }
      mobAuth.innerHTML = `
        <div style="padding:12px 0 4px;border-top:1px solid var(--line);margin-top:10px;display:flex;gap:8px;">
          <a href="auth.html?mode=signin" class="btn btn-ghost btn-sm" style="flex:1;text-align:center;border-bottom:none;">Sign In</a>
          <a href="auth.html?mode=signup" class="btn btn-primary btn-sm" style="flex:1;text-align:center;border-bottom:none;">Register</a>
        </div>
      `;
    }
  }
}

// Automatically initialize auth listener and UI on DOM load
function setupModalRegistration() {
  const modalForm = document.getElementById('registerForm');
  if (!modalForm) return;

  modalForm.addEventListener('submit', async (e) => {
    const emailEl = document.getElementById('regEmail');
    const pwdEl = document.getElementById('regPassword');
    if (!emailEl || !pwdEl) return;

    const email = emailEl.value.trim();
    const password = pwdEl.value;
    const name = document.getElementById('regName')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const group = document.getElementById('regGroup')?.value;
    const city = document.getElementById('regCity')?.value.trim();
    const lastDonation = document.getElementById('regLast')?.value;

    if (!email || !password || password.length < 6) return;

    try {
      const { data, error } = await signUpDonor({
        email,
        password,
        fullName: name,
        phone,
        bloodGroup: group,
        city,
        lastDonation
      });
      if (error) {
        console.warn('Supabase modal registration notice:', error.message);
      } else {
        console.log('Donor registered in Supabase:', data);
        if (data?.user?.user_metadata?.donor_id) {
          const donorIdEl = document.getElementById('donorIdOut');
          if (donorIdEl) donorIdEl.textContent = data.user.user_metadata.donor_id;
        }
      }
    } catch (err) {
      console.warn('Modal registration exception:', err);
    }
  }, true);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const sb = getSupabase();
    if (sb) {
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          updateNavAuthUI();
          if (typeof initLiveRequestCompatibility === 'function') {
            initLiveRequestCompatibility();
          }
        }
      });
      updateNavAuthUI();
      setupModalRegistration();
    }
  });
}

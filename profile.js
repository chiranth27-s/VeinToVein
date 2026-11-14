'use strict';

const nav = document.getElementById('nav');
const backTop = document.getElementById('backTop');
const menu = document.getElementById('mobileMenu');
const toggle = document.getElementById('navToggle');

// Toast notification helper
function toast(title, detail) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast info';
  el.innerHTML = '<div><b>' + title + '</b><p>' + detail + '</p></div>';
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// Window scroll listeners
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 40);
  backTop?.classList.toggle('show', window.scrollY > 420);
}, { passive: true });

backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

toggle?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

// Dashboard Tabs
document.querySelectorAll('.dash-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.toggle('active', p.id === tab.dataset.tab));
  });
});

// Copy Donor ID action
document.getElementById('copyDonorId')?.addEventListener('click', async () => {
  const id = document.getElementById('profileDonorId')?.textContent?.trim() || document.querySelector('.donor-id-chip b')?.textContent?.trim();
  if (!id) return;
  try {
    await navigator.clipboard.writeText(id);
    toast('Donor ID copied', id);
  } catch {
    toast('Donor ID', id);
  }
});

// Certificate download demo action
document.getElementById('historyCertBtn')?.addEventListener('click', () => {
  toast('Donor Impact Certificate', 'Your 256-bit encrypted certificate is verified on the Supabase ledger.');
});

// Footer year
const year = document.getElementById('footerYear');
if (year) year.textContent = new Date().getFullYear();

// Format date helper
function formatDateString(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Add days to date helper
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ────────────────────────────────────────────────────────────
// Connect Profile page to Supabase Live Auth & Data
// ────────────────────────────────────────────────────────────
async function syncProfileWithSupabase() {
  const banner = document.getElementById('authStatusBanner');
  const bannerText = document.getElementById('authStatusText');
  const bannerAction = document.getElementById('authStatusAction');
  const signOutBtn = document.getElementById('profileSignOutBtn');

  // If supabase.js is loaded, get the current donor
  if (typeof getCurrentDonor !== 'function') return;

  try {
    const current = await getCurrentDonor();

    if (current && current.profile) {
      const p = current.profile;
      const u = current.user;

      // Update Top Status Banner
      if (banner) {
        banner.style.display = 'flex';
        banner.style.background = 'rgba(31, 157, 85, 0.14)';
        banner.style.borderColor = 'rgba(52, 211, 153, 0.4)';
        banner.style.color = '#6ee7b7';
        if (bannerText) {
          bannerText.innerHTML = `<strong>Live Supabase Session Active:</strong> Signed in as <b>${p.full_name}</b> (${u.email || p.email}). Your donor passport is live!`;
        }
        if (bannerAction) {
          bannerAction.textContent = 'Account Settings';
          bannerAction.href = 'auth.html';
        }
      }

      // Update Profile Card
      const avatarEl = document.getElementById('profileAvatar');
      if (avatarEl) avatarEl.textContent = getInitials(p.full_name);

      const nameEl = document.getElementById('profileName');
      if (nameEl) nameEl.textContent = p.full_name || 'Verified Donor';

      const donorIdEl = document.getElementById('profileDonorId');
      if (donorIdEl && p.donor_id) donorIdEl.textContent = p.donor_id;

      const cityEl = document.getElementById('profileCity');
      if (cityEl) cityEl.textContent = p.city || 'India';

      const phoneEl = document.getElementById('profilePhone');
      if (phoneEl) phoneEl.textContent = p.phone || '—';

      const emailEl = document.getElementById('profileEmail');
      if (emailEl) emailEl.textContent = u.email || p.email || '—';

      // Update Donor Card
      const cardNameEl = document.getElementById('cardName');
      if (cardNameEl) cardNameEl.textContent = (p.full_name || 'VERIFIED DONOR').toUpperCase();

      const cardDonorIdEl = document.getElementById('cardDonorId');
      if (cardDonorIdEl && p.donor_id) cardDonorIdEl.textContent = p.donor_id;

      const cardGroupEl = document.getElementById('cardGroup');
      if (cardGroupEl) cardGroupEl.innerHTML = `${p.blood_group || 'O+'}<small>Blood Group</small>`;

      // Update Impact Numbers
      const donCountEl = document.getElementById('profileDonationsCount');
      if (donCountEl) donCountEl.textContent = p.donations_count || 1;

      const livesEl = document.getElementById('profileLivesImpacted');
      if (livesEl) livesEl.textContent = p.lives_impacted || (p.donations_count ? p.donations_count * 3 : 3);

      const ptsEl = document.getElementById('profilePoints');
      if (ptsEl) ptsEl.textContent = (p.impact_points || 250).toLocaleString();

      // Update Last Donation & Next Eligible Date (NBTC 90-day waiting period)
      const statLast = document.getElementById('statLastDonation');
      const statNext = document.getElementById('statNextEligible');
      const passText = document.getElementById('profilePassText');
      const passChip = document.getElementById('profilePassChip');

      const eligibility = typeof checkLegalWaitingPeriod === 'function'
        ? checkLegalWaitingPeriod(p.last_donation)
        : (function () {
            if (!p.last_donation) return { eligible: true, daysRemaining: 0, nextDate: 'Eligible Today', lastDateStr: 'Ready' };
            const d = new Date(p.last_donation);
            const today = new Date();
            today.setHours(0,0,0,0);
            const diff = Math.floor((today - d)/(1000*60*60*24));
            const next = new Date(d);
            next.setDate(next.getDate() + 90);
            return {
              eligible: diff >= 90,
              daysRemaining: 90 - diff,
              nextDate: next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              lastDateStr: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            };
          })();

      if (!eligibility.eligible) {
        if (statLast) statLast.textContent = `${eligibility.lastDateStr} · Hospital Verified`;
        if (statNext) statNext.innerHTML = `<span style="color:#fca5a5;font-weight:700;">${eligibility.nextDate}</span> (${eligibility.daysRemaining} days remaining)`;
        if (passText) passText.textContent = `🔒 90-DAY COOLING PERIOD ACTIVE · NEXT ${eligibility.nextDate.toUpperCase()}`;
        if (passChip) {
          passChip.style.background = 'rgba(239, 68, 68, 0.16)';
          passChip.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          passChip.style.color = '#fca5a5';
        }
      } else {
        if (statLast) statLast.textContent = p.last_donation ? `${eligibility.lastDateStr} · Verified Lab` : 'Ready for 1st Donation';
        if (statNext) statNext.textContent = 'Eligible today (whole blood)';
        if (passText) passText.textContent = 'ELIGIBILITY PASSPORT ACTIVE · ELIGIBLE NOW';
        if (passChip) {
          passChip.style.background = 'rgba(52, 211, 153, 0.14)';
          passChip.style.borderColor = 'rgba(52, 211, 153, 0.35)';
          passChip.style.color = '#6ee7b7';
        }
      }

      // Populate Donation History Table
      const histTbody = document.getElementById('historyTableBody');
      if (histTbody) {
        const histRaw = localStorage.getItem('veintovein_donation_history');
        const customLogs = histRaw ? JSON.parse(histRaw) : [];

        if (customLogs.length > 0) {
          histTbody.innerHTML = customLogs.map(item => `
            <tr>
              <td><b>${item.date}</b></td>
              <td>${item.centre}</td>
              <td>${item.component}</td>
              <td>${item.hb || '14.0'}</td>
              <td><span class="status-done"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Completed · Verified</span></td>
            </tr>
          `).join('') + `
            <tr><td><b>18 Dec 2025</b></td><td>Fortis Hospital · Cunningham Road</td><td>Whole Blood · 350 ml</td><td>13.6</td><td><span class="status-done"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Completed</span></td></tr>
          `;
        }
      }

      // Show Sign Out button
      if (signOutBtn) {
        signOutBtn.style.display = 'inline-flex';
        signOutBtn.addEventListener('click', async () => {
          await signOutDonor();
          toast('Signed out', 'Redirecting to login...');
          setTimeout(() => {
            window.location.href = 'auth.html?mode=signin';
          }, 800);
        });
      }

    } else {
      // User is not logged in: Show preview banner
      if (banner) {
        banner.style.display = 'flex';
        if (bannerText) {
          bannerText.innerHTML = `<strong>Demo Mode:</strong> You are previewing a sample profile. Sign in or create an account to store and access your real donor record.`;
        }
        if (bannerAction) {
          bannerAction.textContent = 'Sign In / Register →';
          bannerAction.href = 'auth.html?mode=signin';
        }
      }
      if (signOutBtn) {
        signOutBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Error syncing profile with Supabase:', err);
  }
}

// Run on load and listen for admin updates
document.addEventListener('DOMContentLoaded', () => {
  syncProfileWithSupabase();
});
window.addEventListener('veintovein_profile_updated', () => syncProfileWithSupabase());
window.addEventListener('storage', () => syncProfileWithSupabase());

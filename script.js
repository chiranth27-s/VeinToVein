/* =========================================================
   VeinToVein — Interactive Engine
   ========================================================= */
'use strict';

/* ---------- NAV SCROLL + BACK TO TOP ---------- */
const nav = document.getElementById('nav');
const backTop = document.getElementById('backTop');
function onScroll () {
  nav.classList.toggle('scrolled', window.scrollY > 40);
  backTop.classList.toggle('show', window.scrollY > 420);
}
window.addEventListener('scroll', onScroll, { passive: true });
backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- HAMBURGER ---------- */
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
navToggle.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

/* ---------- TICKER DUPLICATE (seamless loop) ---------- */
const tickerInner = document.getElementById('tickerInner');
tickerInner.innerHTML += tickerInner.innerHTML;

/* ---------- TOAST SYSTEM ---------- */
const toastWrap = document.getElementById('toastWrap');
const toastIcons = {
  urgent:  '<path d="M12 2C9.5 8 5 11.5 5 16a7 7 0 0 0 14 0c0-4.5-4.5-8-7-14z"/>',
  success: '<path d="M20 6L9 17l-5-5"/>',
  info:    '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
};
function toast (title, msg, type = 'info') {
  while (toastWrap.children.length >= 3) toastWrap.removeChild(toastWrap.firstChild);
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.setAttribute('role', 'alert');
  el.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' +
      (type === 'success' ? '#34d399' : type === 'urgent' ? '#ff8f8f' : '#e9b44c') +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:.1rem">' + toastIcons[type] + '</svg>' +
    '<div class="toast-body"><p><b>' + title + '</b><br>' + msg + '</p><time>Just now · Push notification</time></div>' +
    '<button class="toast-close" aria-label="Dismiss"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
    '<div class="toast-bar"></div>';
  toastWrap.appendChild(el);
  const kill = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); };
  el.querySelector('.toast-close').addEventListener('click', kill);
  setTimeout(kill, 5400);
}

/* ---------- BELL / NOTIFICATIONS ---------- */
const bellBtn = document.getElementById('bellBtn');
const bellPanel = document.getElementById('bellPanel');
const bellBadge = document.getElementById('bellBadge');
const notifList = document.getElementById('notifList');
const markAllRead = document.getElementById('markAllRead');
let unread = 4;

function refreshBadge () {
  bellBadge.textContent = unread;
  bellBadge.style.display = unread > 0 ? 'flex' : 'none';
}
bellBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = bellPanel.classList.toggle('open');
  bellBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', e => { if (!bellPanel.contains(e.target)) bellPanel.classList.remove('open'); });
markAllRead.addEventListener('click', () => {
  notifList.querySelectorAll('.notif.unread').forEach(n => n.classList.remove('unread'));
  unread = 0; refreshBadge();
});
function pushNotification (title, detail) {
  const li = document.createElement('li');
  li.className = 'notif unread';
  li.innerHTML = '<span class="notif-dot"></span><div><p><b>' + title + '</b> ' + detail + '</p><time>Just now</time></div>';
  notifList.insertBefore(li, notifList.firstChild);
  while (notifList.children.length > 6) notifList.removeChild(notifList.lastChild);
  unread++; refreshBadge();
}
refreshBadge();

/* ---------- ANIMATED COUNTERS ---------- */
const counters = document.querySelectorAll('[data-count]');
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const useIndian = el.dataset.format === 'in';
    const duration = 1900, start = performance.now();
    function frame (now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(2, -8 * p);
      const value = target * (p === 1 ? 1 : eased);
      el.textContent = useIndian ? Math.round(value).toLocaleString('en-IN') : value.toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    counterIO.unobserve(el);
  });
}, { threshold: 0.6 });
counters.forEach(c => counterIO.observe(c));

/* ---------- LIVE CLOCK ---------- */
const liveClock = document.getElementById('liveClock');
function tickClock () {
  liveClock.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
setInterval(tickClock, 1000); tickClock();
document.getElementById('footerYear').textContent = new Date().getFullYear();

/* ---------- LIVE REQUEST FEED ---------- */
const requestGrid = document.getElementById('requestGrid');
const fulfilledEl = document.getElementById('fulfilledToday');
let fulfilledToday = 27;

const seedRequests = [
  { type:'O−',  hospital:'AIIMS Trauma Centre',       area:'New Delhi',   dist:'1.2 km', units:4, urgency:'critical', minAgo:4,  needed:4, enroute:2 },
  { type:'B+',  hospital:'Apollo Hospitals',          area:'Greams Road', dist:'3.4 km', units:2, urgency:'urgent',   minAgo:9,  needed:4, enroute:3 },
  { type:'AB−', hospital:'Fortis Escorts',            area:'Faridabad',   dist:'6.1 km', units:1, urgency:'critical', minAgo:12, needed:2, enroute:0 },
  { type:'A−',  hospital:'MIOT International',        area:'Chennai',     dist:'2.8 km', units:2, urgency:'stable',   minAgo:18, needed:3, enroute:2 },
  { type:'O+',  hospital:'Gleneagles Global',         area:'Perumbakkam', dist:'5.2 km', units:3, urgency:'urgent',   minAgo:22, needed:3, enroute:1 },
  { type:'B−',  hospital:'Sree Chitra Tirunal',       area:'Trivandrum',  dist:'7.9 km', units:1, urgency:'stable',   minAgo:31, needed:2, enroute:1 }
];
const spawnPool = [
  { type:'O−',  hospital:'Manipal Hospital',          area:'Old Airport Rd', dist:'8.3 km', units:3 },
  { type:'A+',  hospital:'Medanta — The Medicity',    area:'Gurugram',       dist:'9.1 km', units:2 },
  { type:'B+',  hospital:'Fortis Memorial',           area:'Sector 44',      dist:'4.7 km', units:1 },
  { type:'AB+', hospital:'Kokilaben Dhirubhai Ambani',area:'Mumbai',         dist:'11.6 km',units:2 },
  { type:'O+',  hospital:'Apollo Gleneagles',         area:'Kolkata',        dist:'12.4 km',units:4 },
  { type:'A−',  hospital:'Narayana Health City',      area:'Bengaluru',      dist:'6.8 km', units:2 }
];
const urgencies = ['critical', 'urgent', 'stable'];

function timeAgo (ts) {
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  return mins < 1 ? 'Just now' : mins + ' min ago';
}
function cardHTML (r, ts) {
  const pct = Math.min(100, Math.round((r.enroute / r.needed) * 100));
  const full = r.enroute >= r.needed;
  return '<article class="req-card ' + r.urgency + '" data-needed="' + r.needed + '" data-enroute="' + r.enroute + '" data-ts="' + ts + '">' +
    '<div class="req-top"><div class="type-badge">' + r.type + '</div>' +
      '<div class="req-meta"><h3>' + r.hospital + '</h3><p>' + r.area + ' · ' + r.dist + ' away</p></div>' +
      '<span class="urgency ' + r.urgency + '">' + r.urgency + '</span></div>' +
    '<div class="req-body"><span><b>' + r.units + ' unit' + (r.units > 1 ? 's' : '') + '</b> whole blood</span><span class="req-time">' + timeAgo(ts) + '</span></div>' +
    '<div class="req-progress"><div class="bar"><i style="width:' + pct + '%"></i></div><span class="enroute-label">' + r.enroute + '/' + r.needed + ' donors en route</span></div>' +
    '<button class="accept-btn' + (full ? ' done' : '') + '"' + (full ? ' disabled' : '') + '>' +
      (full ? 'Request Fulfilled' : 'Accept &amp; Navigate<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>') +
    '</button></article>';
}
function renderSeed () {
  requestGrid.innerHTML = seedRequests.map(r => cardHTML(r, Date.now() - r.minAgo * 60000)).join('');
}
renderSeed();

/* accept via delegation */
requestGrid.addEventListener('click', e => {
  const btn = e.target.closest('.accept-btn');
  if (!btn || btn.disabled) return;
  const card = btn.closest('.req-card');
  const needed = +card.dataset.needed;
  let enroute = +card.dataset.enroute + 1;
  card.dataset.enroute = enroute;
  const pct = Math.min(100, Math.round((enroute / needed) * 100));
  card.querySelector('.bar i').style.width = pct + '%';
  card.querySelector('.enroute-label').textContent = enroute + '/' + needed + ' donors en route';
  const hospital = card.querySelector('.req-meta h3').textContent;
  if (enroute >= needed) {
    card.querySelector('.enroute-label').textContent = 'Fulfilled — thank you';
    btn.classList.add('done'); btn.disabled = true; btn.textContent = 'Request Fulfilled';
    fulfilledToday++; fulfilledEl.textContent = fulfilledToday;
    toast('Requisition filled', hospital + ' confirmed. You will receive your impact certificate shortly.', 'success');
  } else {
    btn.classList.add('done'); btn.disabled = true;
    btn.innerHTML = 'On the way<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    toast('Response recorded', hospital + ' has been notified. Your QR e-pass is ready — proceed to the blood bank desk.', 'success');
  }
});

/* refresh visible timestamps */
setInterval(() => {
  requestGrid.querySelectorAll('.req-card').forEach(card => {
    const t = card.querySelector('.req-time');
    if (t && card.dataset.ts) t.textContent = timeAgo(+card.dataset.ts);
  });
}, 20000);

/* simulated live pushes */
function spawnRequest () {
  const base = spawnPool[Math.floor(Math.random() * spawnPool.length)];
  const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
  const enroute = Math.floor(Math.random() * 2);
  const needed = base.units + 1 + Math.floor(Math.random() * 2);
  const cardData = { ...base, urgency, needed, enroute };
  const wrapper = document.createElement('div');
  wrapper.innerHTML = cardHTML(cardData, Date.now());
  const card = wrapper.firstElementChild;
  card.classList.add('card-in');
  requestGrid.insertBefore(card, requestGrid.firstChild);
  while (requestGrid.children.length > 6) requestGrid.removeChild(requestGrid.lastChild);
  const label = urgency === 'critical' ? 'URGENT' : 'New requisition';
  toast(label + ' · ' + base.type, base.hospital + ' · ' + base.area + ' · ' + base.dist + ' away', urgency === 'critical' ? 'urgent' : 'info');
  pushNotification(base.type + ' · ' + urgency.toUpperCase(), 'at ' + base.hospital + ' · ' + base.dist + ' away');
}
setTimeout(spawnRequest, 4200);
setInterval(spawnRequest, 9500);

/* ---------- COMPATIBILITY MATRIX ---------- */
const TYPES = ['O−','O+','A−','A+','B−','B+','AB−','AB+'];
const DONATE_TO = {
  'O−':['O−','O+','A−','A+','B−','B+','AB−','AB+'],
  'O+':['O+','A+','B+','AB+'],
  'A−':['A−','A+','AB−','AB+'],
  'A+':['A+','AB+'],
  'B−':['B−','B+','AB−','AB+'],
  'B+':['B+','AB+'],
  'AB−':['AB−','AB+'],
  'AB+':['AB+']
};
const RECEIVE_FROM = {};
TYPES.forEach(t => { RECEIVE_FROM[t] = TYPES.filter(d => DONATE_TO[d].includes(t)); });
const TYPE_NOTES = {
  'O−':'O− red cells carry no A, B or RhD antigens — they can be transfused into any ABO/Rh patient in an emergency.',
  'O+':'O+ is the most common type in India (~37%). Needed constantly for trauma and maternal emergency care.',
  'A−':'A− is rare and highly valuable — one A− donation can serve A−, A+, AB− and AB+ recipients.',
  'A+':'A+ can be given to A+ and AB+ patients. Roughly 1 in 4 donors in India is A+.',
  'B−':'B− is rare; demand spikes for complex cardiac and orthopaedic surgeries.',
  'B+':'B+ is the second most common type in India — its steady supply saves thousands of thalassaemia patients monthly.',
  'AB−':'AB− is the rarest Rh-negative type. Your platelets and plasma are universal gifts.',
  'AB+':'AB+ carries every antigen — you can receive red cells from all 8 groups. Plasma donation is your superpower.'
};
const TYPE_TAGS = { 'O−':'Universal Donor', 'AB+':'Universal Recipient' };
let selectedType = 'O−';

const typeGrid = document.getElementById('typeGrid');
const compatBig = document.getElementById('compatBig');
const compatTag = document.getElementById('compatTag');
const compatNote = document.getElementById('compatNote');
const donateToChips = document.getElementById('donateToChips');
const receiveFromChips = document.getElementById('receiveFromChips');

typeGrid.innerHTML = TYPES.map(t => '<button class="type-btn" data-type="' + t + '" aria-pressed="false">' + t + '</button>').join('');
const typeButtons = Array.from(typeGrid.querySelectorAll('.type-btn'));

function renderCompat (sel) {
  selectedType = sel;
  compatBig.textContent = sel;
  compatNote.textContent = TYPE_NOTES[sel];
  compatTag.textContent = TYPE_TAGS[sel] || 'Standard Match';
  compatTag.style.visibility = TYPE_TAGS[sel] ? 'visible' : 'hidden';
  const d = DONATE_TO[sel], r = RECEIVE_FROM[sel];
  donateToChips.innerHTML = TYPES.map(t => '<span class="chip' + (d.includes(t) ? ' on' : '') + '">' + t + '</span>').join('');
  receiveFromChips.innerHTML = TYPES.map(t => '<span class="chip' + (r.includes(t) ? ' on' : '') + '">' + t + '</span>').join('');
  typeButtons.forEach(b => {
    const active = b.dataset.type === sel;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}
typeGrid.addEventListener('click', e => {
  const btn = e.target.closest('.type-btn');
  if (btn) renderCompat(btn.dataset.type);
});
renderCompat('O−');

/* ---------- ELIGIBILITY CHECKER ---------- */
const eligForm = document.getElementById('eligForm');
const elResult = document.getElementById('elResult');
const resIdle = document.getElementById('resIdle');
const resOk = document.getElementById('resOk');
const resWait = document.getElementById('resWait');
const elReasons = document.getElementById('elReasons');
const elNextDate = document.getElementById('elNextDate');
const elNextWrap = document.getElementById('elNextWrap');

eligForm.addEventListener('submit', e => {
  e.preventDefault();
  const age = parseFloat(document.getElementById('elAge').value);
  const weight = parseFloat(document.getElementById('elWeight').value);
  const lastRaw = document.getElementById('elLast').value;
  const hb = document.getElementById('elHb').value;
  const well = eligForm.querySelector('input[name="well"]:checked').value;
  const deferral = eligForm.querySelector('input[name="deferral"]:checked').value;

  const reasons = [];
  if (!age || age < 18 || age > 65) reasons.push('Age must be between 18 and 65 years.');
  if (!weight || weight < 45) reasons.push('Weight must be at least 45 kg to donate safely.');
  if (well === 'no') reasons.push('You must be symptom-free on donation day.');
  if (hb === 'no') reasons.push('Hemoglobin must be ≥ 12.5 g/dL — please retest at a camp.');
  if (deferral === 'yes') reasons.push('Tattoos, piercings or major surgery require a 6-month deferral.');

  let nextDate = null;
  if (lastRaw !== 'never') {
    const days = parseInt(lastRaw, 10);
    if (days < 90) {
      const waitDays = 90 - days;
      nextDate = new Date(Date.now() + waitDays * 86400000);
      reasons.push('Whole blood requires a 90-day gap between donations.');
    }
  }

  resIdle.hidden = true;
  if (reasons.length === 0) {
    resOk.hidden = false; resWait.hidden = true;
    elResult.classList.add('state-ok'); elResult.classList.remove('state-wait');
    toast('Eligibility verified', 'Your Eligibility Passport is valid. Nearby requisitions matching your type will reach you first.', 'success');
  } else {
    resWait.hidden = false; resOk.hidden = true;
    elResult.classList.add('state-wait'); elResult.classList.remove('state-ok');
    elReasons.innerHTML = reasons.map(r => '<li>' + r + '</li>').join('');
    if (nextDate) {
      elNextWrap.style.display = 'inline-flex';
      elNextDate.textContent = 'Next eligible: ' + nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      elNextWrap.style.display = 'none';
    }
    toast('Not eligible yet', 'See the deferral notes — most windows clear within days or weeks.', 'info');
  }
});

/* ---------- DASHBOARD TABS ---------- */
const dashTabs = document.querySelectorAll('.dash-tab');
dashTabs.forEach(tab => tab.addEventListener('click', () => {
  dashTabs.forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.toggle('active', p.id === tab.dataset.tab));
}));

/* copy donor ID */
const copyDonorId = document.getElementById('copyDonorId');
copyDonorId?.addEventListener('click', async () => {
  const id = 'VT-IN-2024-04817';
  try { await navigator.clipboard.writeText(id); }
  catch (err) {
    const ta = document.createElement('textarea');
    ta.value = id; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }
  toast('Copied', 'Donor ID ' + id + ' copied to clipboard.', 'info');
});
document.getElementById('historyCertBtn')?.addEventListener('click', () => {
  toast('Certificate queued', 'Impact-Certificate-VT-04817.pdf is being generated and will download shortly.', 'info');
});

/* ---------- HOSPITAL REQUISITION FORM ---------- */
const reqForm = document.getElementById('reqForm');
const reqFormWrap = document.getElementById('reqFormWrap');
const reqSuccess = document.getElementById('reqSuccess');
const reqIdOut = document.getElementById('reqIdOut');
const reqSuccessDetail = document.getElementById('reqSuccessDetail');
const reqAgain = document.getElementById('reqAgain');

reqForm.addEventListener('submit', e => {
  e.preventDefault();
  const hospital = document.getElementById('reqHospital');
  if (!hospital.value.trim()) {
    hospital.focus();
    toast('Missing detail', 'Please name the hospital or blood bank posting this requisition.', 'urgent');
    return;
  }
  const type = document.getElementById('reqType').value;
  const units = document.getElementById('reqUnits').value || '1';
  const urgency = document.getElementById('reqUrgency').value.split(' — ')[0];
  const id = 'VT-' + Math.floor(1000 + Math.random() * 9000);
  const reach = 140 + Math.floor(Math.random() * 130);
  reqIdOut.textContent = id;
  reqSuccessDetail.textContent = reach + ' eligible ' + type + ' donors within 10 km were notified just now (' + urgency + ' priority).';
  reqFormWrap.style.display = 'none';
  reqSuccess.classList.add('show');
  toast('Requisition broadcast', units + ' unit(s) of ' + type + ' · ' + reach + ' donors pinged. Live tracking enabled.', 'success');
  pushNotification('Requisition ' + id, 'broadcast: ' + units + 'u ' + type + ' · ' + urgency);
});
reqAgain.addEventListener('click', () => {
  reqSuccess.classList.remove('show');
  reqFormWrap.style.display = 'block';
  reqForm.reset();
});

/* ---------- TESTIMONIAL CAROUSEL ---------- */
const tTrack = document.getElementById('tTrack');
const slides = tTrack.children.length;
const tDots = document.getElementById('tDots');
let tIndex = 0, tTimer = null;
tDots.innerHTML = Array.from({ length: slides }, (_, i) => '<button class="t-dot' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" aria-label="Story ' + (i + 1) + '"></button>').join('');
const dots = Array.from(tDots.children);
function goTo (i) {
  tIndex = (i + slides) % slides;
  tTrack.style.transform = 'translateX(-' + tIndex * 100 + '%)';
  dots.forEach((d, j) => d.classList.toggle('active', j === tIndex));
}
function restartAuto () { clearInterval(tTimer); tTimer = setInterval(() => goTo(tIndex + 1), 6500); }
document.getElementById('tPrev').addEventListener('click', () => { goTo(tIndex - 1); restartAuto(); });
document.getElementById('tNext').addEventListener('click', () => { goTo(tIndex + 1); restartAuto(); });
tDots.addEventListener('click', e => { const d = e.target.closest('.t-dot'); if (d) { goTo(+d.dataset.i); restartAuto(); } });
restartAuto();

/* ---------- FAQ ACCORDION ---------- */
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-q');
  const panel = item.querySelector('.faq-a');
  if (item.classList.contains('open')) panel.style.maxHeight = panel.scrollHeight + 'px';
  btn.addEventListener('click', () => {
    const open = item.classList.toggle('open');
    panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
    btn.setAttribute('aria-expanded', String(open));
  });
});

/* ---------- NEWSLETTER ---------- */
const nlForm = document.getElementById('nlForm');
const nlEmail = document.getElementById('nlEmail');
const nlMsg = document.getElementById('nlMsg');
nlForm.addEventListener('submit', e => {
  e.preventDefault();
  const value = nlEmail.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    nlMsg.textContent = 'Please enter a valid email address.';
    nlMsg.style.color = '#ffd0d0';
    return;
  }
  nlMsg.textContent = 'Welcome aboard — check your inbox Sunday, 7 AM.';
  nlMsg.style.color = '#ffe9a8';
  nlForm.querySelector('button[type=submit]').textContent = 'Subscribed';
  nlEmail.value = ''; nlEmail.disabled = true;
  toast('Lifeline subscribed', value + ' will receive the next Weekly Lifeline.', 'success');
});

/* ---------- REGISTRATION MODAL ---------- */
const modal = document.getElementById('registerModal');
const registerForm = document.getElementById('registerForm');
const regSuccess = document.getElementById('regSuccess');
const regName = document.getElementById('regName');
let lastFocus = null;

function openModal () {
  lastFocus = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = modal.querySelector('#regName');
  if (first) setTimeout(() => first.focus(), 60);
}
function closeModal () {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}
document.querySelectorAll('[data-open-modal]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); mobileMenu.classList.remove('open'); openModal(); }));
document.getElementById('closeModal')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal(); });

/* fake QR generator */
function renderQR () {
  const grid = document.getElementById('qrGrid');
  let html = '';
  const finder = (r, c) => (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      html += finder(r, c) ? '<i class="finder"></i>' : '<i class="' + (Math.random() > 0.52 ? 'on' : '') + '"></i>';
    }
  }
  grid.innerHTML = html;
}

registerForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = regName.value.trim();
  const phone = document.getElementById('regPhone');
  const group = document.getElementById('regGroup');
  const city = document.getElementById('regCity');
  const consent = document.getElementById('regConsent');
  if (!name) { regName.focus(); return; }
  if (!/[0-9+\s-]{10,16}/.test(phone.value.trim())) { phone.focus(); toast('Check phone', 'Enter a valid mobile number with country code.', 'urgent'); return; }
  if (!group.value) { group.focus(); toast('Blood group needed', 'Select your group, or choose "Don’t know" — we will test you free at the next camp.', 'urgent'); return; }
  if (!city.value.trim()) { city.focus(); return; }
  if (!consent.checked) { toast('Consent required', 'We need your DPDP consent to store encrypted medical data.', 'urgent'); return; }

  document.getElementById('donorIdOut').textContent = 'VT-IN-2025-' + String(Math.floor(10000 + Math.random() * 90000));
  renderQR();
  registerForm.style.display = 'none';
  regSuccess.classList.add('show');
  toast('Profile secured', 'Welcome, ' + name.split(' ')[0] + '. Your donor profile is encrypted and active.', 'success');
  pushNotification('Welcome aboard', 'your donor profile is live and encrypted.');
});
document.getElementById('goDashboard')?.addEventListener('click', () => {
  window.location.href = 'profile.html';
});

/* =========================================================
   THREE.JS — Floating Red Blood Cells (hero canvas)
   ========================================================= */
(function initCells () {
  const canvas = document.getElementById('cellCanvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const hero = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  scene.add(new THREE.AmbientLight(0xffe0d6, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(5, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0xe5383b, 1.5, 60); rim.position.set(-6, -4, 6); scene.add(rim);
  const gold = new THREE.PointLight(0xe9b44c, 0.9, 50); gold.position.set(6, 5, -4); scene.add(gold);

  const group = new THREE.Group();
  scene.add(group);

  const cellGeo = new THREE.SphereGeometry(1, 28, 20);
  cellGeo.scale(1, 1, 0.38); /* biconcave-ish disc */
  const cellMat = new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.32, metalness: 0.12, emissive: 0x3d0206 });
  const cellMat2 = new THREE.MeshStandardMaterial({ color: 0xe5383b, roughness: 0.28, metalness: 0.1, emissive: 0x4a0308 });

  const cells = [];
  for (let i = 0; i < 46; i++) {
    const mesh = new THREE.Mesh(cellGeo, Math.random() > 0.5 ? cellMat : cellMat2);
    mesh.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 9.5, (Math.random() - 0.5) * 9);
    const s = 0.35 + Math.random() * 0.55;
    mesh.scale.setScalar(s);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.userData = { phase: Math.random() * Math.PI * 2, speed: 0.35 + Math.random() * 0.5, amp: 0.35 + Math.random() * 0.5, spin: (Math.random() - 0.5) * 0.012 };
    group.add(mesh);
    cells.push(mesh);
  }

  /* golden plasma specks */
  const speckGeo = new THREE.BufferGeometry();
  const speckCount = 130, positions = new Float32Array(speckCount * 3);
  for (let i = 0; i < speckCount * 3; i++) positions[i] = (Math.random() - 0.5) * 16;
  speckGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const specks = new THREE.Points(speckGeo, new THREE.PointsMaterial({ color: 0xe9b44c, size: 0.07, transparent: true, opacity: 0.85 }));
  scene.add(specks);

  function resize () {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = 0, mouseY = 0;
  hero.addEventListener('pointermove', e => {
    const rect = hero.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 1.6;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 1.2;
  });

  const clock = new THREE.Clock();
  function animate () {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    cells.forEach(c => {
      c.position.y += Math.sin(t * c.userData.speed + c.userData.phase) * 0.0022 * c.userData.amp;
      c.rotation.x += c.userData.spin;
      c.rotation.y += c.userData.spin * 0.7;
    });
    group.rotation.y += (mouseX * 0.14 - group.rotation.y) * 0.04;
    group.rotation.x += (mouseY * 0.1 - group.rotation.x) * 0.04;
    specks.rotation.y = t * 0.02;
    renderer.render(scene, camera);
  }
  animate();
})();

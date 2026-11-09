const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const initialDonors = [
  {name:"Meera Nair",blood:"O+",area:"Indiranagar",distance:"2.1 km",available:true,donations:3},
  {name:"Rohan Kumar",blood:"B+",area:"Koramangala",distance:"3.4 km",available:true,donations:2},
  {name:"Ananya Rao",blood:"A-",area:"Jayanagar",distance:"4.8 km",available:false,donations:1},
  {name:"Kabir Shah",blood:"AB+",area:"Whitefield",distance:"6.2 km",available:true,donations:4},
  {name:"Diya Menon",blood:"O-",area:"Malleshwaram",distance:"5.1 km",available:true,donations:2},
  {name:"Ishaan Das",blood:"B-",area:"HSR Layout",distance:"3.9 km",available:false,donations:1}
];
const initialRequests = [
  {hospital:"City Care Hospital",blood:"O+",units:3,area:"Indiranagar",priority:"Critical",time:"12 min ago"},
  {hospital:"St. Martha's Medical Centre",blood:"B+",units:2,area:"Vasanth Nagar",priority:"Urgent",time:"34 min ago"},
  {hospital:"Greenlife Hospital",blood:"A-",units:1,area:"Jayanagar",priority:"Urgent",time:"1 hr ago"}
];
let donors = JSON.parse(localStorage.getItem("vtv_donors") || "null") || initialDonors;
let requests = JSON.parse(localStorage.getItem("vtv_requests") || "null") || initialRequests;
let notices = JSON.parse(localStorage.getItem("vtv_notices") || "null") || [
  {title:"New O+ blood request nearby",body:"City Care Hospital needs 3 units in Indiranagar.",time:"12 minutes ago"},
  {title:"Welcome to VeinToVein",body:"Complete your donor profile to help your local community.",time:"Yesterday"}
];
let profile = JSON.parse(localStorage.getItem("vtv_profile") || "null") || {name:"Aarav Sharma",blood:"O+",age:"22",city:"Bengaluru, Karnataka",phone:"",available:true,last:"12 Aug 2026"};
let history = JSON.parse(localStorage.getItem("vtv_history") || "null") || [{place:"Bengaluru Blood Centre",date:"12 Aug 2026",units:"1 unit"},{place:"Community Blood Drive",date:"04 Feb 2026",units:"1 unit"}];
let activePriority = "All";
const save = () => {
  localStorage.setItem("vtv_donors",JSON.stringify(donors));
  localStorage.setItem("vtv_requests",JSON.stringify(requests));
  localStorage.setItem("vtv_notices",JSON.stringify(notices));
  localStorage.setItem("vtv_profile",JSON.stringify(profile));
  localStorage.setItem("vtv_history",JSON.stringify(history));
};
const initials = name => name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
const toast = msg => {const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2600)};
function showView(id){
  $$(".page-view").forEach(v=>v.classList.toggle("active",v.id===id));
  $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.view===id));
  $("#pageName").textContent=({overview:"Overview","find-donors":"Find donors","urgent-requests":"Blood requests","my-profile":"My donor profile",notifications:"Notifications",eligibility:"Eligibility guide"})[id]||"Overview";
  $("#sidebar").classList.remove("open"); window.location.hash=id;
  if(id==="notifications") renderNotifications();
}
$$("[data-view]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();showView(el.dataset.view)}));
function requestCard(r,action=false){return `<div class="request-item"><div class="request-blood">${r.blood}</div><div class="request-info"><strong>${escapeHTML(r.hospital)}</strong><small>${r.units} unit(s) needed · ${escapeHTML(r.area)}</small></div><div class="request-meta"><span class="priority ${r.priority}">${r.priority}</span><small>${r.time||"Just now"}</small></div>${action?'<button class="request-action" data-respond="'+requests.indexOf(r)+'">Respond</button>':""}</div>`}
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderRequests(){
  $("#overviewRequests").innerHTML=requests.slice(0,3).map(r=>requestCard(r)).join("")||'<div class="empty-state">No requests yet.</div>';
  $("#allRequests").innerHTML=requests.filter(r=>activePriority==="All"||r.priority===activePriority).map(r=>requestCard(r,true)).join("")||'<div class="empty-state">No requests in this category.</div>';
  $("#requestCount").textContent=requests.length;
  $("#urgentStat").textContent=String(requests.length).padStart(2,"0");
}
function renderDonors(){
  const blood=$("#bloodFilter").value, area=$("#areaFilter").value.toLowerCase(), avail=$("#availabilityFilter").value;
  const list=donors.filter(d=>(blood==="All"||d.blood===blood)&&(!area||d.area.toLowerCase().includes(area))&&(avail==="All"||(avail==="Available"?d.available:!d.available)));
  $("#resultCount").textContent=list.length;
  $("#donorGrid").innerHTML=list.map(d=>`<article class="donor-card"><div class="donor-card-top"><div class="donor-avatar">${initials(d.name)}</div><div><strong>${escapeHTML(d.name)}</strong><small>${escapeHTML(d.area)} · ${d.distance||"Local"}</small></div><div class="donor-group">${d.blood}</div></div><p>${d.available?'<span style="color:#2d9868">● Available status</span>':'<span style="color:#aaa">● Not currently available</span>'}</p><p>${d.donations||0} demo donation(s) recorded</p><button class="outline-btn" data-contact="${escapeHTML(d.name)}">Request contact</button></article>`).join("")||'<div class="empty-state">No donors match these filters. Try another blood group or area.</div>';
}
function renderHistory(){$("#historyList").innerHTML=history.map(h=>`<div class="history-item"><div class="history-icon">♥</div><div><strong>${escapeHTML(h.place)}</strong><small>${escapeHTML(h.date)} · ${escapeHTML(h.units)}</small></div></div>`).join("")}
function renderNotifications(){$("#notificationList").innerHTML=notices.map(n=>`<div class="notification-row"><div class="notification-icon">♡</div><div><strong>${escapeHTML(n.title)}</strong><p>${escapeHTML(n.body)}</p><small>${escapeHTML(n.time)}</small></div></div>`).join("")||'<div class="empty-state">You are all caught up.</div>'}
function renderProfile(){
  const name=profile.name||"Donor";
  $("#welcomeName").textContent=name.split(" ")[0];$("#sideUserName").textContent=name;$("#profileName").textContent=name;$("#fullName").textContent=name;
  $("#topAvatar").textContent=initials(name);$("#largeAvatar").textContent=initials(name);$(".avatar").textContent=initials(name);
  $("#profileBlood").textContent=profile.blood.replace("+"," Positive").replace("-"," Negative");$(".blood-type").innerHTML=profile.blood.replace(/([+-])$/,"<sup>$1</sup>");
  $("#detailBlood").textContent=profile.blood;$("#detailAge").textContent=(profile.age||"—")+" years";$("#detailLast").textContent=profile.last||"Not added";$("#detailPhone").textContent=profile.phone||"Not shared";$("#profileCity").textContent=profile.city||"Location not added";
  $("#availableToggle").checked=!!profile.available;$("#availabilityText").textContent=profile.available?"Available to donate":"Not currently available";
  const complete=[profile.name,profile.blood,profile.age,profile.city].filter(Boolean).length*25;$("#completionText").textContent=complete+"%";$("#completionBar").style.width=complete+"%";
  $("#donationStat").textContent=String(history.length).padStart(2,"0");
}
function addNotice(title,body){notices.unshift({title,body,time:"Just now"});save();renderNotifications()}
$$("[data-open-modal]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.openModal).classList.add("show")));
$$("[data-close-modal]").forEach(b=>b.addEventListener("click",()=>b.closest(".modal-backdrop").classList.remove("show")));
$$(".modal-backdrop").forEach(b=>b.addEventListener("click",e=>{if(e.target===b)b.classList.remove("show")}));
$("#requestForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.target);const r={hospital:f.get("hospital"),blood:f.get("blood"),units:Number(f.get("units")),area:f.get("area"),priority:f.get("priority"),time:"Just now"};
  requests.unshift(r);save();renderRequests();addNotice("New demo blood request",`${r.hospital} needs ${r.units} unit(s) of ${r.blood} in ${r.area}.`);
  $("#requestModal").classList.remove("show");e.target.reset();toast("Demo blood request published.");
});
$("#editProfileBtn").addEventListener("click",()=>{const f=$("#profileForm");Object.entries(profile).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v});$("#profileModal").classList.add("show")});
$("#profileForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.target);profile={...profile,name:f.get("name"),blood:f.get("blood"),age:f.get("age"),city:f.get("city"),phone:f.get("phone")};save();renderProfile();$("#profileModal").classList.remove("show");toast("Profile updated on this device.")});
$("#availableToggle").addEventListener("change",e=>{profile.available=e.target.checked;save();renderProfile();toast("Demo availability status updated.")});
$("#addHistoryBtn").addEventListener("click",()=>{const place=prompt("Enter blood bank / donation drive name (demo):");if(!place)return;const date=prompt("Enter donation date (e.g. 09 Nov 2026):","09 Nov 2026");if(!date)return;history.unshift({place,date,units:"1 unit (demo)"});save();renderHistory();renderProfile();toast("Demo history entry added.")});
$("#searchBtn").addEventListener("click",renderDonors);
["bloodFilter","availabilityFilter"].forEach(id=>$("#"+id).addEventListener("change",renderDonors));
$("#areaFilter").addEventListener("keydown",e=>{if(e.key==="Enter")renderDonors()});
$$("[data-priority]").forEach(b=>b.addEventListener("click",()=>{activePriority=b.dataset.priority;$$("[data-priority]").forEach(x=>x.classList.toggle("active",x===b));renderRequests()}));
document.addEventListener("click",e=>{
  const contact=e.target.closest("[data-contact]");if(contact){toast("Demo only: contact details are protected. No message was sent.");return}
  const respond=e.target.closest("[data-respond]");if(respond){toast("Demo response recorded. A real app needs hospital verification and secure messaging.");addNotice("Response recorded (demo)","Your interest was recorded locally. No hospital was contacted.")}
});
$("#notificationBell").addEventListener("click",()=>showView("notifications"));
$("#clearNotifications").addEventListener("click",()=>{notices=[];save();renderNotifications();toast("Notifications cleared.")});
$("#enablePushBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){toast("This browser does not support notifications.");return}
  const permission=await Notification.requestPermission();
  if(permission==="granted"){new Notification("VeinToVein alerts enabled",{body:"You can receive demo alerts while this page is open."});toast("Browser notifications enabled.")}
  else toast("Notification permission was not granted.");
});
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
function init(){
  renderProfile();renderRequests();renderDonors();renderHistory();renderNotifications();
  const route=location.hash.replace("#","");if(route&&$("#"+route))showView(route);
}
init();
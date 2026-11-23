import './styles.css';
import { supabase, isConfigured } from './supabase.js';
import { logoMark } from './brand.js';
import { enhanceSelects } from './ui-select.js';
import { renderHomePage } from './home-page.js';

const app = document.querySelector('#app');
const path = location.pathname;
const isAdminPage = path.includes('/admin/');
const page = path.split('/').pop().replace('.html','') || 'index';
const money = n => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(Number(n||0));
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function formatEventDate(value){
  if(!value) return 'Date not specified';

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatEventTime(value){
  if(!value) return 'Time not specified';

  const [hours, minutes] = value.split(':');

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
const notify = (msg, bad=false) => { const el=document.querySelector('#notice'); if(el){el.textContent=msg;el.className='notice '+(bad?'bad':'good');} };

const ICONS = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  box:'<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 13v5m-2.5-2.5h5"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 9h8M8 13h6M8 17h4"/>',
  bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  userPlus:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6m-3-3h6"/>',
  gauge:'<path d="M4 19a8 8 0 1 1 16 0M12 11l4-4M5 19h14"/>',
  x:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  gift:'<path d="M3 10h18v11H3zM2 7h20v3H2zM12 7v14M12 7H8a2 2 0 1 1 2-4c2 0 2 4 2 4Zm0 0h4a2 2 0 1 0-2-4c-2 0-2 4-2 4Z"/>',
  fork:'<path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3M7 10v11M17 3v18M17 3c4 2 4 6 0 8"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.4-2.8 2.8-1.4-1.4-.1-.1a7.7 7.7 0 0 1-2 .8V21h-4v-2.4a7.7 7.7 0 0 1-2-.8l-.1.1-1.4 1.4-2.8-2.8 1.4-1.4.1-.1a7.7 7.7 0 0 1-.8-2H3v-4h2.4a7.7 7.7 0 0 1 .8-2l-.1-.1-1.4-1.4 2.8-2.8 1.4 1.4.1.1a7.7 7.7 0 0 1 2-.8V3h4v2.4a7.7 7.7 0 0 1 2 .8l.1-.1 1.4-1.4 2.8 2.8-1.4 1.4-.1.1a7.7 7.7 0 0 1 .8 2H21v4h-2.4a7.7 7.7 0 0 1-.8 2Z"/>',
  signIn:'<path d="M14 8V4H4v16h10v-4M10 12h11m-4-4 4 4-4 4"/>',
  signOut:'<path d="M10 4H4v16h6m5-12 4 4-4 4m4-4H8"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  collapse:'<path d="M4 5h16v14H4zM9 5v14m4-9 2 2-2 2"/>'
};
const icon = name => `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${ICONS[name] || ''}</svg></span>`;
const navLink = (href, key, label, name, extra='') => `<a href="${href}" class="sidebar-link ${extra}" data-page="${key}" title="${label}" aria-label="${label}">${icon(name)}<span class="label">${label}</span></a>`;

function sidebarSections(user, admin) {
  const customer = `<div class="sidebar-section"><div class="sidebar-section-title">Customer</div>${navLink('/index.html','index','Home','home')}${navLink('/packages.html','packages','Packages','box')}${navLink('/booking.html','booking','Book an Event','calendar','navcta-link')}${navLink('/track-booking.html','track-booking','Track Booking','search')}</div>`;
  const account = user ? `<div class="sidebar-section"><div class="sidebar-section-title">Account</div>${navLink('/my-bookings.html','my-bookings','My Bookings','clipboard')}${navLink('/notifications.html','notifications','Notifications','bell','notification-nav-link')}<span id="notificationNavBadge" class="notification-badge" hidden>0</span>${navLink('/account.html','account','My Account','user')}</div>` : `<div class="sidebar-section"><div class="sidebar-section-title">Account</div>${navLink('/login.html','login','Sign In','signIn')}${navLink('/register.html','register','Create Account','userPlus')}</div>`;
  if(!admin) return customer + account;
  return customer + account + `<div class="sidebar-section"><div class="sidebar-section-title">Operations</div>${navLink('/admin/dashboard.html','dashboard','Dashboard','gauge')}${navLink('/admin/bookings.html','bookings','Bookings','clipboard')}${navLink('/admin/cancellation-requests.html','cancellation-requests','Cancellations','x')}</div><div class="sidebar-section"><div class="sidebar-section-title">Catalog</div>${navLink('/admin/packages.html','packages','Packages','gift')}${navLink('/admin/food-management.html','food-management','Food Menu','fork')}</div><div class="sidebar-section"><div class="sidebar-section-title">Insights</div>${navLink('/admin/reports.html','reports','Reports','chart')}</div><div class="sidebar-section"><div class="sidebar-section-title">System</div>${navLink('/admin/settings.html','settings','Settings','gear')}</div>`;
}

function renderFrame(content, { admin = false, user = null } = {}) {
  const currentPage = path.split('/').pop().replace('.html','') || (admin ? 'dashboard' : 'index');
  const label = user?.full_name || (admin ? 'Administrator' : 'Guest');
  app.innerHTML = `<button class="sidebar-toggle" id="sidebarToggle" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button><div class="sidebar-scrim" id="sidebarScrim" hidden></div><div class="app-shell" id="appShell"><aside class="sidebar" id="sidebar"><a class="brand" href="${admin ? '/admin/dashboard.html' : '/index.html'}"><span class="brandmark" aria-hidden="true">${logoMark(40)}</span><span class="brandtext"><strong>JMFoodies</strong><small>${admin ? 'Admin' : 'Catering'}</small></span><button class="sidebar-collapse" id="sidebarCollapse" aria-label="Collapse sidebar" aria-expanded="true" type="button">${icon('collapse')}</button></a><div class="sidebar-body">${sidebarSections(user, admin)}</div><div class="sidebar-footer"><div class="sidebar-user"><span class="sidebar-avatar">${esc(label.slice(0,1).toUpperCase())}</span><span class="sidebar-user-text"><strong class="sidebar-user-name">${esc(label)}</strong><small class="sidebar-user-role">${admin ? 'Administrator' : user ? 'Customer' : 'Visitor'}</small></span></div><button class="sidebar-signout" id="${admin ? 'logout' : 'customerLogout'}" title="${user ? 'Sign out' : 'Sign in'}" aria-label="${user ? 'Sign out' : 'Sign in'}" type="button">${icon(user ? 'signOut' : 'signIn')}<span class="label">${user ? 'Sign out' : 'Sign in'}</span></button></div></aside><div class="main-with-sidebar"><header class="topbar"><div class="topbar-left">${icon('gauge')}<span class="topbar-title">${esc(currentPage.replaceAll('-',' '))}</span></div><div class="topbar-right">JMFoodies · ${admin ? 'Administration' : 'Catering'}</div></header><main class="shellmain${admin ? ' adminmain' : ''}">${content}</main><footer>JMFoodies Catering · Thoughtfully prepared for your celebrations</footer><div id="notice" class="notice"></div></div></div>`;
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => { if(link.dataset.page === currentPage) link.classList.add('active'); });
  document.querySelectorAll('select').forEach(select => enhanceSelects(select.parentElement || document));
  const shellEl = document.querySelector('#appShell'), sidebar = document.querySelector('#sidebar'), scrim = document.querySelector('#sidebarScrim'), mobile = document.querySelector('#sidebarToggle');
  const setMobile = open => { sidebar?.classList.toggle('open', open); mobile?.setAttribute('aria-expanded', String(open)); if(scrim) scrim.hidden = !open; };
  mobile?.addEventListener('click', () => setMobile(!sidebar?.classList.contains('open'))); scrim?.addEventListener('click', () => setMobile(false)); document.addEventListener('keydown', e => { if(e.key === 'Escape') setMobile(false); });
  const collapse = document.querySelector('#sidebarCollapse'); const collapsed = localStorage.getItem('jm.sidebarCollapsed') === '1'; shellEl?.classList.toggle('is-collapsed', collapsed); collapse?.setAttribute('aria-expanded', String(!collapsed)); collapse?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const next = !shellEl.classList.contains('is-collapsed'); shellEl.classList.toggle('is-collapsed', next); localStorage.setItem('jm.sidebarCollapsed', next ? '1' : '0'); collapse.setAttribute('aria-expanded', String(!next)); });
  const logout = document.querySelector('#logout, #customerLogout'); logout?.addEventListener('click', async () => { if(!user) { location.href='/login.html'; return; } const { error } = await supabase.auth.signOut(); if(error) return notify(error.message, true); location.href=admin?'/login.html':'/index.html'; });
}

const shell = async content => {
  const user = await getUser();
  renderFrame(content, { user, admin: false });

  // Live customer notification counter
  if(user?.role === 'customer'){
    const badges = [document.querySelector('#notificationNavBadge')].filter(Boolean);
    async function updateNotificationBadge(){
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if(error){ console.error('Could not load notification count:', error.message); return; }
      badges.forEach(badge => {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = !count;
      });
    }
    updateNotificationBadge();
    supabase
      .channel('customer-notifications-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + user.id }, () => updateNotificationBadge())
      .subscribe();
  }
};

const adminShell = content => renderFrame(content, { admin: true, user: { full_name: 'Admin' , role: 'admin' } });

const needDb = () => { if(!isConfigured){shell(`<section class="hero"><p class="eyebrow">SETUP REQUIRED</p><h1>Connect your Supabase project</h1><p>Add your project URL and publishable/anon key to <code>.env</code>, then restart Vite. Setup instructions are in README.md.</p><a class="btn" href="/packages.html">View setup-aware package page</a></section>`);return false;} return true; };

async function getUser(){
  if(!supabase) return null;

  const { data, error } = await supabase.auth.getUser();

  if(error || !data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if(profileError){
    console.error('Could not retrieve user profile:', profileError.message);
  }

  return {
    ...data.user,
    full_name: profile?.full_name || '',
    role: profile?.role || null
  };
}

async function requireAdmin(){ if(!needDb())return false; const user=await getUser(); if(!user){location.href='/login.html';return false;} const {data,error}=await supabase.from('profiles').select('role').eq('id',user.id).single(); if(error||data?.role!=='admin'){shell('<section class="panel"><h1>Administrator access required</h1><p>This account is not authorized to access the dashboard.</p><a href="/login.html">Sign in with an administrator account</a></section>');return false;} return true; }
function navCard(p){return `<article class="package"><div class="package-art">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:'<span>✦</span>'}</div><div class="pad"><p class="eyebrow">${esc(p.minimum_guests||'')}${p.minimum_guests?' GUEST MINIMUM':''}</p><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description||'A thoughtfully prepared menu for your event.')}</p><div class="price">${money(p.price_per_person)} <small>/ person</small></div><a class="btn outline" href="/booking.html?package=${p.id}">Customize package</a></div></article>`;}
async function home(){ await renderHomePage(); }
async function packagesPage(){await shell(`<section class="pagehead"><p class="eyebrow">FIND YOUR FIT</p><h1>Our catering packages</h1><p>Compare inclusions, then customize the menu around your event.</p></section><div id="packages" class="cards"><p>Loading…</p></div>`);if(!needDb())return;const {data,error}=await supabase.from('packages').select('*').eq('is_active',true).order('sort_order');document.querySelector('#packages').innerHTML=error?'<p>Unable to load packages.</p>':data?.length?data.map(navCard).join(''):'<p>No active packages are available yet.</p>';}
const loginSlides = [
  ['Adobo Feast', 'Filipino chicken adobo with rice and vegetables', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1920&q=88'],
  ['Pancit Palabok', 'A generous plate of Filipino noodles with shrimp', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1920&q=88'],
  ['Crispy Pata', 'Crispy pata served for a Filipino celebration', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=88'],
  ['Sinigang na Hipon', 'Sinigang na hipon with shrimp and vegetables', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1920&q=88'],
  ['Lechon Kawali', 'Sliced crispy pork with herbs and dipping sauce', 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1920&q=88']
];

async function loginPage(){
  app.innerHTML = `<main class="login-page"><div class="login-backdrop" aria-hidden="true">${loginSlides.map(([name, alt, image], index) => `<figure class="login-slide${index === 0 ? ' is-active' : ''}" data-slide="${index}"><img src="${image}" alt="${alt}"><figcaption>${name}</figcaption></figure>`).join('')}</div><div class="login-overlay" aria-hidden="true"></div><section class="login-card" aria-labelledby="login-title"><a class="login-back" href="/index.html" aria-label="Back to home">← Back</a><a class="login-logo-link" href="/index.html" aria-label="Go to JMFoodies home"><div class="login-logo">${logoMark(84)}</div></a><p class="login-kicker">JMFOODIES ACCOUNT</p><h1 id="login-title">Welcome back</h1><p class="login-subtitle">Sign in to continue planning your next gathering.</p><form id="authform" novalidate><label>Email address<span class="login-input"><span class="login-input-icon">${icon('mail')}</span><input name="email" type="email" required autocomplete="email" placeholder="Enter your email"></span></label><label>Password<span class="login-input"><span class="login-input-icon">${icon('lock')}</span><input name="password" type="password" minlength="8" required autocomplete="current-password" placeholder="••••••••"><button type="button" class="password-toggle" aria-label="Show password">Show</button></span></label><button class="login-submit" type="submit">Sign in</button></form><p class="login-register">New to JMFoodies? <a href="/register.html">Create an account</a></p><a class="login-forgot" href="#" id="forgot">Forgot password?</a><div id="notice" class="notice" role="status" aria-live="polite"></div></section><div class="login-dots" aria-label="Food photography slideshow">${loginSlides.map(([, name], index) => `<span class="login-dot${index === 0 ? ' is-active' : ''}" aria-label="${name}" data-dot="${index}"></span>`).join('')}</div></main>`;
  const preload = image => { const img = new Image(); img.src = image; return img; };
  loginSlides.forEach(([, , image]) => preload(image));
  let current = 0;
  const slides = [...document.querySelectorAll('.login-slide')];
  const dots = [...document.querySelectorAll('.login-dot')];
  const showSlide = next => { slides[current].classList.remove('is-active'); dots[current].classList.remove('is-active'); current = next % slides.length; slides[current].classList.add('is-active'); dots[current].classList.add('is-active'); };
  const slideshow = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? null : setInterval(() => showSlide(current + 1), 1000);
  dots.forEach(dot => dot.addEventListener('click', () => showSlide(Number(dot.dataset.dot))));
  document.querySelector('.password-toggle')?.addEventListener('click', e => { const input = e.currentTarget.previousElementSibling; input.type = input.type === 'password' ? 'text' : 'password'; e.currentTarget.textContent = input.type === 'password' ? 'Show' : 'Hide'; e.currentTarget.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password'); });
  document.querySelector('#authform').addEventListener('submit', async e => { e.preventDefault(); const f = new FormData(e.currentTarget), email = f.get('email'), password = f.get('password'); if(!isConfigured) return notify('Connect your Supabase project before signing in.', true); const { error } = await supabase.auth.signInWithPassword({ email, password }); if(error) return notify(error.message, true); location.href = '/index.html'; });
  document.querySelector('#forgot').addEventListener('click', async e => { e.preventDefault(); const email = prompt('Enter your account email'); if(!email) return; if(!isConfigured) return notify('Connect your Supabase project before requesting a reset.', true); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/login.html' }); notify(error?.message || 'Password reset email requested.', !!error); });
  return () => slideshow && clearInterval(slideshow);
}

async function authPage(register=false){if(!register)return loginPage();const copy={eyebrow:'JOIN THE TABLE',title:'Create your account',sub:'Save your bookings and make every celebration easier.',action:'Create account'};await shell(`<section class="auth-layout"><div class="auth-art"><div class="auth-art-brand">${logoMark(72)}<span>JMFoodies</span></div><p class="eyebrow">WE CATER, YOU CELEBRATE</p><h1>Masarap na handa,<br><em>masayang salu-salo.</em></h1><p>Thoughtful Filipino catering for the moments worth sharing.</p></div><section class="auth panel"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1><p class="muted">${copy.sub}</p><form id="authform"><label>Email address<input name="email" type="email" required autocomplete="email"></label><label>Password<div class="password-field"><input name="password" type="password" minlength="8" required autocomplete="new-password"><button type="button" class="password-toggle" aria-label="Show password">Show</button></div></label><label>Full name<input name="name" required autocomplete="name"></label><button class="btn block" type="submit">${copy.action}<span aria-hidden="true">→</span></button></form><p class="muted auth-switch">Already registered? <a href="/login.html">Sign in</a></p><a class="textlink" href="#" id="forgot">Forgot password?</a></section></section>`);document.querySelector('.password-toggle')?.addEventListener('click',e=>{const input=e.currentTarget.previousElementSibling;input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'Show':'Hide';});if(!needDb())return;document.querySelector('#authform').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),email=f.get('email'),password=f.get('password');const result=await supabase.auth.signUp({email,password,options:{data:{full_name:f.get('name')}}});if(result.error)return notify(result.error.message,true);notify('Account created. Check your email if confirmation is enabled.');});document.querySelector('#forgot').addEventListener('click',async e=>{e.preventDefault();const email=prompt('Enter your account email');if(!email)return;const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/login.html'});notify(error?.message||'Password reset email requested.',!!error);});}
let currentPackage=null, categories=[], foodItems=[], selections=new Set(), mode='suggested';
async function bookingPage(){
await shell(`<section class="pagehead"><p class="eyebrow">LET'S CELEBRATE</p><h1>Build your catering booking</h1><p>Choose a package, make it yours, and send a request for our team to review.</p></section><div class="bookinggrid"><section class="panel"><div class="step"><span>01</span><div><h2>Choose a package</h2><p class="muted">Your package sets the base price and selection rules.</p></div></div><div id="pkgchoices">Loading packages…</div><div class="step"><span>02</span><div><h2>Choose your menu</h2><p class="muted">Use the suggested menu or customize from the official menu.</p></div></div><div class="toggle"><button data-mode="suggested" class="active">Suggested menu</button><button data-mode="custom">Customize menu</button></div><div id="menuarea"><p class="muted">Select a package to view its menu.</p></div></section><aside class="panel summary"><p class="eyebrow">YOUR ESTIMATE</p><h2>Price summary</h2><div id="summary">Choose a package to begin.</div><hr><h3>Event details</h3><form id="bookingform"><label>Full name<input name="full_name" required></label><label>Email<input name="email" type="email" required></label><label>Contact number<input name="phone" required></label><label>Event name<input name="event_name" required placeholder="e.g. Ana's 18th birthday"></label><label>Event type<select name="event_type" required><option value="">Choose one</option>${['Birthday','Wedding','Anniversary','Corporate Event','Graduation','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Event date<input name="event_date" type="date" required min="${new Date().toISOString().slice(0,10)}"></label><label>Event time<input name="event_time" type="time" required></label><label>Venue / address<input name="venue" required></label><label>Number of guests<input name="guest_count" type="number" min="1" value="50" required></label><label>Special instructions<textarea name="special_requests" rows="3"></textarea></label><label>Special food request (optional)<textarea name="special_food_request" rows="2" placeholder="Requires administrator approval; not included in this estimate."></textarea></label><button class="btn block" type="submit">Submit booking request</button><p class="tiny muted">Submitting sends a request only. Your reservation is not confirmed until approved by JMFoodies.</p></form></aside></div>`);
 if(!needDb())return;
 const [{data:pkgs,error},{data:cats},{data:foods}] = await Promise.all([supabase.from('packages').select('*').eq('is_active',true).order('sort_order'),supabase.from('food_categories').select('*').order('sort_order'),supabase.from('food_items').select('*, food_categories(name)').eq('is_available',true).order('name')]);
 if(error){notify('Could not load packages: '+error.message,true);return;} categories=cats||[];foodItems=foods||[];
 document.querySelector('#pkgchoices').innerHTML=pkgs?.length?pkgs.map(p=>`<label class="pkgchoice"><input type="radio" name="package" value="${p.id}"><span><b>${esc(p.name)}</b><small>${esc(p.description||'')}</small></span><strong>${money(p.price_per_person)}<small>/person</small></strong></label>`).join(''):'<p>No packages available.</p>';
 document.querySelectorAll('[name=package]').forEach(el=>el.addEventListener('change',()=>loadPackage(el.value)));
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));renderMenu();}));
 document.querySelector('#bookingform [name=guest_count]').addEventListener('input',renderSummary);
 document.querySelector('#bookingform').addEventListener('submit',submitBooking);
 const id=new URLSearchParams(location.search).get('package');if(id){const el=document.querySelector(`[name=package][value="${CSS.escape(id)}"]`);if(el){el.checked=true;loadPackage(id);}}
}
async function loadPackage(id){const {data,error}=await supabase.from('packages').select('*').eq('id',id).single();if(error)return notify(error.message,true);currentPackage=data;selections.clear();const {data:defaults}=await supabase.from('package_food_items').select('food_item_id').eq('package_id',id).eq('is_default',true);(defaults||[]).forEach(x=>selections.add(x.food_item_id));renderMenu();renderSummary();}
function allowedFor(categoryId){return currentPackage?.package_categories?.find(x=>x.category_id===categoryId)?.selection_limit ?? 99;}
async function renderMenu(){const area=document.querySelector('#menuarea');if(!currentPackage){area.innerHTML='<p>Select a package first.</p>';return;}
 const {data:rules}=await supabase.from('package_categories').select('*').eq('package_id',currentPackage.id);currentPackage.package_categories=rules||[];
 const grouped=categories.map(cat=>{const rule=rules?.find(r=>r.category_id===cat.id);if(!rule)return '';const items=foodItems.filter(x=>x.category_id===cat.id && (!x.package_ids || x.package_ids.includes(currentPackage.id)));return `<section class="foodgroup"><div class="grouphead"><h3>${esc(cat.name)}</h3><small>Select ${rule.selection_limit} · ${rule.is_required?'Required':'Optional'}</small></div><div class="foodgrid">${items.map(item=>{const included=Number(item.extra_price||0)===0;return `<label class="fooditem"><input type="checkbox" data-food="${item.id}" data-cat="${cat.id}" ${selections.has(item.id)?'checked':''}><span><b>${esc(item.name)}</b><small>${included?'Included':'+'+money(item.extra_price)+' / person'}</small><small>${esc(item.description||'')}</small></span></label>`;}).join('')}</div></section>`;}).join('');
 area.innerHTML=(mode==='suggested'?'<p class="hint">Suggested menu selections are preselected. You can change them within the package limits.</p>':'<p class="hint">Choose from the official JMFoodies menu. Items outside package inclusions may add to your per-person price.</p>')+(grouped||'<p>No food categories are configured for this package yet.</p>')+'<p class="muted tiny">Items marked unavailable are hidden. Special food requests are reviewed separately and are not included in this estimate.</p>';
 area.querySelectorAll('[data-food]').forEach(input=>input.addEventListener('change',()=>{const id=input.dataset.food,cat=input.dataset.cat;if(input.checked){const rule=rules.find(r=>r.category_id===cat);const count=[...selections].filter(x=>foodItems.find(f=>f.id===x)?.category_id===cat).length;if(count>=rule.selection_limit){input.checked=false;notify(`Selection limit reached for ${categories.find(c=>c.id===cat)?.name}.`,true);return;}selections.add(id);}else{const rule=rules.find(r=>r.category_id===cat);const count=[...selections].filter(x=>foodItems.find(f=>f.id===x)?.category_id===cat).length;if(rule?.is_required && count<=rule.selection_limit){input.checked=true;notify(`This category requires ${rule.selection_limit} selection(s).`,true);return;}selections.delete(id);}renderSummary();}));
}
function priceData(){const extras=[...selections].map(id=>foodItems.find(x=>x.id===id)).filter(Boolean);return {extras:extras.reduce((s,x)=>s+Number(x.extra_price||0),0),items:extras};}
function renderSummary(){if(!currentPackage)return;const {extras,items}=priceData(),per=Number(currentPackage.price_per_person)+extras,guests=Number(document.querySelector('[name=guest_count]')?.value||0);document.querySelector('#summary').innerHTML=`<div class="sumline"><span>${esc(currentPackage.name)}</span><b>${money(currentPackage.price_per_person)}</b></div><div class="sumline"><span>Food upgrades / person</span><b>${money(extras)}</b></div><div class="sumline total"><span>Estimated / person</span><b>${money(per)}</b></div><div class="sumline"><span>Guests</span><b>${guests}</b></div><div class="sumline grand"><span>Estimated total</span><b>${money(per*guests)}</b></div><p class="tiny muted">${items.length} menu item(s) selected</p><ul class="selectedlist">${items.map(x=>`<li>${esc(x.name)} ${Number(x.extra_price)>0?`(+${money(x.extra_price)})`:''}</li>`).join('')}</ul>`;}
const RPC_SQLSTATE_TO_CODE = {
  '42501': 'UNAUTHENTICATED',
  'P0001': 'MISSING_REQUIRED_FIELDS',
  'P0010': 'INVALID_PACKAGE',
  'P0011': 'PACKAGE_INACTIVE',
  'P0012': 'GUESTS_BELOW_MINIMUM',
  'P0002': 'EVENT_DATE_PAST',
  'P0003': 'MINIMUM_NOTICE_NOT_MET',
  'P0004': 'TIME_SLOT_UNAVAILABLE',
  'P0005': 'TIME_SLOT_COLLISION',
  'P0020': 'INVALID_FOOD_SELECTION',
  'P0021': 'FOOD_ITEM_UNAVAILABLE',
  'P0022': 'MENU_SELECTION_LIMIT_EXCEEDED',
  'P0023': 'MENU_REQUIRED_CATEGORY_MISMATCH',
  'P0024': 'FOOD_ITEM_NOT_IN_PACKAGE',
  'P0030': 'PRICE_TAMPERING_ATTEMPT'
};

function extractRpcErrorCode(error, raw) {
  const prefix = String(raw || '').match(/^([A-Z][A-Z0-9_]*)(?:\s*[:\s])/);
  if (prefix && prefix[1]) return prefix[1];
  if (error?.code && RPC_SQLSTATE_TO_CODE[error.code]) return RPC_SQLSTATE_TO_CODE[error.code];
  return null;
}

function mapRpcErrorToMessage(error) {
  const raw = String(error?.message || '');
  const code = extractRpcErrorCode(error, raw);

  const messages = {
    UNAUTHENTICATED: 'Please sign in or create an account before submitting your booking.',
    MISSING_REQUIRED_FIELDS: 'Please fill in all required event and contact fields.',
    INVALID_PACKAGE: 'The selected package does not exist. Please re-select a package.',
    PACKAGE_INACTIVE: 'The selected package is currently unavailable. Please choose another package.',
    GUESTS_BELOW_MINIMUM: `This package requires at least ${currentPackage?.minimum_guests || ''} guests.`.trim(),
    EVENT_DATE_PAST: 'Event date cannot be in the past.',
    MINIMUM_NOTICE_NOT_MET: 'Bookings require at least 3 calendar days advance notice.',
    TIME_SLOT_UNAVAILABLE: 'The selected date and time is blocked for catering. Please choose another time.',
    TIME_SLOT_COLLISION: 'An approved reservation already exists at this exact time. Please select another time.',
    INVALID_FOOD_SELECTION: 'One or more selected dishes could not be found. Please refresh your menu choices.',
    FOOD_ITEM_UNAVAILABLE: 'One or more selected dishes are currently unavailable. Please adjust your menu.',
    MENU_SELECTION_LIMIT_EXCEEDED: 'You selected more items than allowed for a menu category. Please adjust your menu.',
    MENU_REQUIRED_CATEGORY_MISMATCH: 'Please select the required number of items for each menu category.',
    FOOD_ITEM_NOT_IN_PACKAGE: 'One or more selected dishes are not offered by this package. Please adjust your menu.',
    PRICE_TAMPERING_ATTEMPT: 'Invalid booking request. Pricing has been recalculated based on official menu rules.'
  };

  if (code && messages[code]) return messages[code];
  for (const key of Object.keys(messages)) {
    if (raw.includes(key)) return messages[key];
  }
  return 'We could not submit your booking. Please try again or contact JMFoodies.';
}

async function submitBooking(e){
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if(!currentPackage)return notify('Please choose a package.',true);
  const f=new FormData(form),guests=Number(f.get('guest_count')),minimum=Number(currentPackage.minimum_guests||1);
  if(guests<minimum)return notify(`This package requires at least ${minimum} guests.`,true);

const { data: rules, error: rulesError } = await supabase
  .from('package_categories')
  .select('*')
  .eq('package_id', currentPackage.id);

if (rulesError) return notify('Could not load menu rules. Please try again.', true);

for (const rule of rules || []) {
  const selectedCount = [...selections].filter(id =>
    foodItems.some(item =>
      item.id === id && item.category_id === rule.category_id
    )
  ).length;

  const categoryName =
    categories.find(c => c.id === rule.category_id)?.name || 'Menu category';

  if (selectedCount > Number(rule.selection_limit)) {
    return notify(
      `You selected more items than allowed for ${categoryName}.`,
      true
    );
  }

  if (rule.is_required && selectedCount !== Number(rule.selection_limit)) {
    return notify(
      `Please select exactly ${rule.selection_limit} item(s) for ${categoryName}.`,
      true
    );
  }
}

 const user=await getUser();if(!user){notify('Please sign in or create an account before submitting.',true);return;}
 // Client-side estimate for display only; never sent as billable total.
 const {extras}=priceData();const base=Number(currentPackage.price_per_person),extra=extras,per=base+extra,total=per*guests;
 const selected_food_item_ids=[...selections];
 const payload={package_id:currentPackage.id,full_name:f.get('full_name'),email:f.get('email'),phone:f.get('phone'),event_name:f.get('event_name'),event_type:f.get('event_type'),event_date:f.get('event_date'),event_time:f.get('event_time'),venue:f.get('venue'),guest_count:guests,menu_mode:mode,selected_food_item_ids,special_requests:f.get('special_requests')||null,special_food_request:f.get('special_food_request')||null};
 const {data,error}=await supabase.rpc('create_booking',{payload});
 if(error){notify(mapRpcErrorToMessage(error),true);return;}
 location.href='/track-booking.html?ref='+encodeURIComponent(data.booking_reference);
}

async function trackPage(){
  await shell(`
    <section class="pagehead">
      <p class="eyebrow">YOUR EVENT, AT A GLANCE</p>
      <h1>Track your booking</h1>
      <p>Sign in to view your requests, or enter your booking reference.</p>
    </section>

    <section class="panel narrow">
      <form id="trackform">
        <label>
          Booking reference
          <input name="ref" placeholder="JM-…" required>
        </label>
        <button class="btn">Find booking</button>
      </form>
      <div id="trackresult"></div>
    </section>
  `);

  if(!needDb()) return;

  const ref = new URLSearchParams(location.search).get('ref');

  if(ref){
    document.querySelector('[name=ref]').value = ref;
  }

  document.querySelector('#trackform').addEventListener('submit', async e => {
    e.preventDefault();

    const bookingRef = new FormData(e.currentTarget)
      .get('ref').trim();

    const area = document.querySelector('#trackresult');
    area.innerHTML = '<p>Loading booking details...</p>';

    const {data, error} = await supabase
      .from('bookings')
      .select(`
  id,
  package_id,
  booking_reference,
  event_name,
  event_date,
  event_time,
  event_type,
  venue,
  guest_count,
  base_price_per_person,
  extra_price_per_person,
  final_price_per_person,
  estimated_total,
  special_requests,
  special_food_request,
  menu_mode,
  status,
  created_at
`)
      .eq('booking_reference', bookingRef)
      .maybeSingle();

    if(error){
      area.innerHTML = `<p class="error">${esc(error.message)}</p>`;
      return;
    }

    if(!data){
      area.innerHTML = '<p>No booking found. Check the reference and try again.</p>';
      return;
    }


// Retrieve the selected package
const {data: packageData, error: packageError} = await supabase
  .from('packages')
  .select('name, description')
  .eq('id', data.package_id)
  .maybeSingle();

// Retrieve the food selections saved with this booking
const {data: foodSelections, error: foodError} = await supabase
  .from('booking_food_items')
  .select('item_name_snapshot, category_name_snapshot, extra_price_snapshot')
  .eq('booking_id', data.id)
  .order('category_name_snapshot');

// Log retrieval errors for troubleshooting
if(packageError){
  console.error('Package details:', packageError.message);
}

if(foodError){
  console.error('Food selections:', foodError.message);
}


    const status = String(data.status || '').toLowerCase();

    const steps = [
      {key:'submitted', label:'Booking submitted'},
      {key:'review', label:'Under review'},
      {key:'approved', label:'Booking approved'},
      {key:'completed', label:'Event completed'}
    ];

    let currentStep = 0;

    if(['pending', 'under_review'].includes(status)){
      currentStep = 1;
    } else if(['approved', 'confirmed'].includes(status)){
      currentStep = 2;
    } else if(status === 'completed'){
      currentStep = 3;
    }

    const isCancelled = ['cancelled', 'rejected'].includes(status);

    const timeline = isCancelled
      ? `
        <div class="booking-timeline cancelled">
          <div class="timeline-line"></div>
          <div class="timeline-step done">
            <span class="timeline-dot">✓</span>
            <div>
              <strong>Booking submitted</strong>
              <small>Your reservation was received.</small>
            </div>
          </div>
          <div class="timeline-step current">
            <span class="timeline-dot">!</span>
            <div>
              <strong>${status === 'cancelled' ? 'Booking cancelled' : 'Booking rejected'}</strong>
              <small>${status === 'cancelled' ? 'This reservation has been cancelled.' : 'This reservation was not approved.'}</small>
            </div>
          </div>
        </div>
      `
      : `
        <div class="booking-timeline">
          <div class="timeline-line"></div>
          ${steps.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep;

            return `
              <div class="timeline-step ${done ? 'done' : ''} ${active ? 'current' : ''}">
                <span class="timeline-dot">
                  ${done ? '✓' : index + 1}
                </span>
                <div>
                  <strong>${step.label}</strong>
                  <small>
                    ${active ? 'Current booking status' :
                      done ? 'Completed' : 'Waiting for previous step'}
                  </small>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

    
area.innerHTML = `
  <div class="trackcard">

    <span class="status">${esc(status)}</span>

    <h2>${esc(data.event_name)}</h2>

    <p>
      ${esc(data.event_type)}
      · ${esc(formatEventDate(data.event_date))}
      at ${esc(formatEventTime(data.event_time))}
    </p>

    <p>
      ${esc(data.venue)}
      · ${esc(data.guest_count)} guests
    </p>

    <hr>

    <h3>Booking progress</h3>
    ${timeline}

    <hr>

    <h3>Booking details</h3>

    <div class="sumline">
      <span>Catering package</span>
      <b>${esc(packageData?.name || 'Package information unavailable')}</b>
    </div>

    ${packageData?.description ? `
      <p class="tiny muted">${esc(packageData.description)}</p>
    ` : ''}

    <h4>Selected food items</h4>

    ${
      foodError
        ? '<p class="muted">Food selections could not be loaded.</p>'
        : foodSelections?.length
          ? `
            <div class="booking-food-list">
              ${
                Object.entries(
                  foodSelections.reduce((groups, item) => {
                    const category = item.category_name_snapshot || 'Other items';

                    (groups[category] ||= []).push(item);

                    return groups;
                  }, {})
                ).map(([category, items]) => `
                  <div class="food-category">

                    <strong>${esc(category)}</strong>

                    <ul>
                      ${items.map(item => `
                        <li>
                          ${esc(item.item_name_snapshot)}

                          ${
                            Number(item.extra_price_snapshot) > 0
                              ? `<span>+${money(item.extra_price_snapshot)} / person</span>`
                              : ''
                          }
                        </li>
                      `).join('')}
                    </ul>

                  </div>
                `).join('')
              }
            </div>
          `
          : '<p class="muted">No individual food selections were recorded.</p>'
    }

    ${
      data.special_requests
        ? `
          <h4>Special instructions</h4>
          <p>${esc(data.special_requests)}</p>
        `
        : ''
    }

    ${
      data.special_food_request
        ? `
          <h4>Special food request</h4>
          <p>${esc(data.special_food_request)}</p>
          <p class="tiny muted">
            Subject to administrator approval and not included in the estimate.
          </p>
        `
        : ''
    }

    <hr>

    <h3>Price breakdown</h3>

    <div class="sumline">
      <span>Base price / person</span>
      <b>${money(data.base_price_per_person)}</b>
    </div>

    <div class="sumline">
      <span>Food upgrades / person</span>
      <b>${money(data.extra_price_per_person)}</b>
    </div>

    <div class="sumline">
      <span>Final price / person</span>
      <b>${money(data.final_price_per_person)}</b>
    </div>

    <div class="sumline">
      <span>Number of guests</span>
      <b>${esc(data.guest_count)}</b>
    </div>

    <div class="sumline total">
      <span>Estimated total</span>
      <b>${money(data.estimated_total)}</b>
    </div>

       <p class="tiny muted">
      Reference: ${esc(data.booking_reference)}
    </p>

    <hr>

    <h3>Cancellation request</h3>

    <p class="muted">
      Need to cancel this booking? You may submit a request for our
      administrator to review.
    </p>

    <div id="cancellationSection">
      <p class="tiny muted">Loading cancellation request status...</p>
    </div>

  </div>
`;
    // Load the customer's latest cancellation request
    const cancellationSection = document.querySelector('#cancellationSection');

    if (cancellationSection) {
      const { data: cancellationRequest, error: cancellationError } =
        await supabase
          .from('booking_cancellation_requests')
          .select('id, reason, status, admin_note, created_at')
          .eq('booking_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (cancellationError) {
        cancellationSection.innerHTML = `
          <p class="muted">
            Unable to load cancellation request status.
          </p>
        `;
      } else if (cancellationRequest?.status === 'pending') {
        cancellationSection.innerHTML = `
          <p><strong>Request status:</strong> Pending review</p>
          <p class="tiny muted">
            Your cancellation request is waiting for administrator review.
          </p>
        `;
      } else if (cancellationRequest?.status === 'approved') {
        cancellationSection.innerHTML = `
          <p><strong>Request status:</strong> Approved</p>
          <p class="tiny muted">
            Your cancellation request has been approved.
          </p>
        `;
           } else if (cancellationRequest?.status === 'rejected') {
        cancellationSection.innerHTML = `
          <p><strong>Previous request:</strong> Rejected</p>
          ${cancellationRequest.admin_note
            ? `<p class="tiny muted">Admin note: ${esc(cancellationRequest.admin_note)}</p>`
            : ''}
          <p class="tiny muted">
            You may submit another request if needed.
          </p>
        `;
      } else if (
        ['pending', 'under_review', 'approved', 'confirmed'].includes(data.status)
      ) {
        cancellationSection.innerHTML = `
          <form id="cancellationRequestForm">
            <label for="cancellationReason">
              Why do you want to cancel this booking?
            </label>

            <textarea
              id="cancellationReason"
              name="reason"
              rows="4"
              required
              placeholder="Please explain your reason..."
            ></textarea>

            <button type="submit">
              Request Cancellation
            </button>

            <p class="tiny muted">
              Your booking will not be cancelled immediately.
              An administrator must review your request first.
            </p>
          </form>
        `;
      } else {
        cancellationSection.innerHTML = `
          <p class="muted">
            Cancellation requests are unavailable for this booking.
          </p>
        `;
      }

      // Handle cancellation request submission
      document.querySelector('#cancellationRequestForm')
        ?.addEventListener('submit', async event => {
          event.preventDefault();

          const form = event.currentTarget;
          const reason = new FormData(form).get('reason').trim();
          const button = form.querySelector('button[type="submit"]');

          if (!reason) {
            return notify('Please provide a reason for cancellation.', true);
          }

          const user = await getUser();

          if (!user) {
            return notify('Please sign in before requesting cancellation.', true);
          }

          button.disabled = true;
          button.textContent = 'Submitting...';

          const { error } = await supabase
            .from('booking_cancellation_requests')
            .insert({
              booking_id: data.id,
              customer_id: user.id,
              reason: reason,
              status: 'pending'
            });

          if (error) {
            button.disabled = false;
            button.textContent = 'Request Cancellation';

            return notify(error.message, true);
          }

          cancellationSection.innerHTML = `
            <p><strong>Request status:</strong> Pending review</p>
            <p class="tiny muted">
              Your cancellation request has been submitted successfully.
              Please wait for administrator review.
            </p>
            <p class="tiny muted">
              Reason: ${esc(reason)}
            </p>
          `;

          notify('Cancellation request submitted successfully.');
        });

    }
  });

  if(ref){
    document.querySelector('#trackform')
      .requestSubmit();
  }
}

async function accountPage(){
  const user = await getUser();

  if(!user){
    location.href = '/login.html';
    return;
  }

  if(user.role === 'admin'){
    location.href = '/admin/dashboard.html';
    return;
  }

  if(user.role !== 'customer'){
    await shell('<section class="panel"><h1>Account unavailable</h1><p>Your account profile could not be verified.</p></section>');
    return;
  }

  await shell(`
    <section class="pagehead">
      <p class="eyebrow">YOUR JMFOODIES ACCOUNT</p>
      <h1>Welcome back, ${esc(user.full_name || 'Customer')}!</h1>
      <p>Manage your profile and keep track of your celebrations.</p>
    </section>

    <section class="stats" id="accountStats">
      <div class="stat">Loading bookings...</div>
    </section>

    <section class="panel">
      <div class="sectionhead">
        <h2>Profile information</h2>
      </div>
      <div id="accountProfile">Loading profile...</div>
    </section>

    <section class="panel">
      <div class="sectionhead">
        <h2>Recent bookings</h2>
        <a href="/my-bookings.html">View all bookings →</a>
      </div>
      <div id="recentBookings">Loading bookings...</div>
    </section>
  `);

  const [{data: profile, error: profileError}, {data: bookings, error: bookingError}] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle(),

    supabase.from('bookings')
      .select('booking_reference, event_name, event_date, guest_count, estimated_total, status, created_at')
      .eq('customer_id', user.id)
      .order('created_at', {ascending: false})
      .limit(5)
  ]);

  if(profileError){
    document.querySelector('#accountProfile').textContent = profileError.message;
  } else {
   
document.querySelector('#accountProfile').innerHTML = `
  <form id="profileForm" class="formgrid">
    <label>
      Full name
      <input
        type="text"
        name="full_name"
        value="${esc(profile?.full_name || '')}"
        required
      >
    </label>

    <label>
      Email address
      <input
        type="email"
        value="${esc(user.email || '')}"
        disabled
      >
    </label>

    <label>
      Phone number
      <input
        type="tel"
        name="phone"
        value="${esc(profile?.phone || '')}"
        placeholder="Enter your phone number"
      >
    </label>

    <div class="wide">
      <p><strong>Account type:</strong> CUSTOMER</p>
      <button type="submit" class="btn">Save changes</button>
    </div>
  </form>
`;

  }

document.querySelector('#profileForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const form = new FormData(e.currentTarget);

  const full_name = form.get('full_name').trim();
  const phone = form.get('phone').trim();

  if(!full_name){
    return notify('Please enter your full name.', true);
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, phone: phone || null })
    .eq('id', user.id);

  if(error){
    return notify(error.message, true);
  }

  notify('Profile updated successfully.');

  document.querySelector('.pagehead h1').textContent =
    `Welcome back, ${full_name}!`;

  e.currentTarget.querySelector('[name="full_name"]').value = full_name;
});

  if(bookingError){
    document.querySelector('#accountStats').textContent = bookingError.message;
    document.querySelector('#recentBookings').textContent = 'Could not load bookings.';
    return;
  }

  const allBookings = bookings || [];
  const total = allBookings.length;
  const pending = allBookings.filter(b => b.status === 'pending').length;
  const approved = allBookings.filter(b => ['approved', 'confirmed'].includes(b.status)).length;

  document.querySelector('#accountStats').innerHTML = `
    <div class="stat"><small>Recent bookings</small><strong>${total}</strong></div>
    <div class="stat"><small>Pending</small><strong>${pending}</strong></div>
    <div class="stat"><small>Approved / confirmed</small><strong>${approved}</strong></div>
  `;

  document.querySelector('#recentBookings').innerHTML = allBookings.length
    ? `
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Event</th>
              <th>Date</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${allBookings.map(b => `
              <tr>
                <td>${esc(b.booking_reference)}</td>
                <td>${esc(b.event_name)}</td>
                <td>${esc(b.event_date)}</td>
                <td>${esc(b.guest_count)}</td>
                <td>${money(b.estimated_total)}</td>
                <td>${esc(b.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : '<p class="muted">You have no bookings yet. Ready to plan your first event?</p><a class="btn" href="/packages.html">Explore packages</a>';
}


async function myBookingsPage(){
  const user = await getUser();

  if(!user){
    location.href = '/login.html';
    return;
  }

  if(user.role === 'admin'){
    location.href = '/admin/dashboard.html';
    return;
  }

  if(user.role !== 'customer'){
    await shell('<section class="panel"><h1>Access unavailable</h1><p>Your account could not be verified.</p></section>');
    return;
  }

  await shell(`
    <section class="pagehead">
      <p class="eyebrow">YOUR JMFOODIES RESERVATIONS</p>
      <h1>My Bookings</h1>
      <p>View and monitor all your catering reservations.</p>
    </section>

    <section class="panel">
      <div class="sectionhead">
        <h2>Booking history</h2>
        <a class="btn" href="/booking.html">Book an event</a>
      </div>
      <div id="myBookingList">Loading your bookings...</div>
    </section>
  `);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, event_name, event_type, event_date, event_time, venue, guest_count, estimated_total, status, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const area = document.querySelector('#myBookingList');

  if(error){
    area.textContent = 'Could not load bookings: ' + error.message;
    return;
  }

  if(!bookings?.length){
    area.innerHTML = `
      <p class="muted">You haven't made any bookings yet.</p>
      <a class="btn" href="/packages.html">Explore packages</a>
    `;
    return;
  }

  area.innerHTML = `
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Event</th>
            <th>Event date</th>
            <th>Guests</th>
            <th>Estimated total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => `
            <tr>
              <td>
                <a href="/track-booking.html?ref=${encodeURIComponent(b.booking_reference)}">
                  ${esc(b.booking_reference)}
                </a>
              </td>
              <td>${esc(b.event_name)}</td>
              <td>${esc(b.event_date)}</td>
              <td>${esc(b.guest_count)}</td>
              <td>${money(b.estimated_total)}</td>
              <td><span class="status">${esc(b.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <p class="tiny muted">Showing up to 100 of your most recent bookings.</p>
  `;
}


async function notificationsPage(){
  const user = await getUser();

  if(!user){
    location.href = '/login.html';
    return;
  }

  if(user.role === 'admin'){
    location.href = '/admin/dashboard.html';
    return;
  }

  if(user.role !== 'customer'){
    await shell('<section class="panel"><h1>Access unavailable</h1></section>');
    return;
  }

  await shell(`
    <section class="pagehead">
      <p class="eyebrow">STAY UPDATED</p>
      <h1>Notifications</h1>
      <p>Stay updated on your JMFoodies bookings and requests.</p>
    </section>

    <section class="panel">
      <div class="sectionhead">
        <h2>Your notifications</h2>
        <button class="btn outline" id="markAllRead" type="button">
          Mark all as read
        </button>
      </div>
      <div id="notificationList">Loading notifications...</div>
    </section>
  `);

  const area = document.querySelector('#notificationList');

  async function loadNotifications(){
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if(error){
      area.textContent = 'Could not load notifications: ' + error.message;
      return;
    }

    if(!data?.length){
      area.innerHTML = '<p class="muted">You have no notifications yet.</p>';
      return;
    }

    area.innerHTML = data.map(n => `
      <article class="panel" style="margin-bottom:12px; ${n.is_read ? 'opacity:.75;' : 'border-left:4px solid var(--red);'}">
        <div class="sectionhead">
          <h3>${esc(n.title)}</h3>
          <span class="status">${n.is_read ? 'Read' : 'Unread'}</span>
        </div>
        <p>${esc(n.message)}</p>
        <p class="tiny muted">
          ${new Date(n.created_at).toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}
        </p>
        ${n.is_read ? '' : `
          <button class="btn outline" type="button" data-mark-read="${n.id}">
            Mark as read
          </button>
        `}
      </article>
    `).join('');

    area.querySelectorAll('[data-mark-read]').forEach(button => {
      button.addEventListener('click', async () => {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', button.dataset.markRead)
          .eq('user_id', user.id);

        if(error){
          notify(error.message, true);
          return;
        }

        loadNotifications();
      });
    });
  }

  document.querySelector('#markAllRead').addEventListener('click', async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if(error){
      notify(error.message, true);
      return;
    }

    loadNotifications();
  });

  await loadNotifications();
}

async function adminDashboard(){if(!await requireAdmin())return;adminShell(`<p class="eyebrow">JMFOODIES OPERATIONS</p><h1>Dashboard overview</h1><p class="muted">A live snapshot of your catering business.</p><div id="stats" class="stats"><div class="stat">Loading…</div></div><section class="panel"><div class="sectionhead"><h2>Upcoming reservations</h2><a href="/admin/bookings.html">Manage bookings →</a></div><div id="upcoming">Loading…</div></section>`);const [{count:all},{count:pending},{count:approved},{count:customers},{data:up}] = await Promise.all([supabase.from('bookings').select('*',{count:'exact',head:true}),supabase.from('bookings').select('*',{count:'exact',head:true}).eq('status','pending'),supabase.from('bookings').select('*',{count:'exact',head:true}).in('status',['approved','confirmed']),supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','customer'),supabase.from('bookings').select('booking_reference,event_name,event_date,guest_count,status').gte('event_date',new Date().toISOString().slice(0,10)).order('event_date').limit(8)]);document.querySelector('#stats').innerHTML=[['Total bookings',all],['Pending review',pending],['Approved / confirmed',approved],['Customers',customers]].map(([a,b])=>`<div class="stat"><small>${a}</small><strong>${b??'—'}</strong></div>`).join('');document.querySelector('#upcoming').innerHTML=up?.length?table(up,['booking_reference','event_name','event_date','guest_count','status']):'<p class="muted">No upcoming events.</p>';}


async function adminCancellationRequests() {
  if (!await requireAdmin()) return;

  adminShell(`
    <p class="eyebrow">JMFOODIES OPERATIONS</p>
    <h1>Cancellation Requests</h1>
    <p class="muted">
      Review and manage customer cancellation requests.
    </p>

    <div id="cancellationStats" class="stats">
      <div class="stat">Loading...</div>
    </div>

    <section class="panel">
      <div class="sectionhead">
        <h2>Incoming requests</h2>
      </div>

      <div id="cancellationRequests">
        Loading cancellation requests...
      </div>
    </section>
  `);

  async function loadRequests() {
    const container = document.querySelector('#cancellationRequests');

    container.textContent = 'Loading requests...';

    const { data: requests, error } = await supabase
      .from('booking_cancellation_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = `<p class="error">${esc(error.message)}</p>`;
      return;
    }

    const all = requests || [];

    const pending = all.filter(r => r.status === 'pending').length;
    const approved = all.filter(r => r.status === 'approved').length;
    const rejected = all.filter(r => r.status === 'rejected').length;

    document.querySelector('#cancellationStats').innerHTML = [
      ['Pending requests', pending],
      ['Approved requests', approved],
      ['Rejected requests', rejected]
    ].map(([label, count]) => `
      <div class="stat">
        <small>${label}</small>
        <strong>${count}</strong>
      </div>
    `).join('');

    if (!all.length) {
      container.innerHTML = `
        <p class="muted">No cancellation requests found.</p>
      `;
      return;
    }

    const bookingIds = [...new Set(all.map(r => r.booking_id))];
    const customerIds = [...new Set(all.map(r => r.customer_id))];

    const [
      { data: bookings, error: bookingError },
      { data: customers, error: customerError }
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          full_name,
          email,
          event_name,
          event_date,
          event_time,
          venue,
          guest_count,
          estimated_total,
          status
        `)
        .in('id', bookingIds),

      supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', customerIds)
    ]);

    if (bookingError || customerError) {
      container.innerHTML = `
        <p class="error">
          Could not load booking/customer details:
          ${esc(bookingError?.message || customerError?.message)}
        </p>
      `;
      return;
    }

    const bookingMap = new Map(
      (bookings || []).map(b => [b.id, b])
    );

    const customerMap = new Map(
      (customers || []).map(c => [c.id, c])
    );

    container.innerHTML = all.map(request => {
      const booking = bookingMap.get(request.booking_id);
      const customer = customerMap.get(request.customer_id);

      const submittedAt = request.created_at
        ? new Date(request.created_at).toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })
        : 'Date unavailable';

      return `
        <article class="panel" style="margin-top:20px;">

          <div class="sectionhead">
            <h3>${esc(request.status.toUpperCase())}</h3>
            <small>${esc(submittedAt)}</small>
          </div>

          ${booking ? `
            <h3>${esc(booking.event_name)}</h3>

            <p>
              <strong>Booking reference:</strong>
              ${esc(booking.booking_reference)}
            </p>

            <p>
              <strong>Customer:</strong>
              ${esc(customer?.full_name || booking.full_name || 'Unavailable')}
            </p>

            <p>
              <strong>Email:</strong>
              ${esc(booking.email)}
            </p>

            <p>
              <strong>Event date:</strong>
              ${esc(formatEventDate(booking.event_date))}
            </p>

            <p>
              <strong>Event time:</strong>
              ${esc(formatEventTime(booking.event_time))}
            </p>

            <p>
              <strong>Venue:</strong>
              ${esc(booking.venue)}
            </p>

            <p>
              <strong>Guests:</strong>
              ${esc(booking.guest_count)}
            </p>

            <p>
              <strong>Booking status:</strong>
              ${esc(booking.status)}
            </p>

            <p>
              <strong>Estimated total:</strong>
              ${money(booking.estimated_total)}
            </p>
          ` : `
            <p class="muted">
              Original booking details are unavailable.
            </p>
          `}

          <hr>

          <h4>Cancellation reason</h4>
          <p>${esc(request.reason)}</p>

          ${request.admin_note ? `
            <h4>Administrator note</h4>
            <p>${esc(request.admin_note)}</p>
          ` : ''}

          ${request.status === 'pending' ? `
            <label>
              Administrator note (optional)
              <textarea
                id="note-${request.id}"
                rows="3"
                placeholder="Add a note for the customer..."
              ></textarea>
            </label>

            <div class="actions" style="margin-top:15px;">
              <button
                class="btn"
                data-review="approved"
                data-id="${request.id}"
              >
                Approve cancellation
              </button>

              <button
                class="btn outline"
                data-review="rejected"
                data-id="${request.id}"
              >
                Reject request
              </button>
            </div>
          ` : `
            <p class="muted">
              This request has already been reviewed.
            </p>
          `}

        </article>
      `;
    }).join('');

    document.querySelectorAll('[data-review]').forEach(button => {
      button.addEventListener('click', async () => {
        const requestId = button.dataset.id;
        const decision = button.dataset.review;

        const note = document
          .querySelector(`#note-${requestId}`)
          ?.value.trim() || null;

        const action = decision === 'approved' ? 'approve' : 'reject';

        if (!confirm(`Are you sure you want to ${action} this cancellation request?`)) {
          return;
        }

        button.disabled = true;
        button.textContent = 'Processing...';

        const { error } = await supabase.rpc(
          'review_booking_cancellation_request',
          {
            p_request_id: requestId,
            p_decision: decision,
            p_admin_note: note
          }
        );

        if (error) {
          notify(error.message, true);
          button.disabled = false;
          button.textContent = decision === 'approved'
            ? 'Approve cancellation'
            : 'Reject request';
          return;
        }

        notify(`Cancellation request ${decision}.`);

        await loadRequests();
      });
    });
  }

  await loadRequests();
}


function table(rows,cols){return `<div class="tablewrap"><table><thead><tr>${cols.map(c=>`<th>${c.replaceAll('_',' ')}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
async function adminBookings(){if(!await requireAdmin())return;adminShell(`<p class="eyebrow">RESERVATIONS</p><h1>Booking management</h1><div class="toolbar"><input id="search" placeholder="Search reference, customer or event"><select id="filter"><option value="">All statuses</option>${['pending','under_review','approved','confirmed','rejected','cancelled','completed'].map(x=>`<option>${x}</option>`).join('')}</select></div><div id="rows">Loading…</div>`);async function load(){let q=supabase.from('bookings').select('*').order('created_at',{ascending:false}).limit(150);const status=document.querySelector('#filter').value;if(status)q=q.eq('status',status);const term=document.querySelector('#search').value.trim().replace(/[%_\\]/g,'\\\\$&');if(term)q=q.or(`booking_reference.ilike.%${term}%,full_name.ilike.%${term}%,event_name.ilike.%${term}%`);const {data,error}=await q;document.querySelector('#rows').innerHTML=error?esc(error.message):`<div class="tablewrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Event</th><th>Date</th><th>Guests</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>${(data||[]).map(b=>`<tr><td>${esc(b.booking_reference)}</td><td>${esc(b.full_name)}</td><td>${esc(b.event_name)}</td><td>${esc(b.event_date)}</td><td>${b.guest_count}</td><td>${money(b.estimated_total)}</td><td>${esc(b.status)}</td><td><select data-status="${b.id}">${['pending','under_review','approved','confirmed','rejected','cancelled','completed'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;document.querySelectorAll('[data-status]').forEach(el=>el.addEventListener('change',async()=>{const {error}=await supabase.from('bookings').update({status:el.value}).eq('id',el.dataset.status);notify(error?.message||'Booking status updated.',!!error);if(!error)load();}));}document.querySelector('#filter').addEventListener('change',load);document.querySelector('#search').addEventListener('input',()=>{clearTimeout(window._searchTimer);window._searchTimer=setTimeout(load,300)});load();}

async function adminPackages() {
  if (!await requireAdmin()) return;

  adminShell(`
    <p class="eyebrow">CATALOGUE</p>
    <h1>Package management</h1>

    <section class="panel">
      <h2>Add a package</h2>
      <form id="newpkg" class="formgrid">
        <label>Package name
          <input name="name" required>
        </label>

        <label>Price per person (₱)
          <input name="price_per_person" type="number" min="0" step=".01" required>
        </label>

        <label>Minimum guests
          <input name="minimum_guests" type="number" min="1" value="1" required>
        </label>

        <label>Image URL
          <input name="image_url" type="url">
        </label>

        <label class="wide">Description
          <textarea name="description"></textarea>
        </label>

        <button class="btn">Add package</button>
      </form>
    </section>

    <h2>Existing packages</h2>
    <p class="muted">Edit package details, prices, and dish selection limits.</p>
    <div id="pkglist">Loading packages...</div>
  `);

  const { data: categories, error: categoryError } =
    await supabase
      .from('food_categories')
      .select('id, name')
      .in('name', ['Main Dish', 'Side Dish', 'Desserts']);

  if (categoryError) {
    notify(categoryError.message, true);
    return;
  }

  const categoryMap = Object.fromEntries(
    (categories || []).map(c => [c.name, c.id])
  );

  const requiredCategories = ['Main Dish', 'Side Dish', 'Desserts'];

  if (requiredCategories.some(name => !categoryMap[name])) {
    notify('A required food category is missing.', true);
    return;
  }

  async function loadPackages() {
    const [{ data: packages, error }, { data: rules }] =
      await Promise.all([
        supabase.from('packages')
          .select('*')
          .order('sort_order'),
        supabase.from('package_categories')
          .select('*')
      ]);

    const list = document.querySelector('#pkglist');

    if (error) {
      list.innerHTML = esc(error.message);
      return;
    }

    list.innerHTML = (packages || []).map(pkg => {
      const packageRules = (rules || []).filter(
        r => r.package_id === pkg.id
      );

      const getLimit = categoryName => {
        const rule = packageRules.find(
          r => r.category_id === categoryMap[categoryName]
        );
        return rule ? rule.selection_limit : 0;
      };

      return `
        <section class="panel" style="margin-bottom:18px">
          <form class="package-edit-form" data-id="${pkg.id}">
            <h2>${esc(pkg.name)}</h2>

            <div class="formgrid">
              <label>Package name
                <input name="name" value="${esc(pkg.name)}" required>
              </label>

              <label>Price per person (₱)
                <input name="price_per_person"
                  type="number" min="0" step=".01"
                  value="${pkg.price_per_person}" required>
              </label>

              <label>Minimum guests
                <input name="minimum_guests"
                  type="number" min="1"
                  value="${pkg.minimum_guests}" required>
              </label>

              <label>Image URL
                <input name="image_url" type="url"
                  value="${esc(pkg.image_url || '')}">
              </label>

              <label class="wide">Description / Inclusions
                <textarea name="description">${esc(pkg.description || '')}</textarea>
              </label>

              <label>Main dishes to select
                <input name="main_limit" type="number" min="0"
                  value="${getLimit('Main Dish')}" required>
              </label>

              <label>Side dishes to select
                <input name="side_limit" type="number" min="0"
                  value="${getLimit('Side Dish')}" required>
              </label>

              <label>Desserts to select
                <input name="dessert_limit" type="number" min="0"
                  value="${getLimit('Desserts')}" required>
              </label>

              <label>
                <input name="is_active" type="checkbox"
                  ${pkg.is_active ? 'checked' : ''}>
                Available to customers
              </label>
            </div>

            <button class="btn" type="submit">Save changes</button>
          </form>
        </section>
      `;
    }).join('') || '<p>No packages found.</p>';
  }

  // Add a new package
  document.querySelector('#newpkg').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    values.price_per_person = Number(values.price_per_person);
    values.minimum_guests = Number(values.minimum_guests);
    values.is_active = false;

    const { data: newPackage, error } = await supabase
      .from('packages')
      .insert(values)
      .select()
      .single();

    if (error) {
      notify(error.message, true);
      return;
    }

    const defaultRules = [
      { category_id: categoryMap['Main Dish'], selection_limit: 1 },
      { category_id: categoryMap['Side Dish'], selection_limit: 2 },
      { category_id: categoryMap['Desserts'], selection_limit: 1 }
    ].map(rule => ({
      package_id: newPackage.id,
      category_id: rule.category_id,
      selection_limit: rule.selection_limit,
      is_required: true
    }));

    const { error: ruleError } = await supabase
      .from('package_categories')
      .insert(defaultRules);

    if (ruleError) {
      notify('Package created, but selection rules failed: ' + ruleError.message, true);
      await loadPackages();
      return;
    }

    notify('Package added successfully.');
    form.reset();
    await loadPackages();
  });

  // Save edits to existing packages
  document.querySelector('#pkglist').addEventListener('submit', async e => {
    if (!e.target.matches('.package-edit-form')) return;

    e.preventDefault();

    const form = e.target;
    const id = form.dataset.id;
    const values = Object.fromEntries(new FormData(form));

    const packageUpdate = {
      name: values.name.trim(),
      description: values.description,
      price_per_person: Number(values.price_per_person),
      minimum_guests: Number(values.minimum_guests),
      image_url: values.image_url || null,
      is_active: form.elements.is_active.checked,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('packages')
      .update(packageUpdate)
      .eq('id', id);

    if (error) {
      notify(error.message, true);
      return;
    }

    const limits = [
      { name: 'Main Dish', value: Number(values.main_limit) },
      { name: 'Side Dish', value: Number(values.side_limit) },
      { name: 'Desserts', value: Number(values.dessert_limit) }
    ];

    const { data: existingRules, error: fetchError } = await supabase
      .from('package_categories')
      .select('*')
      .eq('package_id', id);

    if (fetchError) {
      notify(fetchError.message, true);
      return;
    }

    for (const item of limits) {
      const categoryId = categoryMap[item.name];

      const existing = (existingRules || []).find(
        r => r.category_id === categoryId
      );

      const ruleData = {
        selection_limit: item.value,
        is_required: item.value > 0
      };

      const result = existing
        ? await supabase
            .from('package_categories')
            .update(ruleData)
            .eq('id', existing.id)
        : await supabase
            .from('package_categories')
            .insert({
              package_id: id,
              category_id: categoryId,
              ...ruleData
            });

      if (result.error) {
        notify('Package saved, but a selection rule failed: ' + result.error.message, true);
        await loadPackages();
        return;
      }
    }

    notify('Package and selection rules updated successfully.');
    await loadPackages();
  });

  await loadPackages();
}

async function adminFood() {
  if (!await requireAdmin()) return;

  adminShell(`
    <p class="eyebrow">OFFICIAL MENU</p>
    <h1>Food menu management</h1>

    <section class="panel">
      <h2>Add food item</h2>

      <form id="newfood" class="formgrid">
        <label>Food name
          <input name="name" required>
        </label>

        <label>Category
          <select name="category_id" id="catselect" required></select>
        </label>

        <label>Additional charge / person (₱)
          <input name="extra_price" type="number"
            min="0" step=".01" value="0" required>
        </label>

        <label>Image URL
          <input name="image_url" type="url">
        </label>

        <label class="wide">Description
          <textarea name="description"></textarea>
        </label>

        <button class="btn">Add menu item</button>
      </form>
    </section>

    <h2>Existing menu items</h2>
    <p class="muted">Edit dishes, categories, additional charges, and availability.</p>

    <div id="foodlist">Loading menu...</div>
  `);

  const { data: cats, error: catError } = await supabase
    .from('food_categories')
    .select('*')
    .order('name');

  if (catError) {
    notify(catError.message, true);
    return;
  }

  const categoryOptions = (cats || []).map(c =>
    `<option value="${c.id}">${esc(c.name)}</option>`
  ).join('');

  document.querySelector('#catselect').innerHTML = categoryOptions;

  // Load all menu items
  async function loadFood() {
    const { data, error } = await supabase
      .from('food_items')
      .select(`
        id,
        name,
        category_id,
        extra_price,
        is_available,
        image_url,
        description,
        food_categories(name)
      `)
      .order('name');

    const list = document.querySelector('#foodlist');

    if (error) {
      list.innerHTML = esc(error.message);
      return;
    }

    list.innerHTML = `
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Food item</th>
              <th>Category</th>
              <th>Extra / person</th>
              <th>Description</th>
              <th>Available</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${(data || []).map(item => `
              <tr>
                <td>
                  <input
                    form="food-${item.id}"
                    name="name"
                    value="${esc(item.name)}"
                    required
                  >
                </td>

                <td>
                  <select form="food-${item.id}" name="category_id" required>
                    ${(cats || []).map(c => `
                      <option value="${c.id}"
                        ${c.id === item.category_id ? 'selected' : ''}>
                        ${esc(c.name)}
                      </option>
                    `).join('')}
                  </select>
                </td>

                <td>
                  <input
                    form="food-${item.id}"
                    name="extra_price"
                    type="number"
                    min="0"
                    step=".01"
                    value="${item.extra_price ?? 0}"
                    required
                  >
                </td>

                <td>
                  <textarea
                    form="food-${item.id}"
                    name="description"
                    rows="2"
                  >${esc(item.description || '')}</textarea>

                  <input
                    form="food-${item.id}"
                    name="image_url"
                    type="url"
                    placeholder="Image URL"
                    value="${esc(item.image_url || '')}"
                  >
                </td>

                <td>
                  <input
                    form="food-${item.id}"
                    name="is_available"
                    type="checkbox"
                    ${item.is_available ? 'checked' : ''}
                  >
                  ${item.is_available ? 'Available' : 'Unavailable'}
                </td>

                <td>
                  <form id="food-${item.id}" class="food-edit-form"
                    data-id="${item.id}">
                    <button class="btn" type="submit">Save</button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (!data?.length) {
      list.innerHTML = '<p>No food items found.</p>';
    }
  }

  // Add a new dish
  document.querySelector('#newfood').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    values.name = values.name.trim();
    values.extra_price = Number(values.extra_price);
    values.is_available = true;

    if (!values.image_url) values.image_url = null;

    const { error } = await supabase
      .from('food_items')
      .insert(values);

    if (error) {
      notify(error.message, true);
      return;
    }

    notify('Food item added successfully.');
    form.reset();

    await loadFood();
  });

  // Save changes to existing dishes
  document.querySelector('#foodlist').addEventListener('submit', async e => {
    if (!e.target.matches('.food-edit-form')) return;

    e.preventDefault();

    const form = e.target;
    const id = form.dataset.id;

    const values = Object.fromEntries(new FormData(form));

    const update = {
      name: values.name.trim(),
      category_id: values.category_id,
      extra_price: Number(values.extra_price),
      description: values.description,
      image_url: values.image_url || null,
      is_available: form.elements.is_available.checked
    };

    const { error } = await supabase
      .from('food_items')
      .update(update)
      .eq('id', id);

    if (error) {
      notify(error.message, true);
      return;
    }

    notify('Food item updated successfully.');

    await loadFood();
  });

  await loadFood();
}
async function adminReports(){if(!await requireAdmin())return;adminShell(`<p class="eyebrow">BUSINESS INTELLIGENCE</p><h1>Reports</h1><section class="panel"><label>From<input type="date" id="from"></label><label>To<input type="date" id="to"></label><button id="run" class="btn">Generate report</button><button id="csv" class="btn outline">Export CSV</button><div id="report"></div></section>`);let rows=[];async function load(){let q=supabase.from('bookings').select('booking_reference,event_name,event_date,guest_count,status,estimated_total').order('event_date');if(document.querySelector('#from').value)q=q.gte('event_date',document.querySelector('#from').value);if(document.querySelector('#to').value)q=q.lte('event_date',document.querySelector('#to').value);const {data,error}=await q;rows=data||[];document.querySelector('#report').innerHTML=error?esc(error.message):`<h2>${rows.length} bookings · ${money(rows.reduce((s,r)=>s+Number(r.estimated_total||0),0))} estimated value</h2>${table(rows,['booking_reference','event_name','event_date','guest_count','status','estimated_total'])}`;}document.querySelector('#run').onclick=load;document.querySelector('#csv').onclick=()=>{const cols=['booking_reference','event_name','event_date','guest_count','status','estimated_total'];const csv=[cols.join(','),...rows.map(r=>cols.map(c=>JSON.stringify(r[c]??'')).join(','))].join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='jmfoodies-bookings.csv';a.click();URL.revokeObjectURL(a.href);};load();}
async function adminSettings(){if(!await requireAdmin())return;adminShell(`<p class="eyebrow">CONFIGURATION</p><h1>Business settings</h1><section class="panel"><p>Settings are stored in the <code>business_settings</code> table. This starter admin page provides a safe reminder of where to configure operational rules.</p><p>Set minimum guests on each package. Configure booking availability and cancellation rules in Supabase. Never expose secret keys in the browser.</p><a class="btn outline" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase dashboard</a></section>`);}

(async()=>{
  if(isAdminPage){
    ({
  dashboard: adminDashboard,
  bookings: adminBookings,
  packages: adminPackages,
  'food-management': adminFood,
  reports: adminReports,
  settings: adminSettings,
  'cancellation-requests': adminCancellationRequests
}[page] || adminDashboard)();
    return;
  }

  ({
    index:home,
    '':home,
    packages:packagesPage,
    booking:bookingPage,
    'track-booking':trackPage,
    account:accountPage,
    'my-bookings':myBookingsPage,
    notifications: notificationsPage,
    login:()=>authPage(false),
    register:()=>authPage(true)
  }[page]||home)();
})();

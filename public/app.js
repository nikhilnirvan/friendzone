/* ═══════════════════════════════════════════════════════════════════════════════
   FriendZone – Frontend SPA
   ══════════════════════════════════════════════════════════════════════════════ */

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  user: null,
  page: null,
  discover: { users: [], index: 0, filters: { ageMin: '', ageMax: '', location: '', interests: '' } },
  matches: [],
  chat: { matchId: null, messages: [], partner: null, lastTimestamp: null, pollTimer: null },
  swipe: { isDragging: false, startX: 0, startY: 0, currentX: 0, cardEl: null }
};

// ─── ALL AVAILABLE INTERESTS ──────────────────────────────────────────────────
const ALL_INTERESTS = [
  { emoji: '🏔️', label: 'Hiking'     }, { emoji: '☕', label: 'Coffee'      },
  { emoji: '✈️', label: 'Travel'      }, { emoji: '📸', label: 'Photography' },
  { emoji: '🎮', label: 'Gaming'      }, { emoji: '📚', label: 'Reading'     },
  { emoji: '🍜', label: 'Food'        }, { emoji: '🎵', label: 'Music'       },
  { emoji: '🎨', label: 'Art'         }, { emoji: '💻', label: 'Coding'      },
  { emoji: '🏋️', label: 'Gym'         }, { emoji: '🧘', label: 'Yoga'       },
  { emoji: '🚴', label: 'Cycling'     }, { emoji: '🎲', label: 'Board games' },
  { emoji: '🎬', label: 'Movies'      }, { emoji: '🌿', label: 'Nature'      },
  { emoji: '🍳', label: 'Cooking'     }, { emoji: '🏃', label: 'Running'     },
  { emoji: '🎭', label: 'Dancing'     }, { emoji: '🎤', label: 'Comedy'      },
  { emoji: '📝', label: 'Writing'     }, { emoji: '🧠', label: 'Tech'        },
  { emoji: '🌱', label: 'Sustainability' }, { emoji: '🏊', label: 'Swimming' },
  { emoji: '🎸', label: 'Guitar'      }, { emoji: '🧩', label: 'Puzzles'     },
  { emoji: '🐶', label: 'Pets'        }, { emoji: '🎪', label: 'Anime'       },
  { emoji: '🎙️', label: 'Podcasts'   }, { emoji: '🏛️', label: 'Architecture'},
];

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) {
    throw e;
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const tc = document.getElementById('toast-container');
  const t = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ', match: '🎉' };
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Close on backdrop click
document.getElementById('modal-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ─── ROUTER ───────────────────────────────────────────────────────────────────
const routes = {
  landing:  renderLanding,
  login:    () => renderAuth('login'),
  signup:   () => renderAuth('signup'),
  setup:    renderSetup,
  discover: renderDiscover,
  matches:  renderMatches,
  chat:     renderChat,
  profile:  renderProfilePage
};

async function navigate(page, params = {}) {
  stopChatPolling();
  state.page = page;

  const app = document.getElementById('app');
  app.innerHTML = '';

  if (page === 'chat') {
    state.chat.matchId = params.matchId;
    state.chat.partner = params.partner;
  }

  const renderer = routes[page];
  if (renderer) await renderer(params);
}

// ─── AUTH CHECK ───────────────────────────────────────────────────────────────
async function init() {
  await new Promise(r => setTimeout(r, 900)); // let splash play
  try {
    state.user = await api('GET', '/api/auth/me');
    if (state.user.profile_complete) navigate('discover');
    else navigate('setup');
  } catch {
    navigate('landing');
  }
}

// ─── ═══════════════════════════════════════
//     LANDING PAGE
// ─── ═══════════════════════════════════════
function renderLanding() {
  document.getElementById('app').innerHTML = `
    <div class="landing page">
      <header class="landing-header">
        <div class="brand"><div class="brand-dot"></div>FriendZone</div>
        <button class="btn btn-ghost" style="color:rgba(255,255,255,.7);font-size:.9rem;" onclick="navigate('login')">Sign in</button>
      </header>

      <main class="landing-hero">
        <div class="hero-cards">
          <div class="hero-card hero-card-1">
            <div class="hero-card-avatar"></div>
            <div class="hero-card-lines"><div class="hero-card-line1"></div><div class="hero-card-line2"></div></div>
          </div>
          <div class="hero-card hero-card-2">
            <div class="hero-card-avatar"></div>
            <div class="hero-card-lines"><div class="hero-card-line1"></div><div class="hero-card-line2"></div></div>
          </div>
          <div class="hero-card hero-card-3">
            <div class="hero-card-avatar"></div>
            <div class="hero-card-lines"><div class="hero-card-line1"></div><div class="hero-card-line2"></div></div>
          </div>
        </div>

        <div class="hero-text">
          <h1>Find your<br><em>people</em> 🙌</h1>
          <p>Discover friends who share your passions. Match, chat, and create memories together.</p>
        </div>

        <div class="hero-cta">
          <button class="btn btn-primary btn-lg btn-full" onclick="navigate('signup')">Get Started — It's Free</button>
          <button class="btn btn-secondary btn-full" style="background:rgba(255,255,255,.08);color:white;border-color:rgba(255,255,255,.15);" onclick="navigate('login')">Already have an account?</button>
        </div>
      </main>

      <footer class="landing-stats">
        <div class="stat-item"><div class="stat-num">10K+</div><div class="stat-label">Friends Made</div></div>
        <div class="stat-item"><div class="stat-num">50+</div><div class="stat-label">Interests</div></div>
        <div class="stat-item"><div class="stat-num">4.9★</div><div class="stat-label">Rating</div></div>
      </footer>
    </div>
  `;
}

// ─── ═══════════════════════════════════════
//     AUTH PAGES
// ─── ═══════════════════════════════════════
function renderAuth(mode) {
  const isLogin = mode === 'login';
  document.getElementById('app').innerHTML = `
    <div class="auth-page page">
      <div class="auth-top">
        <button class="back-btn" onclick="navigate('landing')">←</button>
        <div class="brand" style="color:white"><div class="brand-dot"></div>FriendZone</div>
      </div>
      <div class="auth-card">
        <h2 class="auth-title">${isLogin ? 'Welcome back!' : 'Join FriendZone'}</h2>
        <p class="auth-subtitle">${isLogin ? 'Sign in to reconnect with friends.' : 'Create your account and find your people.'}</p>

        <div id="auth-error" class="form-error mb-16 hidden"></div>

        <form class="auth-form" onsubmit="handleAuth(event,'${mode}')">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input id="auth-email" type="email" class="form-input" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input id="auth-password" type="password" class="form-input" placeholder="${isLogin ? '••••••••' : 'At least 6 characters'}" required autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="auth-submit">
            ${isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        ${isLogin ? `
        <div class="auth-divider">or</div>
        <button class="btn btn-secondary btn-full" onclick="demoLogin()" style="border-color:var(--gold);color:var(--gold-dark);">
          🎭 Try Demo Account
        </button>` : ''}

        <p class="auth-switch mt-16">
          ${isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span class="auth-link" onclick="navigate('${isLogin ? 'signup' : 'login'}')">
            ${isLogin ? 'Sign up free' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  `;

  setTimeout(() => document.getElementById('auth-email')?.focus(), 200);
}

async function handleAuth(e, mode) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit');

  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';

  try {
    const data = await api('POST', `/api/auth/${mode}`, { email, password });
    state.user = await api('GET', '/api/auth/me');
    toast(mode === 'login' ? 'Welcome back! 👋' : 'Account created! 🎉', 'success');
    if (mode === 'signup' || !state.user.profile_complete) navigate('setup');
    else navigate('discover');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  }
}

async function demoLogin() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Loading demo…';
  try {
    await api('POST', '/api/auth/login', { email: 'alex.chen@demo.com', password: 'demo123' });
    state.user = await api('GET', '/api/auth/me');
    toast('Welcome, Alex! 👋 This is a demo account.', 'success', 4000);
    navigate('discover');
  } catch {
    btn.disabled = false;
    btn.textContent = '🎭 Try Demo Account';
    toast('Demo login failed', 'error');
  }
}

// ─── ═══════════════════════════════════════
//     PROFILE SETUP
// ─── ═══════════════════════════════════════
function renderSetup() {
  const selectedInterests = new Set(state.user?.interests || []);

  document.getElementById('app').innerHTML = `
    <div class="setup-page page">
      <div class="setup-header">
        <div class="setup-step">
          <div class="step-dot active"></div>
          <div class="step-dot"></div>
          <div class="step-dot"></div>
        </div>
        <h2 class="setup-title">Build your profile</h2>
        <p class="setup-subtitle">Tell people a bit about yourself</p>
      </div>

      <div class="setup-body">
        <div id="setup-error" class="form-error hidden"></div>

        <div class="form-group">
          <label class="form-label">Your Name *</label>
          <input id="setup-name" type="text" class="form-input" placeholder="What do friends call you?" value="${state.user?.name || ''}" maxlength="50" />
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">Age</label>
            <input id="setup-age" type="number" class="form-input" placeholder="25" min="13" max="100" value="${state.user?.age || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Gender</label>
            <select id="setup-gender" class="form-select form-input">
              <option value="">Prefer not to say</option>
              <option value="Male" ${state.user?.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${state.user?.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Non-binary" ${state.user?.gender === 'Non-binary' ? 'selected' : ''}>Non-binary</option>
              <option value="Other" ${state.user?.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Location</label>
          <input id="setup-location" type="text" class="form-input" placeholder="City or region (e.g. Delhi)" value="${state.user?.location || ''}" maxlength="100" />
        </div>

        <div class="form-group">
          <label class="form-label">Bio</label>
          <textarea id="setup-bio" class="form-textarea" placeholder="Tell people about yourself – what do you love, what are you looking for in a friendship?" maxlength="300">${state.user?.bio || ''}</textarea>
          <span class="form-hint" id="bio-count">0 / 300</span>
        </div>

        <div class="form-group">
          <label class="form-label">Interests</label>
          <p class="form-hint mb-8">Pick up to 10 things you're into</p>
          <div class="interests-grid" id="interests-grid">
            ${ALL_INTERESTS.map(i => `
              <button type="button" class="interest-tag ${selectedInterests.has(i.label) ? 'selected' : ''}"
                data-label="${i.label}" onclick="toggleInterest(this, '${i.label}')">
                ${i.emoji} ${i.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div id="setup-selected" class="hidden">
          <p class="form-hint"><span id="interests-count">0</span> interests selected</p>
        </div>

        <button class="btn btn-primary btn-full btn-lg" onclick="saveProfile()" id="setup-save">
          Save Profile →
        </button>

        <button class="btn btn-ghost btn-full text-muted text-sm" onclick="logout()">Sign out</button>
      </div>
    </div>
  `;

  // Bio char counter
  const bio = document.getElementById('setup-bio');
  const counter = document.getElementById('bio-count');
  counter.textContent = `${bio.value.length} / 300`;
  bio.addEventListener('input', () => counter.textContent = `${bio.value.length} / 300`);

  updateInterestCount();
}

function toggleInterest(btn, label) {
  const selected = document.querySelectorAll('.interest-tag.selected');
  if (!btn.classList.contains('selected') && selected.length >= 10) {
    toast('Maximum 10 interests', 'info', 2000); return;
  }
  btn.classList.toggle('selected');
  updateInterestCount();
}

function updateInterestCount() {
  const count = document.querySelectorAll('.interest-tag.selected').length;
  const el = document.getElementById('interests-count');
  if (el) el.textContent = count;
  const div = document.getElementById('setup-selected');
  if (div) div.classList.toggle('hidden', count === 0);
}

async function saveProfile() {
  const name = document.getElementById('setup-name').value.trim();
  const age = document.getElementById('setup-age').value;
  const gender = document.getElementById('setup-gender').value;
  const location = document.getElementById('setup-location').value.trim();
  const bio = document.getElementById('setup-bio').value.trim();
  const interests = [...document.querySelectorAll('.interest-tag.selected')].map(b => b.dataset.label);

  const errEl = document.getElementById('setup-error');
  const btn = document.getElementById('setup-save');

  errEl.classList.add('hidden');
  if (!name) { errEl.textContent = 'Name is required'; errEl.classList.remove('hidden'); return; }

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await api('PUT', '/api/profile', { name, age: age ? parseInt(age) : null, gender, location, bio, interests });
    state.user = await api('GET', '/api/auth/me');
    toast('Profile saved! 🎉', 'success');
    navigate('discover');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Save Profile →';
  }
}

// ─── ═══════════════════════════════════════
//     DISCOVER PAGE
// ─── ═══════════════════════════════════════
async function renderDiscover() {
  document.getElementById('app').innerHTML = `
    <div class="discover-page page-with-nav">
      <div class="discover-header">
        <h2 class="discover-title">Discover 🔍</h2>
        <button class="filter-btn" id="filter-toggle" onclick="openFilters()" title="Filters">⚙️</button>
      </div>
      <div class="card-stack-area" id="card-stack-area">
        <div class="card-stack" id="card-stack">
          <div class="empty-state"><span class="empty-icon">⏳</span><p>Loading people near you…</p></div>
        </div>
      </div>
      <div class="action-buttons" id="action-buttons">
        <button class="action-btn btn-skip" onclick="swipeAction('skip')" title="Skip">✕</button>
        <button class="action-btn btn-like" onclick="swipeAction('like')" title="Like">❤️</button>
        <button class="action-btn btn-super" onclick="swipeAction('super')" title="Super Like">⭐</button>
      </div>
    </div>
    ${renderBottomNav('discover')}
  `;

  await loadDiscoverUsers();
}

async function loadDiscoverUsers() {
  const f = state.discover.filters;
  const params = new URLSearchParams();
  if (f.ageMin)    params.append('ageMin', f.ageMin);
  if (f.ageMax)    params.append('ageMax', f.ageMax);
  if (f.location)  params.append('location', f.location);
  if (f.interests) params.append('interests', f.interests);

  try {
    state.discover.users = await api('GET', `/api/discover?${params}`);
    state.discover.index = 0;
    renderCardStack();
  } catch {
    renderEmptyStack('Could not load profiles. Try again later.');
  }
}

function renderCardStack() {
  const stack = document.getElementById('card-stack');
  if (!stack) return;

  const users = state.discover.users;
  const idx = state.discover.index;
  const remaining = users.slice(idx, idx + 3);

  if (remaining.length === 0) {
    renderEmptyStack("You've seen everyone for now! Check back later or adjust your filters. 🌟");
    return;
  }

  stack.innerHTML = remaining.reverse().map((user, i) => {
    const isTop = i === remaining.length - 1;
    return renderSwipeCard(user, isTop);
  }).join('');

  if (remaining.length > 0) {
    const topCard = stack.querySelector('.swipe-card:last-child');
    if (topCard) attachSwipeHandlers(topCard, remaining[remaining.length - 1]);
  }
}

function renderSwipeCard(user, isTop) {
  const initials = (user.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const interests = (user.interests || []).slice(0, 4);
  const bio = user.bio || 'Hey! I\'m on FriendZone looking for cool people to hang out with. 😊';

  return `
    <div class="swipe-card" data-id="${user.id}">
      <div class="card-banner" style="background: linear-gradient(135deg, ${user.avatar_color}dd, ${user.avatar_color}88)">
        <div class="card-banner-pattern"></div>
        <div class="card-avatar-wrapper">
          <div class="avatar avatar-xl" style="background:${user.avatar_color};border:4px solid rgba(255,255,255,.3)">${initials}</div>
          ${user.location ? `<div class="card-location-badge">📍 ${user.location}</div>` : ''}
        </div>
      </div>
      <div class="swipe-overlay swipe-overlay-like" id="overlay-like-${user.id}">
        <div class="overlay-label">FRIEND 👋</div>
      </div>
      <div class="swipe-overlay swipe-overlay-skip" id="overlay-skip-${user.id}">
        <div class="overlay-label">PASS ✕</div>
      </div>
      <div class="card-body">
        <div class="card-name-row">
          <span class="card-name">${escapeHtml(user.name)}</span>
          ${user.age ? `<span class="card-age">${user.age}</span>` : ''}
          ${user.gender ? `<span class="card-age">• ${user.gender}</span>` : ''}
        </div>
        <p class="card-bio">${escapeHtml(bio)}</p>
        <div class="card-interests">
          ${interests.map(i => {
            const found = ALL_INTERESTS.find(ai => ai.label.toLowerCase() === i.toLowerCase());
            return `<span class="tag-small">${found ? found.emoji + ' ' : ''}${escapeHtml(i)}</span>`;
          }).join('')}
          ${user.interests?.length > 4 ? `<span class="tag-small" style="background:var(--gray-100);color:var(--gray-600)">+${user.interests.length - 4}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderEmptyStack(msg) {
  const stack = document.getElementById('card-stack');
  if (!stack) return;
  stack.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">🌙</span>
      <h3 class="empty-title">All caught up!</h3>
      <p class="empty-text">${msg}</p>
      <button class="btn btn-primary mt-24" onclick="loadDiscoverUsers()">Refresh</button>
    </div>
  `;
}

// ─── SWIPE LOGIC ─────────────────────────────────────────────────────────────
function attachSwipeHandlers(card, user) {
  // Mouse
  card.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY, card));
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', e => endDrag(e.clientX, user));

  // Touch
  card.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY, card); }, { passive: false });
  card.addEventListener('touchmove', e => { e.preventDefault(); onDrag(e.touches[0]); }, { passive: false });
  card.addEventListener('touchend', e => endDrag(e.changedTouches[0].clientX, user));
}

function startDrag(x, y, card) {
  state.swipe = { isDragging: true, startX: x, startY: y, currentX: x, cardEl: card };
  card.style.transition = 'none';
}

function onDrag(e) {
  if (!state.swipe.isDragging || !state.swipe.cardEl) return;
  const dx = e.clientX - state.swipe.startX;
  const dy = e.clientY - state.swipe.startY;
  const rotate = dx * 0.08;
  state.swipe.cardEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;

  // Show overlays
  const card = state.swipe.cardEl;
  const userId = card.dataset.id;
  const likeOverlay = card.querySelector('.swipe-overlay-like');
  const skipOverlay = card.querySelector('.swipe-overlay-skip');
  const threshold = 60;

  if (dx > threshold) {
    likeOverlay.style.opacity = Math.min((dx - threshold) / 80, 1);
    skipOverlay.style.opacity = 0;
  } else if (dx < -threshold) {
    skipOverlay.style.opacity = Math.min((-dx - threshold) / 80, 1);
    likeOverlay.style.opacity = 0;
  } else {
    likeOverlay.style.opacity = 0;
    skipOverlay.style.opacity = 0;
  }
}

function endDrag(finalX, user) {
  if (!state.swipe.isDragging || !state.swipe.cardEl) return;
  const dx = finalX - state.swipe.startX;
  const card = state.swipe.cardEl;
  state.swipe.isDragging = false;
  state.swipe.cardEl = null;

  card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease';

  const THRESHOLD = 100;
  if (dx > THRESHOLD) {
    card.style.transform = `translate(150vw, ${(Math.random() - 0.5) * 200}px) rotate(${20 + Math.random() * 10}deg)`;
    card.style.opacity = '0';
    setTimeout(() => performLike(user), 200);
  } else if (dx < -THRESHOLD) {
    card.style.transform = `translate(-150vw, ${(Math.random() - 0.5) * 200}px) rotate(${-(20 + Math.random() * 10)}deg)`;
    card.style.opacity = '0';
    setTimeout(() => advanceCard(), 200);
  } else {
    card.style.transform = '';
    card.querySelector('.swipe-overlay-like').style.opacity = 0;
    card.querySelector('.swipe-overlay-skip').style.opacity = 0;
  }
}

async function swipeAction(action) {
  const users = state.discover.users;
  const idx = state.discover.index;
  if (idx >= users.length) return;

  const user = users[idx];
  const stack = document.getElementById('card-stack');
  const topCard = stack?.querySelector('.swipe-card:last-child');

  if (!topCard) return;

  topCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease';

  if (action === 'like' || action === 'super') {
    topCard.style.transform = `translate(150vw, -60px) rotate(20deg)`;
    topCard.style.opacity = '0';
    setTimeout(() => performLike(user), 200);
  } else {
    topCard.style.transform = `translate(-150vw, -60px) rotate(-20deg)`;
    topCard.style.opacity = '0';
    setTimeout(() => advanceCard(), 200);
  }
}

async function performLike(user) {
  try {
    const result = await api('POST', '/api/likes', { toUserId: user.id });
    if (result.match) {
      showMatchCelebration(user);
    }
  } catch (e) {
    // silently continue
  }
  advanceCard();
}

function advanceCard() {
  state.discover.index++;
  renderCardStack();
}

function showMatchCelebration(user) {
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  openModal(`
    <div class="match-celebration">
      <span class="match-celebration-emoji">🎉</span>
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:20px">
        <div class="avatar avatar-lg" style="background:${state.user.avatar_color};border:3px solid var(--coral)">
          ${(state.user.name || '?')[0].toUpperCase()}
        </div>
        <div style="display:flex;align-items:center;font-size:1.5rem">💫</div>
        <div class="avatar avatar-lg" style="background:${user.avatar_color};border:3px solid var(--coral)">
          ${initials}
        </div>
      </div>
      <h3>It's a Match!</h3>
      <p>You and <strong>${escapeHtml(user.name)}</strong> both liked each other. Start a conversation!</p>
      <div class="match-celebration-btns">
        <button class="btn btn-primary btn-full" onclick="closeModal();navigate('matches')">💬 Start chatting</button>
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Keep discovering</button>
      </div>
    </div>
  `);
  toast(`You matched with ${user.name}! 🎉`, 'match', 4000);
}

// ─── FILTER PANEL ─────────────────────────────────────────────────────────────
function openFilters() {
  const f = state.discover.filters;
  openModal(`
    <div class="filter-panel">
      <h3 class="filter-title">Filter People</h3>
      <div class="filter-form">
        <div class="form-group">
          <label class="form-label">Age Range</label>
          <div class="age-range">
            <input id="f-age-min" type="number" class="form-input" placeholder="Min" min="13" max="100" value="${f.ageMin}" />
            <input id="f-age-max" type="number" class="form-input" placeholder="Max" min="13" max="100" value="${f.ageMax}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <input id="f-location" type="text" class="form-input" placeholder="City or region" value="${f.location}" />
        </div>
        <div class="form-group">
          <label class="form-label">Interests (comma-separated)</label>
          <input id="f-interests" type="text" class="form-input" placeholder="e.g. hiking, gaming, coffee" value="${f.interests}" />
        </div>
        <button class="btn btn-primary btn-full" onclick="applyFilters()">Apply Filters</button>
        <button class="btn btn-ghost btn-full" onclick="clearFilters()">Clear All</button>
      </div>
    </div>
  `);
}

async function applyFilters() {
  state.discover.filters = {
    ageMin:    document.getElementById('f-age-min').value,
    ageMax:    document.getElementById('f-age-max').value,
    location:  document.getElementById('f-location').value.trim(),
    interests: document.getElementById('f-interests').value.trim()
  };
  closeModal();
  const hasFilters = Object.values(state.discover.filters).some(v => v);
  const btn = document.getElementById('filter-toggle');
  if (btn) btn.classList.toggle('active', hasFilters);
  await loadDiscoverUsers();
  toast('Filters applied!', 'success', 2000);
}

async function clearFilters() {
  state.discover.filters = { ageMin: '', ageMax: '', location: '', interests: '' };
  closeModal();
  const btn = document.getElementById('filter-toggle');
  if (btn) btn.classList.remove('active');
  await loadDiscoverUsers();
}

// ─── ═══════════════════════════════════════
//     MATCHES PAGE
// ─── ═══════════════════════════════════════
async function renderMatches() {
  document.getElementById('app').innerHTML = `
    <div class="matches-page page-with-nav">
      <div class="page-header">
        <h2 class="page-header-title">My Matches ❤️</h2>
        <p class="page-header-sub">Connect with people who liked you back</p>
      </div>
      <div id="matches-content" style="padding:20px;text-align:center;color:var(--text-muted)">
        Loading matches…
      </div>
    </div>
    ${renderBottomNav('matches')}
  `;

  try {
    state.matches = await api('GET', '/api/matches');
    renderMatchesList();
  } catch {
    document.getElementById('matches-content').innerHTML = '<p>Failed to load matches. Please try again.</p>';
  }
}

function renderMatchesList() {
  const el = document.getElementById('matches-content');
  if (!el) return;

  if (state.matches.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:60px 20px">
        <span class="empty-icon">💫</span>
        <h3 class="empty-title">No matches yet</h3>
        <p class="empty-text">Keep discovering! When someone likes you back, they'll appear here.</p>
        <button class="btn btn-primary mt-24" onclick="navigate('discover')">Start Discovering</button>
      </div>
    `;
    return;
  }

  el.innerHTML = `<div class="matches-list">${state.matches.map(m => renderMatchCard(m)).join('')}</div>`;
}

function renderMatchCard(match) {
  const u = match.user;
  const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const timeStr = match.lastMessageTime ? formatTime(match.lastMessageTime) : formatTime(match.matchedAt);
  const preview = match.lastMessage || '💌 You matched! Say hello…';
  const isNew = !match.lastMessage;

  return `
    <div class="match-card" onclick="openChat('${match.matchId}', '${escapeHtml(JSON.stringify(u))}')">
      <div class="avatar avatar-md" style="background:${u.avatarColor}">${initials}</div>
      <div class="match-card-info">
        <div class="match-card-name">${escapeHtml(u.name)}${u.age ? `, ${u.age}` : ''}</div>
        <div class="match-card-preview">${escapeHtml(preview)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span class="match-card-time">${timeStr}</span>
        ${isNew ? '<span class="match-new-badge">New!</span>' : ''}
      </div>
    </div>
  `;
}

function openChat(matchId, userJson) {
  try {
    const partner = JSON.parse(userJson);
    navigate('chat', { matchId, partner });
  } catch {
    toast('Could not open chat', 'error');
  }
}

// ─── ═══════════════════════════════════════
//     CHAT PAGE
// ─── ═══════════════════════════════════════
async function renderChat() {
  const { matchId, partner } = state.chat;
  if (!matchId || !partner) { navigate('matches'); return; }

  const initials = partner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  document.getElementById('app').innerHTML = `
    <div class="chat-page page">
      <div class="chat-header">
        <button class="chat-header-back" onclick="navigate('matches')">←</button>
        <div class="avatar avatar-sm" style="background:${partner.avatarColor};flex-shrink:0">${initials}</div>
        <div class="chat-header-info">
          <div class="chat-header-name">${escapeHtml(partner.name)}</div>
          <div class="chat-header-status">Active now</div>
        </div>
        <button class="chat-header-menu" onclick="openChatMenu('${partner.id}', '${escapeHtml(partner.name)}')">⋯</button>
      </div>

      <div class="chat-messages" id="chat-messages">
        <div class="chat-connecting">Loading messages…</div>
      </div>

      <div class="chat-input-area">
        <textarea id="chat-input" class="chat-input" rows="1" placeholder="Write a message…" maxlength="1000"
          onkeydown="handleChatKey(event)" oninput="autoResizeInput(this)"></textarea>
        <button class="chat-send-btn" id="chat-send" onclick="sendMessage()">➤</button>
      </div>
    </div>
  `;

  await loadMessages();
  startChatPolling();
  setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
}

async function loadMessages(since = null) {
  const { matchId } = state.chat;
  if (!matchId) return;

  try {
    const url = since ? `/api/chats/${matchId}/messages?since=${encodeURIComponent(since)}` : `/api/chats/${matchId}/messages`;
    const msgs = await api('GET', url);

    if (since) {
      if (msgs.length > 0) {
        state.chat.messages.push(...msgs);
        state.chat.lastTimestamp = msgs[msgs.length - 1].timestamp;
        appendMessages(msgs);
      }
    } else {
      state.chat.messages = msgs;
      state.chat.lastTimestamp = msgs.length > 0 ? msgs[msgs.length - 1].timestamp : null;
      renderAllMessages();
    }
  } catch (e) {
    console.error('Load messages error:', e);
  }
}

function renderAllMessages() {
  const el = document.getElementById('chat-messages');
  if (!el) return;

  if (state.chat.messages.length === 0) {
    const p = state.chat.partner;
    el.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div class="avatar avatar-lg" style="background:${p.avatarColor};margin:0 auto 16px">${p.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
        <h4 style="font-family:Syne,sans-serif;margin-bottom:8px">You matched with ${escapeHtml(p.name)}!</h4>
        <p style="color:var(--text-muted);font-size:.9rem">Say hello and start your friendship 👋</p>
      </div>
    `;
    return;
  }

  el.innerHTML = state.chat.messages.map((msg, i) => {
    const isMe = msg.sender_id === state.user.id;
    const prevMsg = i > 0 ? state.chat.messages[i - 1] : null;
    const showDate = !prevMsg || !sameDay(prevMsg.timestamp, msg.timestamp);

    return `
      ${showDate ? `<div class="chat-date-divider"><span>${formatDate(msg.timestamp)}</span></div>` : ''}
      <div class="msg-row ${isMe ? 'mine' : 'theirs'}">
        <div class="msg-bubble">${escapeHtml(msg.text)}</div>
        <span class="msg-time">${formatTime(msg.timestamp)}</span>
      </div>
    `;
  }).join('');

  scrollToBottom();
}

function appendMessages(msgs) {
  const el = document.getElementById('chat-messages');
  if (!el) return;

  // Remove initial empty state if present
  const emptyState = el.querySelector('[style*="text-align:center"]');
  if (emptyState) el.innerHTML = '';

  msgs.forEach(msg => {
    const isMe = msg.sender_id === state.user.id;
    const div = document.createElement('div');
    div.className = `msg-row ${isMe ? 'mine' : 'theirs'}`;
    div.innerHTML = `<div class="msg-bubble">${escapeHtml(msg.text)}</div><span class="msg-time">${formatTime(msg.timestamp)}</span>`;
    el.appendChild(div);
  });

  scrollToBottom();
}

function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input?.value.trim();
  if (!text) return;

  const btn = document.getElementById('chat-send');
  btn.disabled = true;
  input.value = '';
  input.style.height = '';

  try {
    const msg = await api('POST', `/api/chats/${state.chat.matchId}/messages`, { text });
    state.chat.messages.push(msg);
    state.chat.lastTimestamp = msg.timestamp;

    const el = document.getElementById('chat-messages');
    if (el) {
      const emptyState = el.querySelector('[style*="text-align:center"]');
      if (emptyState) el.innerHTML = '';

      const div = document.createElement('div');
      div.className = 'msg-row mine';
      div.innerHTML = `<div class="msg-bubble">${escapeHtml(msg.text)}</div><span class="msg-time">${formatTime(msg.timestamp)}</span>`;
      el.appendChild(div);
      scrollToBottom();
    }
  } catch (err) {
    toast(err.message, 'error');
    input.value = text;
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function startChatPolling() {
  stopChatPolling();
  state.chat.pollTimer = setInterval(async () => {
    if (state.page === 'chat' && state.chat.matchId) {
      await loadMessages(state.chat.lastTimestamp);
    }
  }, 2500);
}

function stopChatPolling() {
  if (state.chat.pollTimer) {
    clearInterval(state.chat.pollTimer);
    state.chat.pollTimer = null;
  }
}

function openChatMenu(userId, userName) {
  openModal(`
    <div class="context-menu">
      <div class="context-item" onclick="closeModal();viewProfile('${userId}')">
        👤 View ${escapeHtml(userName)}'s Profile
      </div>
      <div class="context-item" onclick="closeModal();reportUser('${userId}', '${escapeHtml(userName)}')">
        🚩 Report ${escapeHtml(userName)}
      </div>
      <div class="context-item danger" onclick="closeModal();blockUser('${userId}', '${escapeHtml(userName)}')">
        🚫 Block ${escapeHtml(userName)}
      </div>
    </div>
  `);
}

// ─── ═══════════════════════════════════════
//     PROFILE PAGE
// ─── ═══════════════════════════════════════
async function renderProfilePage() {
  const u = state.user;
  if (!u) { navigate('login'); return; }

  let matchCount = 0;
  try {
    const m = await api('GET', '/api/matches');
    matchCount = m.length;
  } catch {}

  const initials = (u.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  document.getElementById('app').innerHTML = `
    <div class="profile-page page-with-nav">
      <div class="profile-hero">
        <div class="profile-hero-bg"></div>
        <div class="profile-avatar-area">
          <div class="profile-avatar-ring">
            <div class="avatar avatar-xxl" style="background:${u.avatar_color}">${initials}</div>
          </div>
        </div>
        <div class="profile-name">${escapeHtml(u.name || 'No name yet')}</div>
        ${u.location ? `<div class="profile-location">📍 ${escapeHtml(u.location)}</div>` : ''}
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-num">${matchCount}</div>
            <div class="profile-stat-label">Matches</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-num">${u.interests?.length || 0}</div>
            <div class="profile-stat-label">Interests</div>
          </div>
          ${u.age ? `<div class="profile-stat"><div class="profile-stat-num">${u.age}</div><div class="profile-stat-label">Age</div></div>` : ''}
        </div>
      </div>

      <div class="profile-body">
        <div class="profile-section">
          <div class="section-header">
            <span class="section-title">About Me</span>
            <span class="section-edit-btn" onclick="navigate('setup')">Edit ✏️</span>
          </div>
          <p style="color:var(--gray-600);font-size:.95rem;line-height:1.7">
            ${u.bio ? escapeHtml(u.bio) : '<em style="color:var(--text-muted)">No bio yet – add one to get more matches!</em>'}
          </p>
        </div>

        <div class="profile-section">
          <div class="section-header">
            <span class="section-title">Interests</span>
            <span class="section-edit-btn" onclick="navigate('setup')">Edit ✏️</span>
          </div>
          <div class="interests-grid">
            ${(u.interests || []).length > 0
              ? u.interests.map(i => {
                  const found = ALL_INTERESTS.find(ai => ai.label.toLowerCase() === i.toLowerCase());
                  return `<span class="interest-tag selected" style="cursor:default">${found ? found.emoji + ' ' : ''}${escapeHtml(i)}</span>`;
                }).join('')
              : '<em style="color:var(--text-muted);font-size:.9rem">No interests added yet</em>'}
          </div>
        </div>

        <div class="profile-section">
          <div class="section-header">
            <span class="section-title">Account</span>
          </div>
          <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">${escapeHtml(u.email)}</p>
          ${u.gender ? `<p class="pill pill-navy" style="display:inline-flex;margin-bottom:12px">${u.gender}</p>` : ''}
        </div>

        <button class="btn btn-secondary btn-full mt-8" onclick="navigate('setup')">
          ✏️ Edit Profile
        </button>
        <button class="btn btn-ghost btn-full mt-8" style="color:#EF4444" onclick="confirmLogout()">
          Sign Out
        </button>
      </div>
    </div>
    ${renderBottomNav('profile')}
  `;
}

// ─── BLOCK & REPORT ───────────────────────────────────────────────────────────
async function blockUser(userId, userName) {
  openModal(`
    <div style="text-align:center;padding:8px 0">
      <span style="font-size:2.5rem;display:block;margin-bottom:12px">🚫</span>
      <h3 style="font-family:Syne,sans-serif;margin-bottom:8px">Block ${escapeHtml(userName)}?</h3>
      <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:24px">They won't see your profile anymore and your match will be removed.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-full" style="background:#EF4444;color:white" onclick="doBlock('${userId}')">Yes, Block</button>
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `);
}

async function doBlock(userId) {
  try {
    await api('POST', `/api/users/${userId}/block`);
    closeModal();
    toast('User blocked', 'success');
    navigate('matches');
  } catch { toast('Failed to block user', 'error'); }
}

async function reportUser(userId, userName) {
  openModal(`
    <div>
      <h3 style="font-family:Syne,sans-serif;margin-bottom:16px">Report ${escapeHtml(userName)}</h3>
      <div class="form-group" style="margin-bottom:20px">
        <label class="form-label">Reason</label>
        <select id="report-reason" class="form-select form-input">
          <option value="spam">Spam or fake profile</option>
          <option value="inappropriate">Inappropriate content</option>
          <option value="harassment">Harassment</option>
          <option value="other">Other</option>
        </select>
      </div>
      <button class="btn btn-primary btn-full" onclick="doReport('${userId}')">Submit Report</button>
    </div>
  `);
}

async function doReport(userId) {
  const reason = document.getElementById('report-reason')?.value;
  try {
    await api('POST', `/api/users/${userId}/report`, { reason });
    closeModal();
    toast('Report submitted. We\'ll review it. 👍', 'success');
  } catch { toast('Failed to submit report', 'error'); }
}

function viewProfile(userId) {
  toast('Full profile view coming soon!', 'info');
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function renderBottomNav(active) {
  const items = [
    { id: 'discover', icon: '🔍', label: 'Discover', action: "navigate('discover')" },
    { id: 'matches',  icon: '❤️',  label: 'Matches',  action: "navigate('matches')"  },
    { id: 'profile',  icon: '👤',  label: 'Profile',  action: "navigate('profile')"  }
  ];

  return `
    <nav class="bottom-nav">
      ${items.map(item => `
        <div class="nav-item ${item.id === active ? 'active' : ''}" onclick="${item.action}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `).join('')}
    </nav>
  `;
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
async function logout() {
  try {
    await api('POST', '/api/auth/logout');
    state.user = null;
    state.discover = { users: [], index: 0, filters: { ageMin: '', ageMax: '', location: '', interests: '' } };
    navigate('landing');
  } catch { toast('Logout failed', 'error'); }
}

function confirmLogout() {
  openModal(`
    <div style="text-align:center;padding:8px 0">
      <span style="font-size:2.5rem;display:block;margin-bottom:12px">👋</span>
      <h3 style="font-family:Syne,sans-serif;margin-bottom:8px">Sign out?</h3>
      <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:24px">Your matches and messages will be waiting when you come back!</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-navy btn-full" onclick="closeModal();logout()">Sign Out</button>
        <button class="btn btn-ghost btn-full" onclick="closeModal()">Stay</button>
      </div>
    </div>
  `);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (sameDay(ts, now.toISOString())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 7 * 86400000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function formatDate(ts) {
  try {
    const d = new Date(ts);
    const now = new Date();
    if (sameDay(ts, now.toISOString())) return 'Today';
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (sameDay(ts, yesterday.toISOString())) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
  } catch { return ''; }
}

function sameDay(a, b) {
  try {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  } catch { return false; }
}

// ─── START ────────────────────────────────────────────────────────────────────
init();

const API_BASE = 'https://pose-suggester-production.up.railway.app/api';

let currentSetting = null;
let currentPeopleFilter = 'All';
let token = localStorage.getItem('poseToken');
let userName = localStorage.getItem('poseUserName');

const categoryView = document.getElementById('categoryView');
const poseView = document.getElementById('poseView');
const favoritesView = document.getElementById('favoritesView');
const settingsGrid = document.getElementById('settingsGrid');
const poseContainer = document.getElementById('poseContainer');
const favoritesContainer = document.getElementById('favoritesContainer');
const selectedSettingTitle = document.getElementById('selectedSettingTitle');
const searchBox = document.getElementById('searchBox');
const backBtn = document.getElementById('backBtn');
const backFromFavBtn = document.getElementById('backFromFavBtn');

const loginBtn = document.getElementById('loginBtn');
const favoritesBtn = document.getElementById('favoritesBtn');
const userGreeting = document.getElementById('userGreeting');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');

const settingIcons = {
  beach: '🏖️', cafe: '☕', 'city street': '🏙️', garden: '🌸',
  indoor: '🏠', mall: '🛍️', park: '🌳', river: '🏞️',
  street: '🚶', temple: '🛕', zoo: '🦁'
};

// ---------- AUTH UI STATE ----------
function updateAuthUI() {
  if (token) {
    loginBtn.classList.add('hidden');
    favoritesBtn.classList.remove('hidden');
    userGreeting.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    userGreeting.textContent = `Hi, ${userName}`;
  } else {
    loginBtn.classList.remove('hidden');
    favoritesBtn.classList.add('hidden');
    userGreeting.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}
updateAuthUI();

loginBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => authModal.classList.add('hidden'));

loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
});

signupTab.addEventListener('click', () => {
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { authError.textContent = data.error; return; }

    token = data.token;
    userName = data.user.name;
    localStorage.setItem('poseToken', token);
    localStorage.setItem('poseUserName', userName);
    authModal.classList.add('hidden');
    updateAuthUI();
  } catch (err) {
    authError.textContent = 'Could not connect to server.';
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) { authError.textContent = data.error; return; }

    token = data.token;
    userName = data.user.name;
    localStorage.setItem('poseToken', token);
    localStorage.setItem('poseUserName', userName);
    authModal.classList.add('hidden');
    updateAuthUI();
  } catch (err) {
    authError.textContent = 'Could not connect to server.';
  }
});

logoutBtn.addEventListener('click', () => {
  token = null;
  userName = null;
  localStorage.removeItem('poseToken');
  localStorage.removeItem('poseUserName');
  updateAuthUI();
});

// ---------- CATEGORY / SETTINGS ----------
async function loadSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  const settings = await res.json();
  renderSettingBoxes(settings);
}

function renderSettingBoxes(settings) {
  settingsGrid.innerHTML = settings.map(setting => `
    <div class="setting-box" data-setting="${setting}">
      <span class="setting-icon">${settingIcons[setting] || '📍'}</span>
      <h3>${setting}</h3>
    </div>
  `).join('');

  document.querySelectorAll('.setting-box').forEach(box => {
    box.addEventListener('click', () => openSetting(box.dataset.setting));
  });
}

async function openSetting(setting) {
  currentSetting = setting;
  currentPeopleFilter = 'All';

  categoryView.classList.add('hidden');
  favoritesView.classList.add('hidden');
  poseView.classList.remove('hidden');
  selectedSettingTitle.textContent = `${settingIcons[setting] || ''} ${setting}`;

  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector('.filter-tab[data-people="All"]').classList.add('active');

  await loadPoses();
}

async function loadPoses() {
  let url = `${API_BASE}/poses?setting=${encodeURIComponent(currentSetting)}`;
  if (currentPeopleFilter !== 'All') {
    url += `&people_count=${encodeURIComponent(currentPeopleFilter)}`;
  }
  const res = await fetch(url);
  const poses = await res.json();
  renderPoses(poses, poseContainer);
}

// ---------- RENDER POSES (with favorite heart) ----------
function renderPoses(poses, container) {
  if (poses.length === 0) {
    container.innerHTML = '<p class="empty-msg">No poses found.</p>';
    return;
  }

  container.innerHTML = poses.map(pose => `
    <div class="pose-card">
      <div class="pose-body">
        <div class="pose-top">
          <span class="tag">${pose.people_count || 'Alone'}</span>
          ${token ? `<button class="fav-btn" data-id="${pose.id}">🤍</button>` : ''}
        </div>
        <h3>${pose.outfit}</h3>
        <p>${pose.tip}</p>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn));
  });
}

async function toggleFavorite(btn) {
  const poseId = btn.dataset.id;
  const isFav = btn.textContent === '❤️';

  const method = isFav ? 'DELETE' : 'POST';
  await fetch(`${API_BASE}/favorites/${poseId}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  btn.textContent = isFav ? '🤍' : '❤️';
}

// ---------- FAVORITES VIEW ----------
favoritesBtn.addEventListener('click', async () => {
  categoryView.classList.add('hidden');
  poseView.classList.add('hidden');
  favoritesView.classList.remove('hidden');

  const res = await fetch(`${API_BASE}/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const favorites = await res.json();
  renderPoses(favorites, favoritesContainer);

  // saare fav buttons ko heart-filled dikhao kyunki ye already favorites hain
  document.querySelectorAll('#favoritesContainer .fav-btn').forEach(btn => {
    btn.textContent = '❤️';
  });
});

backFromFavBtn.addEventListener('click', () => {
  favoritesView.classList.add('hidden');
  categoryView.classList.remove('hidden');
});

// ---------- FILTER TABS ----------
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentPeopleFilter = tab.dataset.people;
    loadPoses();
  });
});

backBtn.addEventListener('click', () => {
  poseView.classList.add('hidden');
  categoryView.classList.remove('hidden');
  searchBox.value = '';
});

searchBox.addEventListener('input', async () => {
  const query = searchBox.value.toLowerCase();
  const res = await fetch(`${API_BASE}/settings`);
  const settings = await res.json();
  const filtered = settings.filter(s => s.toLowerCase().includes(query));
  renderSettingBoxes(filtered);
});

loadSettings();

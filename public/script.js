let currentView = 'grid';
let currentFilter = 'all';
let projectsData = [];
let isLoggedIn = false;

const catMeta = {
  all: {label:'All', cls:''},
  game: {label:'Game', cls:'tag-game'},
  school: {label:'School', cls:'tag-school'},
  personal: {label:'Personal', cls:'tag-personal'},
  tech: {label:'Tech', cls:'tag-tech'}
};

// Start application
window.onload = async () => {
    await checkAuthStatus();
    await fetchProjects();
};

// Check if user is an admin
async function checkAuthStatus() {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    isLoggedIn = data.isLoggedIn;
    
    document.getElementById('auth-btn').textContent = isLoggedIn ? 'Logout' : 'Login Admin';
    document.getElementById('add-project-btn').style.display = isLoggedIn ? 'inline-flex' : 'none';
    renderGallery();
}

// Fetch all data from server
async function fetchProjects() {
    const res = await fetch('/api/projects');
    projectsData = await res.json();
    buildFilters();
    renderGallery();
}

// Handle Login Button Click
function toggleAuth() {
    if (isLoggedIn) {
        fetch('/api/auth/logout', { method: 'POST' }).then(() => checkAuthStatus());
    } else {
        document.getElementById('login-modal').classList.add('open');
    }
}

// Submit the password
async function submitLogin() {
    const password = document.getElementById('inp-password').value;
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
        document.getElementById('login-modal').classList.remove('open');
        document.getElementById('inp-password').value = '';
        showToast('Logged in successfully!');
        checkAuthStatus();
    } else {
        alert('Wrong password!');
    }
}

// Upload a new project to the server
async function saveCard() {
    const title = document.getElementById('inp-title').value.trim();
    if (!title) return showToast('Please enter a title');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('desc', document.getElementById('inp-desc').value);
    formData.append('category', document.getElementById('inp-cat').value);
    formData.append('date', document.getElementById('inp-date').value);
    formData.append('pinned', document.getElementById('inp-pin').checked);
    
    const fileInput = document.getElementById('img-file');
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }

    const res = await fetch('/api/projects', {
        method: 'POST',
        body: formData
    });

    if (res.ok) {
        document.getElementById('add-modal').classList.remove('open');
        showToast('Project Saved!');
        fetchProjects(); // reload grid
    } else {
        showToast('Error saving project. Are you logged in?');
    }
}

// Delete from server
async function deleteCard(id) {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
        showToast('Deleted');
        fetchProjects(); // reload grid
    }
}

// Build category filters dynamically
function buildFilters() {
  const cats = ['all', ...new Set(projectsData.map(d => d.category))];
  const wrap = document.getElementById('filter-btns');
  wrap.innerHTML = cats.map(c => `
    <button class="filter-btn ${c === currentFilter ? 'active' : ''}" onclick="setFilter('${c}')">
      ${catMeta[c] ? catMeta[c].label : c}
    </button>
  `).join('');
}

function setFilter(cat) {
  currentFilter = cat;
  buildFilters();
  renderGallery();
}

function setView(v) {
  currentView = v;
  document.getElementById('gallery').className = 'gallery' + (v === 'list' ? ' list-view' : '');
  document.getElementById('grid-btn').classList.toggle('active', v === 'grid');
  document.getElementById('list-btn').classList.toggle('active', v === 'list');
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

// Draw the grid
function renderGallery() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const gallery = document.getElementById('gallery');

    let filtered = projectsData.filter(item => {
        const matchCat = currentFilter === 'all' || item.category === currentFilter;
        const matchQ = !query || item.title.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query);
        return matchCat && matchQ;
    });

    filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.date) - new Date(a.date);
    });

    if (filtered.length === 0) {
        gallery.innerHTML = `
          <div class="empty-state">
            <h3>No projects found</h3>
            <p>${query ? 'Try a different search term.' : 'Click "Add Infographic" to get started.'}</p>
          </div>`;
        updateStats();
        return;
    }

    gallery.innerHTML = filtered.map(item => `
        <div class="card">
            ${item.pinned ? '<div class="card-pin">Featured</div>' : ''}
            
            ${isLoggedIn ? `
            <div class="card-menu">
                <button class="card-menu-btn" onclick="document.getElementById('menu-${item.id}').classList.toggle('open')">...</button>
                <div class="dropdown" id="menu-${item.id}">
                    <button onclick="deleteCard('${item.id}')" style="color:#d96060">Delete</button>
                </div>
            </div>
            ` : ''}

            <div class="card-img-wrap">
                ${item.img 
                    ? `<img class="card-img" src="${item.img}" alt="${item.title}" loading="lazy">` 
                    : `<div class="card-img-placeholder"><span>No image</span></div>`}
            </div>
            <div class="card-body">
                <div class="card-tags">
                    <span class="tag ${catMeta[item.category]?.cls || ''}">${catMeta[item.category]?.label || item.category}</span>
                </div>
                <div class="card-title">${item.title}</div>
                <div class="card-desc">${item.desc}</div>
                <div class="card-meta">
                    <span class="card-date">${formatDate(item.date)}</span>
                </div>
            </div>
        </div>
    `).join('');

    updateStats();
}

function updateStats() {
    document.getElementById('total-count').textContent = projectsData.length;
    document.getElementById('cat-count').textContent = new Set(projectsData.map(d => d.category)).size;
    document.getElementById('pinned-count').textContent = projectsData.filter(d => d.pinned).length;
}

function openAddModal() { 
    document.getElementById('inp-title').value = '';
    document.getElementById('inp-desc').value = '';
    document.getElementById('inp-cat').value = 'game';
    document.getElementById('inp-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('inp-pin').checked = false;
    document.getElementById('img-file').value = '';
    document.getElementById('add-modal').classList.add('open'); 
}

function showToast(msg) { 
    const t = document.getElementById('toast'); 
    document.getElementById('toast-msg').textContent = msg; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 2500); 
}

// Close dropdowns if clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.card-menu')) {
    document.querySelectorAll('.dropdown.open').forEach(m => m.classList.remove('open'));
  }
});
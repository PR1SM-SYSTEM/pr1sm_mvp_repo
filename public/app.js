// app.js — v10

async function fetchJSON(url) {
  const sep = url.includes('?') ? '&' : '?';
  const r = await fetch(url + sep + 't=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching ' + url);
  return r.json();
}

/* ---------------------------- RENDERERS ---------------------------- */

function renderReddit(items) {
  // Match your HTML id
  const root = document.getElementById('reddit-grid');
  if (!root) return;
  root.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    root.innerHTML = '<p>No Reddit data available.</p>';
    return;
  }

  items.forEach(item => {
    const el = document.createElement('article');
    el.className = 'card';

    // Use item.image with robust fallbacks
    const imgSrc = item.image || 'https://picsum.photos/seed/pr1sm/1200/600';
    const title    = item.title || 'No title';
    const sub      = item.sub || 'Unknown';
    const ups      = item.ups != null ? Number(item.ups).toLocaleString() : '0';
    const permalink= item.permalink || '#';

    el.innerHTML = `
      <div class="media">
        <img src="${imgSrc}" alt="${title}" loading="lazy"
             onerror="this.onerror=null;this.src='fallback-image.jpg';" />
      </div>
      <div class="body">
        <div class="meta">
          <span class="chip">r/${sub}</span>
          <span>•</span>
          <span>↑ ${ups}</span>
        </div>
        <div class="title">${title}</div>
      </div>
      <div class="actions">
        <a class="btn" href="${permalink}" target="_blank" rel="noopener">Open</a>
        <a class="btn ghost" href="${permalink}#comment" target="_blank" rel="noopener">Comment</a>
      </div>
    `;
    root.appendChild(el);
  });
}

function renderYouTube(items) {
  const ul = document.getElementById('youtube-list');
  if (!ul) return;
  ul.innerHTML = '';
  (items || []).forEach(v => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${v.url}" target="_blank" rel="noopener"><span class="dot"></span>${v.title}</a>`;
    ul.appendChild(li);
  });
}

function renderTerms(items) {
  const box = document.getElementById('trending-list');
  if (!box) return;
  box.innerHTML = '';
  (items || []).forEach(t => {
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = `<span class="dot"></span>${t}`;
    box.appendChild(a);
  });
}

/* ----------------------------- LOADER ----------------------------- */

async function loadData() {
  try {
    const pack = await fetchJSON('/data/morning.json');
    window.__DATA = pack; // debug helper in DevTools

    // sanity log
    console.log('[PR1SM] morning.json', {
      updated_at: pack.updated_at,
      first: pack?.reddit_top?.[0]
    });

    renderReddit(pack.reddit_top || []);
    renderYouTube(pack.youtube_picks || []);
    renderTerms(pack.trending_terms || []);

    const ts = pack.updated_at ? new Date(pack.updated_at) : new Date();
    const updatedEl = document.getElementById('updatedAt');
    if (updatedEl) updatedEl.textContent = 'Last updated: ' + ts.toLocaleString();
  } catch (err) {
    console.error('[PR1SM] loadData error:', err);
  }
}

async function loadGreeting() {
  try {
    const g = await fetchJSON('/greeting');
    const el = document.getElementById('greeting');
    if (el && g?.text) el.textContent = g.text;
    return g.text || 'Good morning, Benedict.';
  } catch {
    return 'Good morning, Benedict.';
  }
}

async function speakGreeting() {
  const text = await loadGreeting();
  if (!('speechSynthesis' in window)) { alert(text); return; }
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1; utter.pitch = 1; utter.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/* ------------------------------ BOOT ------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadGreeting();

  document.getElementById('refreshBtn')?.addEventListener('click', loadData);
  document.getElementById('playBtn')?.addEventListener('click', speakGreeting);

  // optional server-side refresh endpoint
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    try { await fetch('/trigger-morning', { method: 'POST' }); } catch {}
  });
});


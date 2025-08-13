// app.js — v10

async function fetchJSON(url) {
  const sep = url.includes('?') ? '&' : '?';
  const r = await fetch(url + sep + 't=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching ' + url);
  return r.json();
}

/* ---------------- RENDERERS ---------------- */

function renderReddit(items) {
  const root = document.getElementById('reddit');
  root.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    root.innerHTML = '<p>No Reddit data available.</p>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement('article');
    el.className = 'card';

    const imgSrc    = item.image || '/fallback.jpg'; // put a tiny placeholder in /public if you like
    const title     = item.title || 'No title';
    const sub       = item.sub || 'Unknown';
    const ups       = item.ups != null ? Number(item.ups).toLocaleString() : '0';
    const permalink = item.permalink || '#';

    el.innerHTML = `
      <img class="thumb" src="${imgSrc}" alt="${title}">
      <div class="meta">
        <div class="title">${title}</div>
        <div class="sub">r/${sub} • ↑ ${ups}</div>
        <div class="actions">
          <a class="btn" href="${permalink}" target="_blank" rel="noopener">Open</a>
          <a class="btn" href="${permalink}#comment" target="_blank" rel="noopener">Comment</a>
        </div>
      </div>
    `;

    // robust image fallback for i.redd.it 403/deleted images
    const img = el.querySelector('img.thumb');
    img.addEventListener('error', () => {
      img.src = '/fallback.jpg'; // ensure you have this file in /public
      img.alt = 'Image unavailable';
    });

    root.appendChild(el);
  });
}

function renderYouTube(items) {
  const ul = document.getElementById('youtube');
  ul.innerHTML = '';
  (items || []).forEach((v) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${v.url}" target="_blank" rel="noopener"><span class="dot"></span>${v.title}</a>`;
    ul.appendChild(li);
  });
}

function renderTerms(items) {
  const ul = document.getElementById('terms');
  ul.innerHTML = '';
  (items || []).forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
}

/* ---------------- LOADERS ---------------- */

async function loadData() {
  try {
    const pack = await fetchJSON('/data/morning.json');
    window.__DATA = pack; // for quick inspection in DevTools

    console.log('[PR1SM] morning.json', {
      ok: true,
      updated_at: pack.updated_at,
      first: pack?.reddit_top?.[0]
    });

    renderReddit(pack.reddit_top || []);
    renderYouTube(pack.youtube_picks || []);
    renderTerms(pack.trending_terms || []);

    const ts = pack.updated_at ? new Date(pack.updated_at) : new Date();
    const updatedEl = document.getElementById('updated');
    if (updatedEl) updatedEl.textContent = 'Last updated: ' + ts.toLocaleString();
  } catch (err) {
    console.error('[PR1SM] loadData error:', err);
    const root = document.getElementById('reddit');
    if (root) root.innerHTML = `<p style="opacity:.7">Failed to load morning.json. Check console.</p>`;
  }
}

async function loadGreeting() {
  try {
    const g = await fetchJSON('/greeting');
    const el = document.getElementById('greetingText');
    if (el) el.textContent = g.text;
    return g.text;
  } catch {
    return 'Good morning, Benedict.';
  }
}

async function speakGreeting() {
  const text = await loadGreeting();
  if (!('speechSynthesis' in window)) { alert(text); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1; u.pitch = 1; u.lang = 'en-US';
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* ---------------- BOOT ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('refreshBtn')?.addEventListener('click', loadData);
  document.getElementById('playBtn')?.addEventListener('click', speakGreeting);
  loadGreeting();
});

// app.js  — v9

async function fetchJSON(url) {
  // add a cache-busting param for good measure
  const sep = url.includes('?') ? '&' : '?';
  const r = await fetch(url + sep + 't=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching ' + url);
  return r.json();
}

// ----- RENDERERS -------------------------------------------------------------
function renderReddit(items) {
  const root = document.getElementById('reddit');
  root.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    root.innerHTML = '<p>No Reddit data available.</p>';
    return;
  }

  items.forEach(item => {
    const el = document.createElement('article');
    el.className = 'card';

    const imgSrc   = item.image || 'fallback-image.jpg';
    const title    = item.title || 'No title';
    const sub      = item.sub || 'Unknown';
    const ups      = item.ups != null ? item.ups.toLocaleString() : '0';
    const permalink= item.permalink || '#';

    el.innerHTML = `
      <img src="${imgSrc}" alt="${title}"/>
      <div class="meta">
        <div class="title">${title}</div>
        <div class="sub">r/${sub} • ↑ ${ups}</div>
        <div class="actions">
          <a class="btn" href="${permalink}" target="_blank" rel="noopener">Open</a>
          <a class="btn" href="${permalink}#comment" target="_blank" rel="noopener">Comment</a>
        </div>
      </div>
    `;
    root.appendChild(el);
  });
}

function renderYouTube(items) {
  const ul = document.getElementById('youtube');
  ul.innerHTML = '';
  (items || []).forEach(v => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${v.url}" target="_blank" rel="noopener">${v.title}</a>`;
    ul.appendChild(li);
  });
}

function renderTerms(items) {
  const ul = document.getElementById('terms');
  ul.innerHTML = '';
  (items || []).forEach(t => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
}

// ----- LOADERS ---------------------------------------------------------------
async function loadData() {
  try {
    const pack = await fetchJSON('/data/morning.json');
    window.__DATA = pack; // debug helper

    // console sanity log (check sub names here)
    console.log('[PR1SM] loaded morning.json:', {
      updated_at: pack.updated_at,
      firstSub: pack?.reddit_top?.[0]?.sub,
      firstTitle: pack?.reddit_top?.[0]?.title
    });

    renderReddit(pack.reddit_top || []);
    renderYouTube(pack.youtube_picks || []);
    renderTerms(pack.trending_terms || []);

    const ts = pack.updated_at ? new Date(pack.updated_at) : new Date();
    const updatedEl = document.getElementById('updated');
    if (updatedEl) updatedEl.textContent = 'Last updated: ' + ts.toLocaleString();
  } catch (err) {
    console.error('[PR1SM] loadData error:', err);
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
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1; utter.pitch = 1; utter.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// ----- BOOT ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // make sure these IDs match your HTML
  document.getElementById('refreshBtn')?.addEventListener('click', loadData);
  document.getElementById('playBtn')?.addEventListener('click', speakGreeting);

  // optional: POST to refresh server-side cache if you have that route
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    try { await fetch('/trigger-morning', { method: 'POST' }); } catch {}
  });

  // prime greeting
  loadGreeting();
});

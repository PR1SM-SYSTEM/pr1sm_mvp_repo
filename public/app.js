async function fetchJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }

async function loadData() {
  try {
    const res = await fetch('/data/morning.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const data = await res.json();
    window.__DATA = data; // debug helper
    render(data);         // whatever your current render fn is called
  } catch (err) {
    console.error(err);
    // fall back to any built-in sample data if you keep one
    if (window.__FALLBACK_DATA) render(window.__FALLBACK_DATA);
  }
}

// call it on page load
loadData();

// optional: wire your “Refresh” button
document.getElementById('refreshBtn')?.addEventListener('click', loadData);


async function loadMorning(){
  const pack = await fetchJSON('/morning');
  renderReddit(pack.reddit_top || []);
  renderYouTube(pack.youtube_picks || []);
  renderTerms(pack.trending_terms || []);
  document.getElementById('updated').textContent = 'Last updated: ' + new Date(pack.updated_at).toLocaleString();
}

function renderReddit(items){

function renderReddit(items) {
  const root = document.getElementById('reddit');
  root.innerHTML = '';

  // Fallback in case items is undefined or empty
  if (!Array.isArray(items) || items.length === 0) {
    root.innerHTML = '<p>No Reddit data available.</p>';
    return;
  }

  items.forEach(item => {
    const el = document.createElement('article');
    el.className = 'card';

    // Use item.image with a safe fallback
    const imgSrc = item.image || 'fallback-image.jpg';
    const title = item.title || 'No title';
    const sub = item.sub || 'Unknown subreddit';
    const ups = item.ups != null ? item.ups.toLocaleString() : '0';
    const permalink = item.permalink || '#';

    el.innerHTML = `
      <img src="${imgSrc}" alt="${title}"/>
      <div class="meta">
        <div class="title">${title}</div>
        <div class="sub">r/${sub} ↑ ${ups}</div>
        <div class="actions">
          <a class="btn" href="${permalink}" target="_blank" rel="noopener">Open</a>
          <a class="btn" href="${permalink}#comment" target="_blank" rel="noopener">Comment</a>
        </div>
      </div>
    `;
    root.appendChild(el);
  });
}

  
  const root = document.getElementById('reddit'); root.innerHTML='';
  items.forEach(p=>{
    const el = document.createElement('article');
    el.className='card';
    el.innerHTML = `
      <img src="${p.image}" alt="${p.title}"/>
      <div class="meta">
        <div class="title">${p.title}</div>
        <div class="sub">r/${p.sub} • ⬆ ${p.ups.toLocaleString()}</div>
        <div class="actions">
          <a class="btn" href="${p.permalink}" target="_blank" rel="noopener">Open</a>
          <a class="btn" href="${p.permalink}#comment" target="_blank" rel="noopener">Comment</a>
        </div>
      </div>`;
    root.appendChild(el);
  });
}

function renderYouTube(items){
  const ul = document.getElementById('youtube'); ul.innerHTML='';
  items.forEach(v=>{
    const li=document.createElement('li');
    li.innerHTML = `<a href="${v.url}" target="_blank" rel="noopener">${v.title}</a>`;
    ul.appendChild(li);
  });
}

function renderTerms(items){
  const ul = document.getElementById('terms'); ul.innerHTML='';
  items.forEach(t=>{
    const li=document.createElement('li'); li.textContent=t; ul.appendChild(li);
  });
}

async function loadGreeting(){
  try{
    const g = await fetchJSON('/greeting');
    const el = document.getElementById('greetingText'); el.textContent = g.text;
    return g.text;
  }catch(e){
    return "Good morning, Benedict.";
  }
}

async function speakGreeting(){
  const text = await loadGreeting();
  if (!('speechSynthesis' in window)) { alert(text); return; }
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0; utter.pitch = 1.0; utter.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

document.getElementById('btnGreet').addEventListener('click', speakGreeting);
document.getElementById('btnRefresh').addEventListener('click', async()=>{
  await fetch('/trigger-morning', {method:'POST'});
  loadMorning();
});

loadGreeting();
loadMorning();

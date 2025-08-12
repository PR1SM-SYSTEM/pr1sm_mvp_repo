import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import os from 'os';

const CONFIG_PATH = path.join(path.resolve(), 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { reddit: { subs: ['memes'], limit: 3, timeframe: 'day' } };
  }
}

// Reddit: fetch top posts for one sub
async function fetchRedditTopForSub(sub, limit, tframe) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/top.json?limit=${limit}&t=${tframe}`;
  const r = await fetch(url, {
    headers: {
      // Be polite; Reddit prefers you set a UA
      'User-Agent': `pr1sm-mvp/1.0 (${os.platform()} ${os.release()})`
    }
  });
  if (!r.ok) throw new Error(`Reddit ${sub} HTTP ${r.status}`);
  const j = await r.json();

  // Map to our shape, picking an image if available
  return (j.data?.children || []).map(({ data }) => {
    let image = null;
    if (data.preview?.images?.[0]?.source?.url) {
      image = data.preview.images[0].source.url.replace(/&amp;/g, '&');
    } else if (data.thumbnail && data.thumbnail.startsWith('http')) {
      image = data.thumbnail;
    } else if (data.url_overridden_by_dest && /\.(jpg|jpeg|png|webp)$/i.test(data.url_overridden_by_dest)) {
      image = data.url_overridden_by_dest;
    }
    return {
      id: data.id,
      sub,
      title: data.title,
      image,
      permalink: `https://reddit.com${data.permalink}`,
      ups: data.ups ?? 0,
      over_18: !!data.over_18
    };
  });
}

// Build the morning pack using live Reddit (YouTube/terms still mocked for now)
async function buildMorningPack() {
  const cfg = loadConfig();
  const { subs, limit, timeframe } = cfg.reddit;
  let posts = [];
  for (const s of subs) {
    try {
      const items = await fetchRedditTopForSub(s, limit, timeframe);
      // keep only items with an image & not NSFW
      posts.push(...items.filter(x => x.image && !x.over_18));
    } catch (e) {
      console.error('Reddit fetch failed for', s, e.message);
    }
  }

  // Keep only first N overall if you want a hard cap (optional)
  const reddit_top = posts.slice(0, limit);

  const pack = JSON.parse(fs.readFileSync(path.join(path.resolve(), 'data', 'morning.json'), 'utf8'));
  pack.updated_at = new Date().toISOString();
  pack.reddit_top = reddit_top;

  fs.writeFileSync(path.join(path.resolve(), 'data', 'morning.json'), JSON.stringify(pack, null, 2));
  return pack;
}


const app = express();
app.use(express.json());
app.use(cors());

const __dirnameResolved = path.resolve();
app.use(express.static(path.join(__dirnameResolved, 'public')));

app.get('/health', (_, res) => res.json({ok:true}));

app.get('/morning', (req, res) => {
  const p = path.join(__dirnameResolved, 'data', 'morning.json');
  try {
    const raw = fs.readFileSync(p, 'utf8');
    res.setHeader('Cache-Control','no-store');
    res.type('application/json').send(raw);
  } catch (e) {
    res.status(500).json({error:'Cannot read morning pack', detail:String(e)});
  }
});

app.post('/trigger-morning', async (req, res) => {
  try {
    const pack = await buildMorningPack();
    res.json({ ok: true, updated_at: pack.updated_at, reddit_count: pack.reddit_top?.length || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Refresh failed', detail: String(e) });
  }
});

app.get('/greeting', (req, res) => {
  const name = process.env.PR1SM_USER || 'Benedict';
  const hour = new Date().getHours();
  const dayGreeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
  const line = `${dayGreeting}, ${name}. Here are your highlights for today.`;
  res.json({text: line});
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`PR1SM MVP listening on http://localhost:${port}`));
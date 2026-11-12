#!/usr/bin/env node
/*
 * Keeps the "Latest videos" slider in sync with Dr. Deepika's YouTube channel.
 *
 * 1. Refreshes videos.json from YouTube (official RSS feed first, the public
 *    channel page as a fallback). If YouTube can't be reached, the existing
 *    videos.json is kept — this script never fails the build.
 * 2. Writes the video cards (and VideoObject structured data for Google)
 *    into index.html between the <!-- yt-videos --> / <!-- yt-ld --> markers.
 *
 * Runs on every Netlify deploy (netlify.toml) and daily via
 * .github/workflows/update-videos.yml.
 *
 *   node scripts/build-videos.js            refresh + render
 *   node scripts/build-videos.js --offline  render from videos.json only
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'videos.json');
const PAGE = path.join(ROOT, 'index.html');
const MAX = 12;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; RidhimaFoundationSite/1.0)', 'Accept-Language': 'en' };

const offline = process.argv.includes('--offline');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const channelId = data.channel.id;

const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => String(s)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function get(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
        const res = await fetch(url, { headers: UA, signal: ctrl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

// --- Source 1: official RSS feed (latest 15 uploads, with dates) ---
async function fromRss() {
    const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
    if (!entries.length) throw new Error('feed has no entries');
    return entries.map((e) => ({
        id: (e.match(/<yt:videoId>([^<]+)</) || [])[1],
        title: unesc((e.match(/<title>([^<]*)<\/title>/) || [])[1] || ''),
        published: (e.match(/<published>([^<]+)</) || [])[1] || '',
        description: unesc((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '').slice(0, 300)
    })).filter((v) => v.id);
}

// --- Source 2: public channel "Videos" tab ---
async function fromChannelPage() {
    const html = await get(`https://www.youtube.com/channel/${channelId}/videos`);
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) throw new Error('channel page data not found');
    const found = [];
    (function walk(o) {
        if (Array.isArray(o)) return o.forEach(walk);
        if (!o || typeof o !== 'object') return;
        if (o.lockupViewModel) {
            const v = o.lockupViewModel;
            const title = v.metadata && v.metadata.lockupMetadataViewModel && v.metadata.lockupMetadataViewModel.title;
            if (v.contentId && title) found.push({ id: v.contentId, title: title.content });
        }
        if (o.videoRenderer && o.videoRenderer.videoId) {
            const r = o.videoRenderer;
            found.push({ id: r.videoId, title: (r.title.runs || []).map((x) => x.text).join('') });
        }
        Object.values(o).forEach(walk);
    })(JSON.parse(m[1]));
    if (!found.length) throw new Error('no videos on channel page');
    return found;
}

// Upload date + length for videos we haven't seen before
async function details(id) {
    const html = await get(`https://www.youtube.com/watch?v=${id}`);
    const pick = (re) => (html.match(re) || [])[1];
    const desc = pick(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    return {
        published: pick(/"uploadDate":"([^"]+)"/) || pick(/itemprop="uploadDate" content="([^"]+)"/) || '',
        seconds: parseInt(pick(/"lengthSeconds":"(\d+)"/) || '0', 10),
        description: desc ? JSON.parse('"' + desc + '"').slice(0, 300) : ''
    };
}

async function refresh() {
    let latest;
    try {
        latest = await fromRss();
        console.log(`build-videos: ${latest.length} videos from RSS feed`);
    } catch (e) {
        console.log(`build-videos: RSS unavailable (${e.message}), trying channel page`);
        latest = await fromChannelPage();
        console.log(`build-videos: ${latest.length} videos from channel page`);
    }
    const known = new Map(data.videos.map((v) => [v.id, v]));
    const merged = [];
    for (const v of latest.slice(0, MAX)) {
        const old = known.get(v.id) || {};
        const item = Object.assign({ seconds: 0, description: '' }, old, v);
        item.published = v.published || old.published || '';
        item.description = v.description || old.description || '';
        if (!item.published || !item.seconds) {
            try {
                Object.assign(item, Object.fromEntries(Object.entries(await details(v.id)).filter(([, x]) => x)));
            } catch (e) { /* keep what we have */ }
        }
        merged.push(item);
    }
    merged.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    data.videos = merged;
    fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const fmtLen = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');
const isoLen = (s) => `PT${Math.floor(s / 60)}M${s % 60}S`;

function renderCards(videos) {
    const pad = '                            ';
    return videos.map((v) => `${pad}<li class="vcard">
${pad}    <button type="button" class="vthumb" data-yt="${esc(v.id)}" data-title="${esc(v.title)}">
${pad}        <img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="${esc(v.title)}" width="480" height="360" loading="lazy" decoding="async">
${pad}        <span class="vplay" aria-hidden="true"><svg><use href="#i-play" /></svg></span>${v.seconds ? `
${pad}        <span class="vdur">${fmtLen(v.seconds)}</span>` : ''}
${pad}    </button>
${pad}    <h3><a href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a></h3>${v.published ? `
${pad}    <time datetime="${esc(v.published.slice(0, 10))}">${fmtDate(v.published)}</time>` : ''}
${pad}</li>`).join('\n');
}

function renderLd(videos) {
    const list = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Women\'s health videos by Dr. Deepika Singh',
        itemListElement: videos.filter((v) => v.published).map((v, i) => {
            const o = {
                '@type': 'VideoObject',
                name: v.title,
                description: v.description || v.title,
                thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                uploadDate: v.published,
                contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
                embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
                inLanguage: 'hi-IN',
                author: { '@id': 'https://ridhimafoundation.org/#deepika-singh' }
            };
            if (v.seconds) o.duration = isoLen(v.seconds);
            return { '@type': 'ListItem', position: i + 1, item: o };
        })
    };
    return '    <script type="application/ld+json">\n    ' +
        JSON.stringify(list, null, 4).replace(/\n/g, '\n    ') + '\n    </script>';
}

function between(html, name, body) {
    const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(\\s*<!-- ${name}:end -->)`);
    if (!re.test(html)) throw new Error(`build-videos: marker <!-- ${name}:start/end --> missing in index.html`);
    return html.replace(re, (m, a, b) => `${a}\n${body}${b}`);
}

(async () => {
    if (!offline && typeof fetch === 'function') {
        try {
            await refresh();
        } catch (e) {
            console.warn(`build-videos: could not refresh from YouTube (${e.message}); using saved videos.json`);
        }
    }
    const videos = data.videos.slice(0, MAX);
    const before = fs.readFileSync(PAGE, 'utf8');
    let html = between(before, 'yt-videos', renderCards(videos));
    html = between(html, 'yt-ld', renderLd(videos));
    if (html !== before) {
        fs.writeFileSync(PAGE, html);
        console.log(`build-videos: index.html updated (${videos.length} videos)`);
    } else {
        console.log(`build-videos: index.html already up to date (${videos.length} videos)`);
    }
})();

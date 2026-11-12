#!/usr/bin/env node
/*
 * Builds the Hindi version of the site at /hi/index.html from index.html.
 *
 * Runs on every Netlify deploy (see netlify.toml) so the Hindi page never goes
 * stale. No dependencies — plain Node.
 *
 * How it works: every visible text node and every alt / aria-label / placeholder /
 * title attribute in index.html is looked up in i18n/hi.json (English text ->
 * Hindi text, whitespace-normalised). Anything without a translation stays in
 * English and is listed at the end of the build log, so after editing
 * index.html just add the new lines to i18n/hi.json.
 *
 *   node scripts/build-hi.js           build, warn about missing translations
 *   node scripts/build-hi.js --strict  fail if anything is untranslated
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://ridhimafoundation.org';
const strict = process.argv.includes('--strict');

const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'hi.json'), 'utf8'));
const has = (k) => Object.prototype.hasOwnProperty.call(dict, k);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const missing = new Set();

// Text that legitimately stays as-is (emails, UPI IDs, numbers, brand acronyms)
const KEEP = /^(&[a-z]+;|[^A-Za-z]*|.*@.*|[A-Z0-9&;.,()\/+\-\s]{1,12}|UPI ID)$/;

function tr(text) {
    const key = norm(text);
    if (!key) return text;
    if (has(key)) {
        const lead = text.match(/^\s*/)[0];
        const trail = text.match(/\s*$/)[0];
        return lead + dict[key] + trail;
    }
    if (!KEEP.test(key)) missing.add(key);
    return text;
}

const TRANSLATE_ATTRS = /(\s(?:alt|aria-label|placeholder|title)=")([^"]*)(")/g;
const META_CONTENT = /^<meta\s[^>]*(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"/;
const RELATIVE_URL = /(\s(?:src|href)=")(?!https?:|\/|#|mailto:|tel:|upi:|data:|javascript:)([^"]+)"/g;

function translateTag(tag) {
    if (tag.startsWith('</') || tag.startsWith('<!')) return tag;
    let out = tag.replace(TRANSLATE_ATTRS, (m, a, v, b) => (v.trim() ? a + tr(v) + b : m));
    if (META_CONTENT.test(out)) {
        out = out.replace(/(\scontent=")([^"]*)(")/, (m, a, v, b) => a + tr(v) + b);
    }
    // /hi/index.html lives one folder down: make relative asset paths root-absolute
    return out.replace(RELATIVE_URL, (m, a, url) => a + '/' + url + '"');
}

function translateFaqJsonLd(script) {
    return script.replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/, (m, open, body, close) => {
        const data = JSON.parse(body);
        data.inLanguage = 'hi-IN';
        data.mainEntity.forEach((q) => {
            q.name = norm(tr(q.name));
            q.acceptedAnswer.text = norm(tr(q.acceptedAnswer.text));
        });
        return open + '\n    ' + JSON.stringify(data, null, 4).replace(/\n/g, '\n    ') + '\n    ' + close;
    });
}

function translateHtml(html) {
    const re = /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>|[^<]+/gi;
    let out = '';
    let m;
    while ((m = re.exec(html))) {
        const t = m[0];
        if (t.startsWith('<!--') || /^<style/i.test(t)) out += t;
        else if (/^<script/i.test(t)) out += /id="ld-faq"/.test(t) ? translateFaqJsonLd(t) : translateTag(t.slice(0, t.indexOf('>') + 1)) + t.slice(t.indexOf('>') + 1);
        else if (t.startsWith('<')) out += translateTag(t);
        else out += tr(t);
    }
    return out;
}

function replaceOnce(html, from, to) {
    const i = html.indexOf(from);
    if (i === -1) throw new Error('build-hi: expected snippet not found in index.html:\n  ' + from);
    return html.slice(0, i) + to + html.slice(i + from.length);
}

const waShareHi = 'https://wa.me/?text=' + encodeURIComponent(
    'रिधिमा फाउंडेशन दिल्ली एनसीआर में महिलाओं को निःशुल्क स्वास्थ्य सेवा देता है। कृपया उनका साथ दें: ' + SITE + '/hi/#donate');
const waReceiptHi = 'https://wa.me/918595954095?text=' + encodeURIComponent(
    'नमस्ते रिधिमा फाउंडेशन, मैंने दान किया है। कृपया मेरी 80G रसीद भेजें।\nनाम: \nPAN: \nपता: \nराशि: \nUPI ट्रांज़ैक्शन ID: \nडोनर वॉल पर मेरा नाम दिखाएँ (हाँ/नहीं): ');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// --- Page-level swaps (fail loudly if index.html changed shape) ---
html = replaceOnce(html, '<html lang="en">', '<html lang="hi">');
html = replaceOnce(html, `<link rel="canonical" href="${SITE}/">`, `<link rel="canonical" href="${SITE}/hi/">`);
html = replaceOnce(html, `<meta property="og:url" content="${SITE}/">`, `<meta property="og:url" content="${SITE}/hi/">`);
html = replaceOnce(html, '<meta property="og:locale" content="en_IN">', '<meta property="og:locale" content="hi_IN">');
html = replaceOnce(html, '<meta property="og:locale:alternate" content="hi_IN">', '<meta property="og:locale:alternate" content="en_IN">');
html = replaceOnce(html, '&family=Inter:wght@400;500;600;700&display=swap',
    '&family=Inter:wght@400;500;600;700&family=Mukta:wght@400;500;600;700&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap');
html = replaceOnce(html, 'href="/hi/" hreflang="hi" lang="hi" data-lang-switch', 'href="/" hreflang="en" lang="en" data-lang-switch');
html = replaceOnce(html, 'aria-label="हिंदी में पढ़ें (Read in Hindi)"', 'aria-label="Read in English (अंग्रेज़ी में पढ़ें)"');
html = replaceOnce(html, '<span>हिंदी</span>', '<span>English</span>');
html = html.replace(/href="https:\/\/wa\.me\/\?text=[^"]*"/g, `href="${waShareHi}"`);
html = html.replace(/href="https:\/\/wa\.me\/918595954095\?text=[^"]*"/g, `href="${waReceiptHi}"`);

html = translateHtml(html);
html = html.replace('<head>', '<head>\n    <!-- Generated by scripts/build-hi.js from index.html — do not edit by hand. -->');

fs.mkdirSync(path.join(ROOT, 'hi'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'hi', 'index.html'), html);

console.log(`build-hi: wrote hi/index.html (${Object.keys(dict).length} translations)`);
if (missing.size) {
    console.warn(`build-hi: ${missing.size} text(s) have no Hindi translation yet (shown in English). Add them to i18n/hi.json:`);
    missing.forEach((k) => console.warn('  ' + JSON.stringify(k)));
    if (strict) process.exit(1);
}

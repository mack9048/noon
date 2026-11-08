// Builds the Noon Learn website: src/pages/*.html + shared layout → dist/.
// Run: node website/build.mjs   (Vercel runs it as part of the build)
// The site is served from /site/* and mapped to clean URLs by vercel.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'dist');
const BASE = '/site'; // where the files live on the server

// Contact details shown on the site. Fill these in before launch.
const SITE = {
  phone: '[PHONE NUMBER]',
  whatsapp: '', // digits with country code, e.g. 9715XXXXXXXX — forms open WhatsApp when set, email otherwise
  email: 'hello@noonlearn.app',
  address: '[OFFICE ADDRESS]',
  appLogin: '/login',
  appStart: '/welcome',
  playStore: '#',
  appStore: '#',
};

const NAV = [
  ['home', 'Home', '/'],
  ['courses', 'Courses', null],
  ['resources', 'Resources', '/resources'],
  ['games', 'Games', '/games'],
  ['about', 'About Us', '/about'],
  ['contact', 'Contact', '/contact'],
];
const COURSES = [
  ['noon-courses', 'Noon Courses', 'Arabic, Thajweed, Fiqh & Seerah', '/courses/noon-courses'],
  ['madrasa-support', 'Madrasa Support', 'Class 1 – 10, +1, +2 lessons', '/courses/madrasa-support'],
  ['noon-buds', 'Noon Buds', 'First madrasa for age 4 – 6', '/courses/noon-buds'],
];

// Line icons (24×24, stroke) used across the site.
const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  sparkles: '<path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z"/><path d="M19 15v4M17 17h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6 6 0 0 0-3-5.2"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  book: '<path d="M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
  textbook: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  game: '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13.5" r="1" fill="currentColor"/>',
  puzzle: '<path d="M19.4 7.9c-.1.3.1.7.3.9l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.6 1.6a1 1 0 0 1-.8.3c-.5-.1-.8-.5-1-.9a2.5 2.5 0 1 0-3.2 3.2c.4.2.8.5.9 1a1 1 0 0 1-.3.8l-1.6 1.6a2.4 2.4 0 0 1-3.4 0l-1.6-1.6a1 1 0 0 0-.9-.3c-.5.1-.8.5-1 1a2.5 2.5 0 1 1-3.2-3.2c.5-.2.9-.5 1-1a1 1 0 0 0-.3-.9l-1.6-1.6a2.4 2.4 0 0 1 0-3.4L4.2 8.8c.2-.2.6-.4.9-.3.5.1.9.5 1.1 1a2.5 2.5 0 1 0 3.3-3.3c-.5-.2-.9-.6-1-1.1-.1-.3.1-.7.3-.9L10.3 2.7a2.4 2.4 0 0 1 3.4 0l1.6 1.6c.2.2.6.3.9.3.5-.1.8-.5 1-1a2.5 2.5 0 1 1 3.2 3.2c-.5.2-.9.6-1 1.1z"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  mobile: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  palette: '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M17.5 14v7M14 17.5h7"/>',
  numbers: '<path d="M4 9h2v8M4 17h4M11 9h3a2 2 0 0 1 0 4h-1a2 2 0 0 0-2 2v2h5M18 9h2a2 2 0 0 1 0 4 2 2 0 0 1 0 4h-2"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5a6 3 0 0 0 12 0v-5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  whatsapp: '<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] ?? ''}</svg>`;

const WAVE = (fill, flip = false) => `<svg class="${flip ? 'wave-top' : 'wave'}" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path fill="${fill}" d="${flip ? 'M0 0h1440v34C1180 90 920 2 640 30S180 86 0 40z' : 'M0 60C240 10 470 90 760 62S1220 4 1440 40v50H0z'}"/></svg>`;
const SPARKLE = (style) => `<svg class="sparkle" style="${style}" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFD84D" d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z"/></svg>`;

function header(active) {
  const links = NAV.map(([key, label, href]) => {
    if (key === 'courses') {
      const on = COURSES.some(([k]) => k === active);
      return `<li class="dd"><button class="dd-btn${on ? ' current' : ''}" aria-expanded="false" aria-haspopup="true">Courses ${icon('down')}</button>
        <ul class="dd-menu">${COURSES.map(([k, l, s, h]) => `<li><a href="${h}"${k === active ? ' aria-current="page"' : ''}><span>${l}<small>${s}</small></span></a></li>`).join('')}</ul></li>`;
    }
    return `<li><a href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('');
  const mobile = NAV.map(([key, label, href]) => key === 'courses'
    ? `<span style="padding:12px 10px 4px;color:#4F646C;font-size:13px;font-weight:700">COURSES</span>${COURSES.map(([, l, , h]) => `<a class="sub" href="${h}">${l}</a>`).join('')}`
    : `<a href="${href}">${label}</a>`).join('');
  return `<header class="site-header"><div class="container nav">
    <a class="logo" href="/" aria-label="Noon Learn home"><img src="${BASE}/img/logo.png" alt="Noon Learn" width="131" height="34"></a>
    <nav aria-label="Main"><ul class="nav-links">${links}</ul></nav>
    <div class="nav-cta"><a class="login" href="${SITE.appLogin}">Log in</a><a class="btn btn-yellow btn-sm" href="${SITE.appStart}">Start free ${icon('arrow')}</a>
    <button class="menu-btn" data-menu-open aria-controls="mobile-menu" aria-expanded="false" aria-label="Open menu">${icon('menu')}</button></div>
  </div></header>
  <div class="mobile-menu" id="mobile-menu" role="dialog" aria-label="Menu"><div class="panel">
    <button class="close" data-menu-close aria-label="Close menu">×</button>${mobile}
    <a class="btn btn-yellow" style="margin-top:12px" href="${SITE.appStart}">Start free</a><a class="btn btn-violet" style="margin-top:10px" href="${SITE.appLogin}">Log in</a>
  </div></div>`;
}

function footer() {
  return `<footer class="site-footer">${WAVE('#1B3A8C', true).replace('class="wave-top"', 'class="wave-top" style="transform:translateY(-69px)"')}
  <div class="container"><div class="foot">
    <div><a class="logo" href="/"><img src="${BASE}/img/logo.png" alt="Noon Learn" width="131" height="34"></a><p class="about">Islamic learning for children — made with love, care and good adab.</p></div>
    <div><h4>Learn</h4><ul><li><a href="/courses/madrasa-support">Madrasa Support</a></li><li><a href="/courses/noon-courses">Noon Courses</a></li><li><a href="/courses/noon-buds">Noon Buds</a></li><li><a href="/resources">Resources</a></li><li><a href="/games">Games</a></li></ul></div>
    <div><h4>For madrasas</h4><ul><li><a href="/courses/madrasa-support#madrasas">Pricing</a></li><li><a href="/courses/madrasa-support#madrasas">Admissions & fees</a></li><li><a href="${SITE.appLogin}">Teacher app</a></li><li><a href="/contact">Request a demo</a></li></ul></div>
    <div><h4>Contact</h4><ul class="contact"><li>${icon('phone')}${SITE.phone}</li><li>${icon('mail')}<a href="mailto:${SITE.email}">${SITE.email}</a></li><li>${icon('pin')}${SITE.address}</li></ul></div>
    <div class="owl"><img src="${BASE}/art/owl.svg" alt="" width="120" height="128"></div>
  </div>
  <div class="foot-bottom"><span>© <span data-year>2026</span> Noon Learn. All rights reserved.</span><span><a href="/contact">Privacy</a> · <a href="/contact">Terms</a> · <a href="/contact">Child safety</a></span></div></div></footer>`;
}

const CTA = ({ title, text, btn, href, art = 'nooni-wave' }) => `<section class="section" style="padding-top:20px"><div class="container"><div class="cta">
  <img src="${BASE}/art/${art}.svg" alt="" width="112" height="190"><div><h2>${title}</h2><p>${text}</p></div><a class="btn btn-navy" href="${href}">${btn} ${icon('arrow')}</a></div></div></section>`;

function render(raw) {
  return raw
    .replace(/\{\{icon:([a-z]+)(?::([\w-]+))?\}\}/g, (_, n, c) => icon(n, c ?? ''))
    .replace(/\{\{wave:([^}]+)\}\}/g, (_, f) => WAVE(f))
    .replace(/\{\{sparkle:([^}]+)\}\}/g, (_, s) => SPARKLE(s))
    .replace(/\{\{cta (\{[\s\S]*?\})\}\}/g, (_, j) => CTA(JSON.parse(j)))
    .replace(/\{\{art\}\}/g, `${BASE}/art`)
    .replace(/\{\{(start|login|email|phone|address|playStore|appStore|waLink|waLabel|tel)\}\}/g, (_, k) => ({
      start: SITE.appStart, login: SITE.appLogin, email: SITE.email, phone: SITE.phone, address: SITE.address, playStore: SITE.playStore, appStore: SITE.appStore,
      waLink: SITE.whatsapp ? `https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}` : '/contact',
      waLabel: SITE.whatsapp ? `+${SITE.whatsapp.replace(/\D/g, '')}` : '[WHATSAPP NUMBER]',
      tel: /\d/.test(SITE.phone) ? `tel:${SITE.phone.replace(/[^\d+]/g, '')}` : '/contact',
    })[k]);
}

function page(file) {
  const src = readFileSync(join(ROOT, 'src/pages', file), 'utf8');
  const meta = JSON.parse(src.match(/^<!--(\{[\s\S]*?\})-->/)[1]);
  const body = render(src.replace(/^<!--\{[\s\S]*?\}-->\s*/, ''));
  const url = `https://noonlearn.com${meta.path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${meta.title}"><meta property="og:description" content="${meta.desc}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://noonlearn.com${BASE}/img/logo.png">
<meta name="theme-color" content="#5B43E0">
<link rel="icon" href="${BASE}/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Fredoka:wght@500;600;700&family=Amiri:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE}/css/site.css?v=${Date.now().toString(36)}">
<script>window.NOON = ${JSON.stringify({ whatsapp: SITE.whatsapp, email: SITE.email })};</script>
</head>
<body>
<a class="sr-only" href="#main">Skip to content</a>
${header(meta.nav)}
<main id="main">
${body}
</main>
${footer()}
<script src="${BASE}/js/site.js" defer></script>
</body>
</html>
`;
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'static'), OUT, { recursive: true });
const pages = readdirSync(join(ROOT, 'src/pages')).filter((f) => f.endsWith('.html'));
for (const f of pages) writeFileSync(join(OUT, f), page(f));
// sitemap + robots for search engines
const paths = pages.map((f) => JSON.parse(readFileSync(join(ROOT, 'src/pages', f), 'utf8').match(/^<!--(\{[\s\S]*?\})-->/)[1]).path);
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>https://noonlearn.com${p}</loc></url>`).join('')}</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /student/\nDisallow: /teacher/\nDisallow: /admin/\nDisallow: /super/\nSitemap: https://noonlearn.com/sitemap.xml\n');
console.log(`Website built: ${pages.length} pages → website/dist`);

// Puts the website and the app into one Vercel output (app/dist):
//   noonlearn.com/            → website home         (dist/index.html)
//   noonlearn.com/about, …    → website pages        (dist/site/*.html, via vercel.json rewrites)
//   noonlearn.com/login, …    → the app              (dist/app.html, the single-page app)
// Run after `expo export` and `node website/build.mjs`.
import { cpSync, renameSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APP = join(ROOT, '..', 'app', 'dist');
const SITE = join(ROOT, 'dist');
if (!existsSync(join(APP, 'index.html'))) throw new Error('Run `npx expo export --platform web` in app/ first');
if (!existsSync(join(SITE, 'index.html'))) throw new Error('Run `node website/build.mjs` first');

renameSync(join(APP, 'index.html'), join(APP, 'app.html'));
cpSync(SITE, join(APP, 'site'), { recursive: true });
copyFileSync(join(SITE, 'index.html'), join(APP, 'index.html'));
copyFileSync(join(SITE, 'sitemap.xml'), join(APP, 'sitemap.xml'));
copyFileSync(join(SITE, 'robots.txt'), join(APP, 'robots.txt'));
console.log('Website + app combined in app/dist');

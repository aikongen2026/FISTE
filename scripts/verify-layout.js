const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const rev = Number(pkg.appRevision);
const root = path.resolve(__dirname, '..');
const pub = path.join(root, 'public');
function must(cond, message) { if (!cond) { console.error(`DEPLOY BLOCKED: ${message}`); process.exit(1); } }
must(Number.isInteger(rev) && rev > 0, 'package.json mangler gyldig appRevision.');
for (const name of ['index.html','app.js','style.css','sw.js','manifest.webmanifest']) {
  must(fs.existsSync(path.join(pub, name)), `public/${name} mangler.`);
}
const index = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(pub, 'sw.js'), 'utf8');
const app = fs.readFileSync(path.join(pub, 'app.js'), 'utf8');
must(index.includes(`REV ${rev}`), `public/index.html er ikke REV ${rev}.`);
must(index.includes(`v=${rev}.0`), `public/index.html peker ikke på REV ${rev}-assets.`);
must(sw.includes(`rev${rev}`), `public/sw.js bruker ikke REV ${rev}-cache.`);
must(sw.includes(`v=${rev}.0`), `public/sw.js cacher ikke REV ${rev}-assets.`);
must(app.includes(`/sw.js?v=${rev}.0`), `public/app.js registrerer ikke REV ${rev} service worker.`);
for (const bad of ['index.html','app.js','style.css','sw.js','manifest.webmanifest']) {
  must(!fs.existsSync(path.join(root, bad)), `${bad} ligger feilaktig i repo-roten. Den skal bare ligge i /public.`);
}
console.log(`Layout OK: REV ${rev} serveres entydig fra /public.`);

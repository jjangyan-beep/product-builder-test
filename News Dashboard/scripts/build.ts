import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { validateSnapshot } from '../apps/web/model.js';

validateSnapshot(JSON.parse(await readFile('apps/web/data/news.json', 'utf8')));
await mkdir('dist/data', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.js', 'data/news.json']) {
  await copyFile(`apps/web/${file}`, `dist/${file}`);
}
await copyFile('apps/web/data/status.json', 'dist/data/status.json');
console.log('Built static dashboard in dist/');

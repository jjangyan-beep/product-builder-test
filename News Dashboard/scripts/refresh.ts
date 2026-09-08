import { resolve } from 'node:path';
import { refreshSnapshot, atomicWrite } from '../packages/pipeline/src/dashboard/snapshot.ts';

const directory = resolve('apps/web/data');
try {
  const { snapshot, partial } = await refreshSnapshot(`${directory}/news.json`);
  await atomicWrite(`${directory}/status.json`, { state: partial ? 'partial' : 'success', attemptedAt: new Date().toISOString() }).catch(() => {});
  console.log(JSON.stringify({ refreshedAt: snapshot.refreshedAt, counts: Object.fromEntries(Object.entries(snapshot.sections).map(([key, items]) => [key, items.length])), partial }));
} catch {
  await atomicWrite(`${directory}/status.json`, { state: 'failed', attemptedAt: new Date().toISOString() }).catch(() => {});
  console.error('News refresh failed. Last successful snapshot preserved.');
  process.exitCode = 1;
}

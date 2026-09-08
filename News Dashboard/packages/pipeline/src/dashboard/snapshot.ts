import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { collectRssFeeds } from '../news/collect-rss.ts';
import { sections, titleKey, validateSnapshot } from '../../../../apps/web/model.js';

export type Link = { stableId: string; title: string; publisherName: string; articleUrl: string; publishedAt: string; isNew: boolean };
export type Snapshot = { schemaVersion: 'news-dashboard.links/1'; refreshedAt: string; sections: Record<string, Link[]> };

export function buildSnapshot(candidates: Array<Link & { section: string }>, previous: Snapshot | null, now: string): Snapshot {
  const previousItems = Object.values(previous?.sections ?? {}).flat();
  const priorIds = new Set(previousItems.map(item => item.stableId));
  const priorTitles = new Set(previousItems.map(item => titleKey(item.title)));
  const currentIds = new Set(candidates.map(item => item.stableId));
  const pool = [...candidates, ...Object.entries(previous?.sections ?? {}).flatMap(([section, items]) =>
    items.filter(item => !currentIds.has(item.stableId)).map(item => ({ ...item, section })))];
  const nowMs = Date.parse(now);
  pool.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.stableId.localeCompare(b.stableId));
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: Snapshot = { schemaVersion: 'news-dashboard.links/1', refreshedAt: now, sections: Object.fromEntries(Object.keys(sections).map(key => [key, []])) };
  for (const item of pool) {
    const target = result.sections[item.section];
    const age = nowMs - Date.parse(item.publishedAt);
    const title = titleKey(item.title);
    if (!target || target.length >= 20 || !Number.isFinite(age) || age < 0 || age > 7 * 86400000 ||
        seenUrls.has(item.articleUrl) || seenTitles.has(title)) continue;
    seenUrls.add(item.articleUrl); seenTitles.add(title);
    target.push({ stableId: item.stableId, title: item.title, publisherName: item.publisherName,
      articleUrl: item.articleUrl, publishedAt: item.publishedAt,
      isNew: !priorIds.has(item.stableId) && !priorTitles.has(title) });
  }
  validateSnapshot(result);
  if (!Object.values(result.sections).some(items => items.length)) throw new Error('no_recent_articles');
  return result;
}

export async function readSnapshot(path: string): Promise<Snapshot | null> {
  try { return validateSnapshot(JSON.parse(await readFile(path, 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function atomicWrite(path: string, value: unknown, io = { writeFile, rename, unlink }) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try { await io.writeFile(temp, JSON.stringify(value, null, 2) + '\n', 'utf8'); await io.rename(temp, path); }
  finally { await io.unlink(temp).catch(() => {}); }
}

export async function refreshSnapshot(path: string, options: { now?: string; collect?: typeof collectRssFeeds; publish?: typeof atomicWrite } = {}) {
  const now = options.now ?? new Date().toISOString();
  const previous = await readSnapshot(path);
  const result = await (options.collect ?? collectRssFeeds)({ retrievedAt: now, runId: `links-${now}` });
  if (!result.health.length || result.health.every(item => item.errorCode !== null) || !result.candidates.length) throw new Error('collection_failed');
  const snapshot = buildSnapshot(result.candidates.map(item => ({ ...item, isNew: false })), previous, now);
  await (options.publish ?? atomicWrite)(path, snapshot);
  return { snapshot, partial: result.health.some(item => item.errorCode !== null) };
}

export function scheduledSlot(date: Date): string | null {
  const kst = new Date(date.getTime() + 9 * 3600000);
  return [6, 9, 12, 15, 18, 21].includes(kst.getUTCHours()) && kst.getUTCMinutes() === 7
    ? kst.toISOString().slice(0, 16) : null;
}

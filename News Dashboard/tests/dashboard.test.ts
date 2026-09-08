import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm, readdir, rename, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { buildSnapshot, refreshSnapshot, atomicWrite, scheduledSlot } from '../packages/pipeline/src/dashboard/snapshot.ts';
import { validateSnapshot } from '../apps/web/model.js';
import type { collectRssFeeds } from '../packages/pipeline/src/news/collect-rss.ts';

const now = '2026-09-08T06:07:00.000Z';
async function cleanup(folder: string) {
  assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
  assert.ok(basename(folder).startsWith('news-dashboard-'));
  await rm(folder, { recursive: true, force: true });
}
function article(id: string, overrides = {}) {
  return { stableId: id, title: `테스트 뉴스 ${id}`, publisherName: '테스트 출처',
    articleUrl: `https://example.invalid/news/${id}`, publishedAt: '2026-09-08T06:00:00.000Z',
    section: 'stocks', isNew: false, ...overrides };
}
function collector(items: ReturnType<typeof article>[], failed = false) {
  return (async () => ({ candidates: items, health: [{ errorCode: failed ? 'network_error' : null }] })) as unknown as typeof collectRssFeeds;
}

test('sparse sections publish; only seven-day metadata survives and sections stop at twenty', () => {
  const snapshot = buildSnapshot([
    ...Array.from({ length: 25 }, (_, i) => article(`a${i}`)),
    article('old', { section: 'world', publishedAt: '2026-08-30T06:00:00Z' }),
    article('future', { section: 'world', publishedAt: '2026-09-09T06:00:00Z' }),
    article('past', { section: 'world', publishedAt: '2026-09-06T06:00:00Z', body: 'must not persist' }),
  ], null, now);
  assert.equal(Object.keys(snapshot.sections).length, 8);
  assert.equal(snapshot.sections.stocks.length, 20);
  assert.deepEqual(snapshot.sections.politics, []);
  assert.equal(snapshot.sections.world.length, 1);
  assert.equal(JSON.stringify(snapshot).includes('must not persist'), false);
  assert.deepEqual(Object.keys(snapshot.sections.world[0]).sort(), ['stableId','title','publisherName','articleUrl','publishedAt','isNew'].sort());
});

test('deduplicates URLs and normalized titles across sections; newest representative wins', () => {
  const snapshot = buildSnapshot([
    article('a', { title: '같은  뉴스', publishedAt: '2026-09-08T05:00:00Z' }),
    article('b', { title: '같은 뉴스', section: 'economy' }),
    article('c', { articleUrl: 'https://example.invalid/news/b', publishedAt: '2026-09-08T04:00:00Z' }),
  ], null, now);
  assert.equal(Object.values(snapshot.sections).flat().length, 1);
  assert.equal(snapshot.sections.economy[0].stableId, 'b');
});

test('current metadata replaces prior same-URL metadata; NEW compares last successful identities', () => {
  const previous = buildSnapshot([article('a'), article('b', { title: '기존 뉴스' })], null, now);
  const next = buildSnapshot([
    article('a', { title: '수정된 제목', section: 'economy' }),
    article('replacement', { title: '기존 뉴스', publishedAt: '2026-09-08T06:01:00Z' }), article('new'),
  ], previous, '2026-09-08T09:07:00Z');
  const items = Object.values(next.sections).flat();
  assert.equal(items.find(item => item.stableId === 'a')?.title, '수정된 제목');
  assert.equal(items.find(item => item.stableId === 'a')?.isNew, false);
  assert.equal(items.find(item => item.stableId === 'replacement')?.isNew, false);
  assert.equal(items.find(item => item.stableId === 'new')?.isNew, true);
});

test('success → failure → success preserves snapshot bytes, timestamp and NEW through failure', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'news-dashboard-'));
  const path = join(folder, 'news.json');
  try {
    await refreshSnapshot(path, { now, collect: collector([article('a')]) });
    const bytes = await readFile(path, 'utf8');
    await assert.rejects(refreshSnapshot(path, { now: '2026-09-08T09:07:00Z', collect: collector([], true) }), /collection_failed/);
    assert.equal(await readFile(path, 'utf8'), bytes);
    await assert.rejects(refreshSnapshot(path, { now, collect: collector([article('bad', { articleUrl: 'javascript:alert(1)' })]) }));
    assert.equal(await readFile(path, 'utf8'), bytes);
    await assert.rejects(refreshSnapshot(path, { now, collect: collector([article('b')]), publish: async () => { throw new Error('storage failed'); } }));
    assert.equal(await readFile(path, 'utf8'), bytes);
    const next = await refreshSnapshot(path, { now: '2026-09-08T12:07:00Z', collect: collector([article('a'), article('b')]) });
    assert.equal(next.snapshot.sections.stocks.find(item => item.stableId === 'a')?.isNew, false);
    assert.equal(next.snapshot.sections.stocks.find(item => item.stableId === 'b')?.isNew, true);
  } finally { await cleanup(folder); }
});

test('failed temporary write or promotion keeps old bytes and cleans the temporary file', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'news-dashboard-'));
  const path = join(folder, 'news.json');
  try {
    await writeFile(path, 'previous');
    await assert.rejects(atomicWrite(path, { updated: true }, {
      writeFile: async () => { throw new Error('disk_full'); }, rename, unlink,
    }), /disk_full/);
    assert.equal(await readFile(path, 'utf8'), 'previous');
    await assert.rejects(atomicWrite(path, { updated: true }, {
      writeFile, rename: async () => { throw new Error('rename_failed'); }, unlink,
    }), /rename_failed/);
    assert.equal(await readFile(path, 'utf8'), 'previous');
    assert.deepEqual(await readdir(folder), ['news.json']);
  } finally { await cleanup(folder); }
});

test('validator rejects incompatible versions, unsafe links and duplicate IDs', () => {
  const snapshot = buildSnapshot([article('a')], null, now);
  assert.throws(() => validateSnapshot({ ...snapshot, schemaVersion: 'different' }));
  assert.throws(() => validateSnapshot({ ...snapshot, sections: { ...snapshot.sections, stocks: [article('a', { articleUrl: 'https://user:pass@example.invalid' })] } }));
  assert.throws(() => validateSnapshot({ ...snapshot, sections: { ...snapshot.sections, world: snapshot.sections.stocks } }));
});

test('schedule uses six KST times, including prior-day UTC, with no overnight refresh', () => {
  const slots = Array.from({ length: 24 }, (_, hour) => new Date(`2026-09-08T${String(hour).padStart(2, '0')}:07:00Z`));
  assert.equal(slots.filter(date => scheduledSlot(date)).length, 6);
  assert.equal(scheduledSlot(new Date('2026-09-07T21:07:00Z')), '2026-09-08T06:07');
  assert.equal(scheduledSlot(new Date('2026-09-08T15:07:00Z')), null);
  assert.equal(scheduledSlot(new Date('2026-09-08T00:06:00Z')), null);
});

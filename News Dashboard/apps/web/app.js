import { sections, validateSnapshot } from './model.js';

const $ = id => document.getElementById(id);
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Preferences are optional. */ } },
};
const savedRead = storage.get('news:read', []);
const read = new Set(Array.isArray(savedRead) ? savedRead.filter(id => typeof id === 'string').slice(-2000) : []);
let active = 'stocks';
let snapshot = null;
let busy = false;
const dateFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function element(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
function setTheme(dark) { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('theme').textContent = dark ? '라이트 모드' : '다크 모드'; $('theme').setAttribute('aria-pressed', String(dark)); storage.set('news:theme', dark ? 'dark' : 'light'); }
setTheme(storage.get('news:theme', 'light') === 'dark');
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
$('today').textContent = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());

function updateTabs() {
  for (const [key, label] of Object.entries(sections)) {
    const button = $(`tab-${key}`);
    const unread = (snapshot?.sections[key] ?? []).filter(item => !read.has(item.stableId)).length;
    button.replaceChildren(document.createTextNode(label), element('span', unread || '', 'unread-count'));
    button.setAttribute('aria-label', `${label}, 읽지 않은 뉴스 ${unread}건`);
    button.setAttribute('aria-selected', String(key === active)); button.tabIndex = key === active ? 0 : -1;
  }
}
for (const [key, label] of Object.entries(sections)) {
  const button = element('button', label); button.type = 'button'; button.id = `tab-${key}`;
  button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'news');
  button.addEventListener('click', () => { active = key; render(); });
  button.addEventListener('keydown', event => {
    const keys = Object.keys(sections); let index = keys.indexOf(key);
    if (event.key === 'ArrowRight') index = (index + 1) % keys.length;
    else if (event.key === 'ArrowLeft') index = (index + keys.length - 1) % keys.length;
    else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = keys.length - 1; else return;
    event.preventDefault(); active = keys[index]; render(); $(`tab-${active}`).focus();
  });
  $('tabs').append(button);
}
function articleLink(item) {
  const link = element('a', item.title, 'article-link'); link.href = item.articleUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${item.title} — ${item.publisherName}, 새 탭에서 원문 열기`);
  const mark = event => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    read.delete(item.stableId); read.add(item.stableId);
    while (read.size > 2000) read.delete(read.values().next().value);
    storage.set('news:read', [...read]);
    const container = link.closest('article, tr'); container?.classList.add('read');
    if (container && !container.querySelector('.read-label')) container.querySelector('.read-slot')?.append(element('span', '읽음', 'read-label'));
    updateTabs();
  };
  link.addEventListener('click', mark); link.addEventListener('auxclick', mark); return link;
}
function time(item) { const node = element('time', dateFormat.format(new Date(item.publishedAt))); node.dateTime = item.publishedAt; node.title = '기사 발행 시각 · 한국시간'; return node; }
function render() {
  updateTabs(); $('news').setAttribute('aria-labelledby', `tab-${active}`); $('section-title').textContent = sections[active];
  const items = snapshot?.sections[active] ?? [];
  $('count').textContent = `${items.length}건 · 최신순`;
  $('coverage').hidden = !snapshot || items.length === 0;
  const older = items.some(item => Date.parse(snapshot.refreshedAt) - Date.parse(item.publishedAt) > 86400000);
  $('coverage').textContent = older ? '최근 24시간 기사가 적어, 최대 7일 안에 모은 뉴스를 함께 보여줍니다.' : '최근 24시간에 발행된 뉴스입니다.';
  $('cards').replaceChildren(); $('rows').replaceChildren(); $('empty').hidden = items.length > 0; $('more').hidden = items.length <= 5;
  items.forEach((item, index) => {
    if (index < 5) {
      const card = element('article', null, `card${index === 0 ? ' featured' : ''}${read.has(item.stableId) ? ' read' : ''}`);
      const top = element('div', null, 'card-top'); top.append(element('span', String(index + 1).padStart(2, '0'), 'rank'));
      if (item.isNew) top.append(element('span', 'NEW', 'badge'));
      const heading = element('h3'); heading.append(articleLink(item));
      const bottom = element('div', null, 'card-bottom read-slot'); bottom.append(element('span', item.publisherName), time(item));
      if (read.has(item.stableId)) bottom.append(element('span', '읽음', 'read-label'));
      const arrow = element('span', '↗', 'outbound'); arrow.setAttribute('aria-hidden', 'true'); bottom.append(arrow);
      card.append(top, heading, bottom); $('cards').append(card);
    } else {
      const row = element('tr', null, read.has(item.stableId) ? 'read' : '');
      const title = element('td', null, 'read-slot'); title.append(articleLink(item));
      if (item.isNew) title.append(element('span', 'NEW', 'badge'));
      if (read.has(item.stableId)) title.append(element('span', '읽음', 'read-label'));
      const published = element('td'); published.append(time(item));
      row.append(element('td', String(index + 1).padStart(2, '0')), title, element('td', item.publisherName), published); $('rows').append(row);
    }
  });
}
async function load() {
  let cached = false;
  try {
    const response = await fetch('/data/news.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('unavailable');
    snapshot = validateSnapshot(await response.json()); storage.set('news:snapshot', snapshot);
  } catch {
    cached = true;
    if (!snapshot) { try { snapshot = validateSnapshot(storage.get('news:snapshot', null)); } catch { snapshot = null; } }
  }
  let state = '';
  try { const response = await fetch('/data/status.json', { cache: 'no-store' }); if (response.ok) state = (await response.json()).state; } catch { /* Snapshot still works. */ }
  let message = snapshot ? `마지막 수집 ${dateFormat.format(new Date(snapshot.refreshedAt))} KST` : '아직 받은 뉴스가 없습니다. 새로고침을 눌러 주세요.';
  if (snapshot && (cached || state === 'failed')) message += ' · 연결이 원활하지 않아 이전 목록을 표시합니다.';
  else if (state === 'partial') message += ' · 일부 출처의 갱신이 지연되고 있습니다.';
  else if (snapshot && Date.now() - Date.parse(snapshot.refreshedAt) > 12 * 3600000) message += ' · 새 뉴스 수집이 지연되고 있습니다.';
  $('status').textContent = message; render();
}
$('refresh').addEventListener('click', async () => {
  if (busy) return; busy = true; $('refresh').disabled = true; $('refresh').textContent = '불러오는 중…';
  try {
    if (location.hostname === '127.0.0.1') await fetch('/api/refresh', { method: 'POST', signal: AbortSignal.timeout(45000) });
    await load();
  } catch { $('status').textContent = '새로고침에 실패했습니다. 현재 목록을 유지합니다.'; }
  finally { busy = false; $('refresh').disabled = false; $('refresh').textContent = '↻ 새로고침'; }
});
render(); await load();

export const sections = {
  politics: '정치', economy: '경제', stocks: '증권', global_markets: '해외증시',
  society: '사회', world: '국제', entertainment: '엔터', sports: '스포츠',
};

export function validateSnapshot(value) {
  if (!value || value.schemaVersion !== 'news-dashboard.links/1' ||
      !Number.isFinite(Date.parse(value.refreshedAt)) || !value.sections) throw new Error('invalid_snapshot');
  const ids = new Set();
  for (const key of Object.keys(sections)) {
    const items = value.sections[key];
    if (!Array.isArray(items) || items.length > 20) throw new Error('invalid_section');
    for (const item of items) {
      const url = new URL(item.articleUrl);
      if (url.protocol !== 'https:' || url.username || url.password ||
          typeof item.stableId !== 'string' || !item.stableId || ids.has(item.stableId) ||
          typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300 ||
          typeof item.publisherName !== 'string' || !item.publisherName.trim() ||
          !Number.isFinite(Date.parse(item.publishedAt)) || typeof item.isNew !== 'boolean') throw new Error('invalid_article');
      ids.add(item.stableId);
    }
  }
  return value;
}

export function titleKey(title) {
  return title.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

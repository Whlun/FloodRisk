import type { IncomingMessage, ServerResponse } from 'http';
import { mergeScannedEntries, scanEntries, type ScannedEntryItem } from '../../utils/entryScanner';
import { readEntriesManifest, writeEntriesManifestAtomic } from '../../utils/entriesManifest';

/** 短时间内重复请求 /api/entries.json 时直接复用结果，减轻磁盘扫描与写 manifest 压力（选页时若触达该接口体感更顺） */
let entriesApiShortCache: { expiresAt: number; body: string } | null = null;
const ENTRIES_API_CACHE_MS = 2000;

function serializeEntryItem(item: ScannedEntryItem) {
  return {
    name: item.name,
    displayName: item.displayName,
    demoUrl: item.demoUrl,
    specUrl: item.specUrl,
    jsUrl: item.jsUrl,
    filePath: item.filePath,
    ...(item.isReference !== undefined ? { isReference: item.isReference } : {}),
    ...(item.hasSubPages !== undefined ? { hasSubPages: item.hasSubPages } : {}),
  };
}

export function handleEntriesApi(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.url !== '/api/entries.json') {
    return false;
  }

  try {
    const now = Date.now();
    if (entriesApiShortCache && now < entriesApiShortCache.expiresAt) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Axhub-Entries-Cache', 'hit');
      res.statusCode = 200;
      res.end(entriesApiShortCache.body);
      return true;
    }

    console.log('\n🔍 实时扫描入口文件...');

    const projectRoot = process.cwd();
    const scanned = scanEntries(projectRoot);
    const existingEntries = readEntriesManifest(projectRoot);
    const nextEntries = mergeScannedEntries(existingEntries, scanned.entries);
    const prevJs = JSON.stringify(existingEntries?.js ?? {});
    const prevHtml = JSON.stringify(existingEntries?.html ?? {});
    const nextJs = JSON.stringify(nextEntries.js ?? {});
    const nextHtml = JSON.stringify(nextEntries.html ?? {});
    if (prevJs !== nextJs || prevHtml !== nextHtml) {
      writeEntriesManifestAtomic(projectRoot, nextEntries as any);
    }

    console.log(`✅ 扫描完成，发现 ${Object.keys(scanned.entries.js).length} 个入口`);

    const result = {
      components: scanned.items.components.map(serializeEntryItem),
      prototypes: scanned.items.prototypes.map(serializeEntryItem),
    };

    const body = JSON.stringify(result, null, 2);
    entriesApiShortCache = { expiresAt: now + ENTRIES_API_CACHE_MS, body };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Axhub-Entries-Cache', 'miss');
    res.statusCode = 200;
    res.end(body);
    return true;
  } catch (err) {
    console.error('生成 entries.json API 失败:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
    return true;
  }
}

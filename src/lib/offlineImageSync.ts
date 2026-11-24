import {
  categories,
  languageCategories,
  SCENE_TITLES,
  type SoundCategory,
  type Subcategory,
} from '@/data/words';
import {
  CUSTOM_SCENE_TITLES,
  customSceneImageUrl,
  r2ImageCandidates,
  r2ImagePaths,
  sceneImageUrl,
} from '@/lib/images';

export const OFFLINE_IMAGE_CACHE_NAME = 'kristens-words-images-v1';
const R2_HOST = 'pub-c53fff4920214dd59d4a14590b17acae.r2.dev';
const BATCH_SIZE = 7;
const MISSING_ITEMS_STORAGE_KEY = 'kristens-words-offline-image-missing-v1';
const STATIC_R2_IMAGE_URLS = [
  'https://pub-c53fff4920214dd59d4a14590b17acae.r2.dev/seasonal/background.jpg',
  'https://pub-c53fff4920214dd59d4a14590b17acae.r2.dev/seasonal/memory.jpg',
];

export type OfflineImageProgress = {
  cachedCount: number;
  totalCount: number;
  isDownloading: boolean;
  failedItems: Array<{ label: string; urls: string[] }>;
};

type CatalogItem = {
  key: string;
  label: string;
  candidates: string[];
};

function buildCatalog(): CatalogItem[] {
  const items = new Map<string, CatalogItem>();
  const add = (label: string, candidates: string[]) => {
    if (candidates.length === 0) return;
    const key = candidates.join('\n');
    if (!items.has(key)) items.set(key, { key, label, candidates });
  };

  const addWords = (
    category: SoundCategory,
    subcategory: Subcategory,
    words: string[],
    groupId: string | null,
  ) => {
    for (const word of words) {
      const plan = r2ImagePaths(word, category, subcategory, groupId);
      add(`${word} (${category.label} ${subcategory.label})`, r2ImageCandidates(plan));
    }
  };

  for (const category of [...categories, ...languageCategories]) {
    if (category.kind === 'scene') continue;
    for (const subcategory of category.subcategories) {
      if (subcategory.groups?.length) {
        for (const group of subcategory.groups) {
          addWords(category, subcategory, group.words, group.id);
        }
      } else {
        addWords(category, subcategory, subcategory.words ?? [], null);
      }
    }
  }

  for (const title of SCENE_TITLES) {
    add(`Picture scene: ${title}`, [sceneImageUrl(title)]);
  }
  for (const title of CUSTOM_SCENE_TITLES) {
    add(`Custom scene: ${title}`, [customSceneImageUrl(title)]);
  }
  for (const url of STATIC_R2_IMAGE_URLS) {
    add(`App image: ${url}`, [url]);
  }

  return [...items.values()];
}

const catalog = buildCatalog();
const catalogSignature = (() => {
  const source = catalog.map((item) => item.key).join('\u0000');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(36);
})();

function readMissingItems(): Set<string> {
  try {
    const stored = localStorage.getItem(MISSING_ITEMS_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as { signature?: string; keys?: string[] };
    if (parsed.signature !== catalogSignature || !Array.isArray(parsed.keys)) return new Set();
    const catalogKeys = new Set(catalog.map((item) => item.key));
    return new Set(parsed.keys.filter((key) => catalogKeys.has(key)));
  } catch {
    return new Set();
  }
}

function saveMissingItems(missingItems: Set<string>): void {
  try {
    localStorage.setItem(
      MISSING_ITEMS_STORAGE_KEY,
      JSON.stringify({ signature: catalogSignature, keys: [...missingItems] }),
    );
  } catch (error) {
    console.warn('Could not save the unavailable offline image catalog.', error);
  }
}

function imageCacheUrls(cache: Cache): Promise<Set<string>> {
  return cache.keys().then((requests) => new Set(requests.map((request) => request.url)));
}

function findCachedCandidate(item: CatalogItem, cachedUrls: Set<string>): string | undefined {
  return item.candidates.find((url) => cachedUrls.has(url));
}

export async function inspectOfflineImages(): Promise<OfflineImageProgress> {
  if (!('caches' in globalThis)) {
    return {
      cachedCount: 0,
      totalCount: catalog.length,
      isDownloading: false,
      failedItems: [],
    };
  }

  const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME);
  const cachedUrls = await imageCacheUrls(cache);
  const missingItems = readMissingItems();
  const cachedCount = catalog.filter(
    (item) => !missingItems.has(item.key) && findCachedCandidate(item, cachedUrls),
  ).length;
  return {
    cachedCount,
    totalCount: catalog.length - missingItems.size,
    isDownloading: false,
    failedItems: [],
  };
}

async function fetchFirstAvailableCandidate(
  cache: Cache,
  item: CatalogItem,
): Promise<
  | { kind: 'found'; url: string }
  | { kind: 'missing' }
  | { kind: 'failed'; urls: string[] }
> {
  let everyCandidateWasMissing = true;
  const failedUrls: string[] = [];
  for (const url of item.candidates) {
    const cachedResponse = await cache.match(url, { ignoreVary: true });
    if (cachedResponse && (cachedResponse.status === 200 || cachedResponse.type === 'opaque')) {
      return { kind: 'found', url };
    }

      let response: Response;
    try {
        response = await fetch(url, { cache: 'no-cache', mode: 'cors' });
    } catch {
      everyCandidateWasMissing = false;
        failedUrls.push(url);
        continue;
      }

      if (response.status === 200 && response.type !== 'opaque') {
        try {
          await cache.put(url, response.clone());
          return { kind: 'found', url };
        } catch {
          return { kind: 'failed', urls: [url] };
        }
    }
      if (response.status !== 404) {
        everyCandidateWasMissing = false;
        failedUrls.push(url);
      }
  }
  return everyCandidateWasMissing ? { kind: 'missing' } : { kind: 'failed', urls: failedUrls };
}

export async function downloadOfflineImages(
  onProgress: (progress: OfflineImageProgress) => void,
): Promise<OfflineImageProgress> {
  if (!('caches' in globalThis)) {
    throw new Error('Offline image storage is unavailable in this browser.');
  }
  if (navigator.onLine === false) {
    throw new Error('Connect to the internet before downloading offline images.');
  }

  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch (error) {
      console.warn('Could not request persistent offline image storage.', error);
    }
  }

  const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME);
  const cachedUrls = await imageCacheUrls(cache);
  const missingItems = readMissingItems();
  let cachedCount = 0;
  const pending: CatalogItem[] = [];
  for (const item of catalog) {
    if (missingItems.has(item.key)) continue;
    if (findCachedCandidate(item, cachedUrls)) cachedCount += 1;
    else pending.push(item);
  }

  const failedItems: OfflineImageProgress['failedItems'] = [];
  const report = (isDownloading: boolean): OfflineImageProgress => ({
    cachedCount,
    totalCount: catalog.length - missingItems.size,
    isDownloading,
    failedItems: [...failedItems],
  });
  onProgress(report(true));

  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (item) => ({
        item,
        result: await fetchFirstAvailableCandidate(cache, item),
      })),
    );

    for (const { item, result } of results) {
      if (result.kind === 'found') {
        cachedCount += 1;
        cachedUrls.add(result.url);
      } else if (result.kind === 'missing') {
        missingItems.add(item.key);
      } else {
        failedItems.push({
          label: item.label,
          urls: result.urls.filter((url) => new URL(url).hostname === R2_HOST),
        });
      }
      onProgress(report(true));
    }
    saveMissingItems(missingItems);
  }

  const complete = report(false);
  onProgress(complete);
  return complete;
}

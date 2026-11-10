import { prisma } from "../prisma";

const DEFAULT_TTL_HOURS = 24;

export function getCacheKey(
  endpoint: string,
  s2CellId: string,
  captureDateStr?: string,
  dataVersion?: string
): string {
  return `${endpoint}:${s2CellId}:${captureDateStr || "latest"}:${dataVersion || "latest"}`;
}

export async function getFromCache<T>(key: string): Promise<{ data: T; updateTime: Date; fetchedAt: Date } | null> {
  try {
    const cached = await prisma.apiCache.findUnique({
      where: { key },
    });

    if (!cached) return null;

    const ttlHours = Number(process.env.AGRI_CACHE_TTL_HOURS) || DEFAULT_TTL_HOURS;
    const expiryTime = new Date(cached.fetchedAt.getTime() + ttlHours * 60 * 60 * 1000);

    if (Date.now() > expiryTime.getTime()) {
      // Expired
      return null;
    }

    const data = JSON.parse(cached.payload) as T;
    return {
      data,
      updateTime: cached.updateTime,
      fetchedAt: cached.fetchedAt,
    };
  } catch (err) {
    console.warn(`[Cache] Error reading cache for ${key}:`, err);
    return null;
  }
}

export async function saveToCache<T>(
  key: string,
  payload: T,
  dataVersion: string = "latest",
  updateTime: Date = new Date()
): Promise<void> {
  try {
    const payloadStr = JSON.stringify(payload);
    await prisma.apiCache.upsert({
      where: { key },
      create: {
        key,
        payload: payloadStr,
        dataVersion,
        updateTime,
        fetchedAt: new Date(),
      },
      update: {
        payload: payloadStr,
        dataVersion,
        updateTime,
        fetchedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(`[Cache] Error saving cache for ${key}:`, err);
  }
}

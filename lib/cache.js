import { redis } from "./redis";

/**
 * @param {string} key - The unique Redis key
 * @param {function} fetcher - The function to run if cache is missing (MongoDB query)
 * @param {number} expires - TTL in seconds (default 1 hour)
 */
export async function getOrSetCache(key, fetcher, expires = 3600) {
  try {
    // 1. Try to get data from Redis
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      console.log(`Cache Hit: ${key}`);
      return cachedData; // Redis returns the parsed object automatically
    }

    // 2. Cache Miss: Run the MongoDB fetcher
    console.log(`Cache Miss: ${key}. Fetching from DB...`);
    const freshData = await fetcher();

    if (freshData) {
      // 3. Save to Redis with expiration
      await redis.set(key, freshData, { ex: expires });
    }

    return freshData;
  } catch (error) {
    console.error("Cache Utility Error:", error);
    // If Redis fails, fall back to the database so the app doesn't crash
    return await fetcher();
  }
}
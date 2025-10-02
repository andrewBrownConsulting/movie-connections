import { createClient } from 'redis';

const redisClient = createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

await redisClient.connect();

export async function cacheMovieSearchResults(query, results) {
    await redisClient.set(query, JSON.stringify(results), {
        EX: 360000 // expire in 100 hours
    });
}

export async function getCachedMovieSearchResults(query) {
    const cachedResults = await redisClient.get(query);
    return cachedResults ? JSON.parse(cachedResults) : null;
}
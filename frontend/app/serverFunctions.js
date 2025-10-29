'use server'
import client from "./cacheFuncs";
import { getYear } from "./utils";
const token = process.env.TMDB_AUTH_TOKEN
const tmdbHeaders = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json;charset=utf-8'
};
let cacheHits = 0;
let cacheMisses = 0;
function incrementCache(hit) {
  if (hit)
    cacheHits++;
  else
    cacheMisses++;
  if ((cacheHits + cacheMisses) % 100 == 0)
    console.log('cache hit percentage = ' + 100 * cacheHits / (cacheHits + cacheMisses))
}
async function fetchWithRetry(url, method, headers, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { method, headers });
      if (!res.ok)
        throw new Error(`HTTP Error ${res.status}`);
      return await res.json();
    }
    catch (err) {
      if (i == retries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 400 * 2 ** i))
    }
  }
}

export async function searchForMovie(searchValue) {
  const cacheVal = await client.get('search:' + searchValue)
  incrementCache(cacheVal != null);
  if (cacheVal != null)
    return await JSON.parse(cacheVal);

  const tmdbData = await fetchWithRetry(`https://api.themoviedb.org/3/search/movie?query=${searchValue}&include_adult=false&language=en-US&page=1`,
    'GET', tmdbHeaders
  )
  tmdbData.results.sort((a, b) => b.popularity - a.popularity);
  tmdbData.results = tmdbData.results.slice(0, 10);

  client.set("search:" + searchValue, JSON.stringify(tmdbData.results) || [])
  if (tmdbData.results == null)
    return [];
  return tmdbData.results;
}

export async function getMovieWithId(id) {
  const cacheVal = await client.get('movie:' + id)
  incrementCache(cacheVal != null);
  if (cacheVal != null)
    return await JSON.parse(cacheVal);

  const tmdbMovieData = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=videos,credits`,
    'GET',
    tmdbHeaders
  )

  let trailer = null;
  if (tmdbMovieData.videos && tmdbMovieData.videos.results) {
    const trailers = tmdbMovieData.videos.results.filter(video => video.type === 'Trailer' && video.site === 'YouTube');
    if (trailers.length > 0) {
      trailers.sort((a, b) => {
        if (a.official && !b.official) return -1;
        if (!a.official && b.official) return 1;
        return (b.size || 0) - (a.size || 0);
      });
      trailer = trailers[0];
    }
  }
  const poster_path = tmdbMovieData.poster_path || null;
  const title = tmdbMovieData.title || 'Unknown Title';
  let cast = (tmdbMovieData.credits && tmdbMovieData.credits.cast) ? tmdbMovieData.credits.cast : [];
  const castIds = cast.map(item => item.id);
  const description = tmdbMovieData.overview;
  let crew = tmdbMovieData.credits.crew;
  let directors = crew.filter(member => member.job == 'Director')
  let writers = crew.filter(member => (member.job == 'Writer' || member.job == 'Screenplay'))
  let genres = tmdbMovieData.genres;
  let year = getYear(tmdbMovieData.release_date);
  const movieData = {
    id, title, poster_path, trailer, description, genres, year,
    cast, castIds, directors, writers
  };
  client.set('movie:' + id, JSON.stringify(movieData));
  return movieData;
}



export async function getSimilarMovies(id) {
  const movieData = await getMovieWithId(id)
  const limitedActorsIds = movieData.castIds.slice(0, 20);
  const directors = movieData.directors;
  const directorIds = directors.map(dir => dir.id);
  const writers = movieData.writers;
  const writerIds = writers.map(mem => mem.id);

  const genres = movieData.genres;
  const genreIds = genres.map(mem => mem.id);

  const directorCreditPromises = directorIds.map(dir => getDirectorCredits(dir));
  const directorCreditsArrs = await Promise.all(directorCreditPromises);
  const actorCreditsArrsPromises = limitedActorsIds.map(actorId => getActorCredits(actorId));
  const actorCreditsArrs = await Promise.all(actorCreditsArrsPromises);
  const movieIdScores = {};

  actorCreditsArrs.forEach(creditsArr => {
    for (const movieId of creditsArr) {
      movieIdScores[movieId] = (movieIdScores[movieId] || 0) + 1;
    }
  });
  directorCreditsArrs.forEach(creditsArr => {
    for (const movieId of creditsArr) {
      movieIdScores[movieId] = (movieIdScores[movieId] || 0) + 1;
    }
  });

  let commonMovieIds = Object.keys(movieIdScores)
    .sort((a, b) => movieIdScores[b] - movieIdScores[a]);

  commonMovieIds = commonMovieIds.filter(newId => newId != id)
  const topCommonMovieIds = commonMovieIds.slice(0, 30);
  // for each movieid get details
  const topMovieDetailsPromises = topCommonMovieIds.map(movieId => getMovieWithId(movieId));
  let topMovieDetails = await Promise.all(topMovieDetailsPromises);
  function isDocumentary(genres) {
    for (let genre of genres)
      if (genre.id == 99)
        return true;
    return false;
  }
  topMovieDetails = topMovieDetails.filter(details => !isDocumentary(details.genres));
  topMovieDetails = topMovieDetails.slice(0, 20);
  const responseArray = [];
  topMovieDetails.forEach(movie => {
    const castInCommon = movie.cast.filter(actor => limitedActorsIds.includes(actor.id));
    const directorsInCommon = movie.directors.filter(dir => directorIds.includes(dir.id));
    const writersInCommon = movie.writers.filter(mem => writerIds.includes(mem.id));
    const genresInCommon = movie.genres.filter(mem => genreIds.includes(mem.id));
    const weight = castInCommon.length + directorsInCommon.length + writersInCommon.length + genresInCommon.length;
    responseArray.push({ movieDetail: movie, castInCommon, directorsInCommon, writersInCommon, genresInCommon, weight })
  });
  return responseArray;
}


async function getActorCredits(actorId) {
  const cacheVal = await client.get('actor:' + actorId)
  incrementCache(cacheVal != null);
  if (cacheVal != null)
    return await JSON.parse(cacheVal);
  const tmdbCreditsData = await fetchWithRetry(`https://api.themoviedb.org/3/person/${actorId}/movie_credits`,
    'GET', tmdbHeaders)
  let credits = tmdbCreditsData.cast;
  const creditIds = credits.map(member => member.id);
  client.set('actor:' + actorId, JSON.stringify(creditIds));
  return creditIds;
}

async function getDirectorCredits(directorId) {
  const cacheVal = await client.get('director:' + directorId)
  incrementCache(cacheVal != null);
  if (cacheVal != null)
    return await JSON.parse(cacheVal);
  const tmdbCreditsData = await fetchWithRetry(`https://api.themoviedb.org/3/person/${directorId}/movie_credits`,
    'GET', tmdbHeaders)
  let credits = tmdbCreditsData.crew;
  credits = credits.filter(credit => credit.job == 'Director')
  const creditIds = credits.map(member => member.id);
  client.set('director:' + directorId, JSON.stringify(creditIds));
  return creditIds;
}

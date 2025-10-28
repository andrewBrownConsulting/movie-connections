'use server'
import client from "./cacheFuncs";
export async function searchForMovie(searchValue) {
  //look in cache
  const cacheVal = await client.get('search:' + searchValue)
  if (cacheVal != null)
    return JSON.parse(cacheVal);
  // else query tmdb
  const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${searchValue}&include_adult=false&language=en-US&page=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM`,
      'Content-Type': 'application/json;charset=utf-8'
    }
  })
  const tmdbData = await response.json();
  tmdbData.results.sort((a, b) => b.popularity - a.popularity);
  tmdbData.results = tmdbData.results.slice(0, 10);

  client.set("search:" + searchValue, JSON.stringify(tmdbData.results) || [])
  if (tmdbData.results == null)
    return [];
  return tmdbData.results;
}

export async function getMovieWithId(id) {
  const cacheVal = await client.get('movie:' + id)
  if (cacheVal != null)
    return cacheVal;

  const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=videos,credits`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM`,
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
  const tmdbMovieData = await response.json();

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
  const movieData = { id, title, poster_path, trailer, cast, castIds };
  client.set('movie' + id, JSON.stringify(movieData));
  return movieData;
}

export async function getSimilarMovies(id) {
  const movieData = await getMovieWithId(id)
  const actorIds = movieData.castIds;
  const limitedActorsIds = actorIds.slice(0, 20);
  const actorCreditsArrsPromises = limitedActorsIds.map(actorId => getActorCredits(actorId));

  const actorCreditsArrs = await Promise.all(actorCreditsArrsPromises);
  const movieIdCounts = {};

  actorCreditsArrs.forEach(creditsArr => {
    for (const movieId of JSON.parse(creditsArr)) {
      movieIdCounts[movieId] = (movieIdCounts[movieId] || 0) + 1;
    }
  });
  // sort by most common and take top 10
  const commonMovieIds = Object.keys(movieIdCounts)
    .sort((a, b) => movieIdCounts[b] - movieIdCounts[a]);
  const topCommonMovieIds = commonMovieIds.filter(movieId => movieId !== id).slice(0, 20);
  // for each movieid get details
  const topMovieDetailsPromises = topCommonMovieIds.map(movieId => getMovieWithId(movieId));
  const topMovieDetails = await Promise.all(topMovieDetailsPromises);
  const responseArray = [];
  topMovieDetails.forEach(movie => {
    const commonCast = movie.cast.filter(actor => actorIds.includes(actor.id));
    responseArray.push({ movieDetail: movie, castInCommon: commonCast })
  });
  return responseArray;
}

async function getActorCredits(actorId) {
  const cacheVal = await client.get('actor:' + actorId)
  if (cacheVal != null)
    return cacheVal;

  const response = await fetch(`https://api.themoviedb.org/3/person/${actorId}?append_to_response=movie_credits`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM`,
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
  const tmdbCreditsData = await response.json();
  let credits = tmdbCreditsData.movie_credits.cast;
  const creditIds = credits.map(member => member.id);
  client.set('actor:' + actorId, JSON.stringify(creditIds));
  return JSON.stringify(creditIds);
}


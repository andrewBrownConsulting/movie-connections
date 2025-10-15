import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import express from "express";
import cors from "cors";
import env from "dotenv";
env.config();
import { getCachedMovieSearchResults, cacheMovieSearchResults } from './redis_query.mjs';
const app = express();

// CORS middleware
app.use(cors());


app.get('/', (req, res) => {
    res.send('Hello, this is the Express server!\n Access /database to get the blog data.');
});

app.get('/search/:search_input', async (req, res) => {
    const search_input = req.params.search_input;
    const cachedResults = await getCachedMovieSearchResults("search:" + search_input);
    if (cachedResults) {
        console.log("search query hit")
        console.log(cachedResults);
        return res.json(cachedResults);
    }

    console.log("tmdb query")
    const tmdbData = await fetch(`https://api.themoviedb.org/3/search/movie?query=${search_input}&include_adult=false&language=en-US&page=1`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    }).then(response => response.json());
    tmdbData.results.sort((a, b) => b.popularity - a.popularity);
    tmdbData.results = tmdbData.results.slice(0, 10);
    cacheMovieSearchResults("search:" + search_input, tmdbData.results || []);
    return res.json(tmdbData.results || []);
});


app.get('/movie/:movieId', async (req, res) => {
    //get the title, trailer, poster, cast
    const movieId = req.params.movieId;
    // Check Redis cache first
    const cachedMovieInfo = await getCachedMovieSearchResults(`movie_info:${movieId}`);
    if (cachedMovieInfo) {
        console.log('Movie Info Cache hit');
        return res.json(cachedMovieInfo);
    }

    console.log('tmdb movie query');
    const tmdbMovieData = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US&append_to_response=videos,credits`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    }).then(response => response.json());
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
    const cast = (tmdbMovieData.credits && tmdbMovieData.credits.cast) ? tmdbMovieData.credits.cast : [];
    const movieData = { id: movieId, title, poster_path, trailer, cast };
    cacheMovieSearchResults(`movie_info:${movieId}`, movieData);
    return res.json(movieData);
});

app.get('/credits/:actorId', async (req, res) => {
    //returns list of movie ids for movies this actor was in
    const actorId = req.params.actorId;
    // check redis cache
    const cachedCreditsData = await getCachedMovieSearchResults(`credits:${actorId}`);
    if (cachedCreditsData) {
        console.log("Credit Info Cache hit");
        return res.json(cachedCreditsData);
    }

    console.log("TMDB credits query");
    const tmdbCreditsData = await fetch(`https://api.themoviedb.org/3/person/${actorId}?append_to_response=movie_credits`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    }).then(response => response.json());
    let credits = tmdbCreditsData.movie_credits.cast;
    const credits_ids = credits.map(member => member.id);
    cacheMovieSearchResults(`credits:${actorId}`, { credit_ids: credits_ids || [] });
    return res.json({ credit_ids: credits_ids || [] });
});

app.get('/similar/:id', async (req, res) => {
    const originalId = req.params.id;
    //start by getting actors in this movie
    const movieData = await fetch(`http://localhost:9005/movie/${originalId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        }
    }).then(response => response.json());
    if (!movieData || !movieData.cast) {
        return res.json({ movies: [], cast_in_common: {} });
    }

    const actorIds = movieData.cast.map(actor => actor.id);
    //limit to first 10 actors
    const limitedActorsIds = actorIds.slice(0, 10);
    //query all actors in parallel
    const actorCreditsPromises = limitedActorsIds.map(actorId => fetch(`http://localhost:9005/credits/${actorId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        }
    }).then(response => response.json()).then(data => ({ actorId, credit_ids: data.credit_ids || [] })));

    const actorCredits = await Promise.all(actorCreditsPromises);

    // find 10 most common moviesids accross all across credits
    const movieIdCounts = {};
    actorCredits.forEach(actor => {
        actor.credit_ids.forEach(movieId => {
            movieIdCounts[movieId] = (movieIdCounts[movieId] || 0) + 1;
        });
    });
    // sort by most common and take top 10
    const commonMovieIds = Object.keys(movieIdCounts)
        .sort((a, b) => movieIdCounts[b] - movieIdCounts[a]);
    const topCommonMovieIds = commonMovieIds.filter(id => id !== originalId).slice(0, 10);
    // for each movieid get details
    const movieDetailsPromises = topCommonMovieIds.map(movieId => fetch(`http://localhost:9005/movie/${movieId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        }
    }).then(response => response.json()));

    const movieDetails = await Promise.all(movieDetailsPromises);


    // get cast in common for each movie
    const castInCommon = {};
    movieDetails.forEach(movie => {
        const commonCast = movie.cast.filter(actor => actorIds.includes(actor.id));
        castInCommon[movie.id] = commonCast;
    });
    return res.json({ movies: movieDetails, cast_in_common: castInCommon });
});
const PORT = process.env.PORT || 9004;

// Load SSL key & certificate
const options = {
    key: fs.readFileSync(path.join("certs", "server.key")),
    cert: fs.readFileSync(path.join("certs", "server.cert"))
};

// Create HTTPS server
https.createServer(options, app).listen(PORT, () => {
    console.log("✅ Express server running on https://localhost:" + PORT);
});
http.createServer(options, app).listen((PORT + 1), () => {
    console.log("✅ Express server running on http://localhost:" + (PORT + 1));
});

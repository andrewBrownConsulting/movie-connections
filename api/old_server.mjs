import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import express from "express";
import cors from "cors";
import { movies_query } from './db.mjs';
import { getCachedMovieSearchResults, cacheMovieSearchResults } from './redis_query.mjs';
const app = express();

// CORS middleware
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello, this is the Express server!\n Access /database to get the blog data.');
});
app.get('/search/:title', (req, res) => {
    const title = req.params.title;
    getCachedMovieSearchResults(title)
        .then(cachedResults => {
            if (cachedResults) {
                console.log('Cache hit');
                return res.json(cachedResults);
            }
            console.log('Basic Cache miss');
            fetch(`https://api.themoviedb.org/3/search/movie?query=${title}&include_adult=false&language=en-US&page=1`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    //sort results by popularity descending
                    data.results.sort((a, b) => b.popularity - a.popularity);
                    //limit to top 5 results
                    data.results = data.results.slice(0, 5);
                    cacheMovieSearchResults(title, data.results || []);
                    return res.json(data.results || []);
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                });
        })
});
app.get('/trailers/:id', (req, res) => {
    const id = req.params.id;
    // Check Redis cache first
    getCachedMovieSearchResults(`trailer:${id}`)
        .then(cachedResults => {
            if (cachedResults) {
                console.log('Cache hit');
                return res.json(cachedResults);
            }
            console.log('trailer cache miss');
            fetch(`https://api.themoviedb.org/3/movie/${id}/videos`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    cacheMovieSearchResults(`trailer:${id}`, data.results || []);
                    return res.json(data.results || []);
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                });
        })
});
app.get('/poster/:id', (req, res) => {
    const id = req.params.id;
    // Check Redis cache first
    getCachedMovieSearchResults(`poster:${id}`)
        .then(cachedResults => {
            if (cachedResults) {
                console.log('Cache hit');
                return res.json(cachedResults);
            }
            console.log('poster cache miss');
            fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-US`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    cacheMovieSearchResults(`poster:${id}`, data.poster_path || []);
                    return res.json(data.poster_path || []);
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                });
        })
});

app.get('/cast/:id', (req, res) => {
    const id = req.params.id;
    // check postgres database
    movies_query(`SELECT actors FROM cast_table WHERE id = $1`, [id])
        .then(cachedResults => {
            if (cachedResults.rowCount > 0) {
                const actorIds = cachedResults.rows[0].actors;
                return res.json(actorIds);
            }
            fetch(`https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    let cast = data.cast;
                    //limit to top 10
                    cast = cast.slice(0, 10);
                    const cast_ids = cast.map(member => member.id);
                    console.log(cast_ids);
                    movies_query(`INSERT INTO cast_table (id, actors) VALUES ($1, $2)`, [id, cast_ids])
                    return res.json(cast_ids || []);
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                });
        })
});
app.get('/credits/:id', (req, res) => {
    const id = req.params.id;
    // check postgres database
    console.log("getting credits for actor id:" + id);
    movies_query(`SELECT movies FROM credit_table WHERE id = $1`, [id])
        .then(cachedResults => {
            if (cachedResults.rowCount > 0) {
                console.log("found cached credits for actor id:" + id);
                return res.json(cachedResults.rows[0].movies);
            }
            fetch(`https://api.themoviedb.org/3/person/${id}?append_to_response=movie_credits`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    let credits = data.movie_credits.cast;
                    //sort by popularity descending
                    credits.sort((a, b) => b.popularity - a.popularity);
                    const credits_ids = credits.map(member => member.id);
                    console.log(credits_ids);
                    movies_query(`INSERT INTO credit_table (id, movies) VALUES ($1, $2)`, [id, credits_ids])
                    return res.json(credits_ids || []);
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                });
        })
});


app.get('/similar/:id', (req, res) => {
    const id = req.params.id;
    //start by getting actors in this movie
    fetch(`http://localhost:9001/cast/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        }
    }).then(response => response.json()).then(data => {
        let actors = data;
        console.log("actors are:")
        console.log(actors);
        let allMovies = [];
        let fetches = actors.map(actor_id => (
            console.log("fetching movies for actor:" + actor_id),
            fetch(`http://localhost:9001/credits/${actor_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                }
            }).then(response => response.json()).then(data => {
                let movies = data;
                console.log("movies are:" + movies);
                allMovies = allMovies.concat(movies);
            })
        ));
        Promise.all(fetches).then(results => {
            //count occurrences of each movie
            let movieCounts = {};
            allMovies.forEach(movie_id => {
                if (movieCounts[movie_id]) {
                    movieCounts[movie_id]++;
                } else {
                    movieCounts[movie_id] = 1;
                }
            });
            //sort by occurrences
            let sortedMovies = Object.keys(movieCounts).sort((a, b) => movieCounts[b] - movieCounts[a]);
            //remove original movie id
            sortedMovies = sortedMovies.filter(movie_id => movie_id != id);
            //limit to top 5
            sortedMovies = sortedMovies.slice(0, 10);
            console.log("similar movies are:" + sortedMovies);
            return res.json(sortedMovies || []);
        });
    }).catch(error => {
        console.error('Error fetching similar movies:', error);
    });
});

app.get('/movie_name/:id', (req, res) => {
    const movieId = req.params.id;
    if (!movieId) {
        return res.status(400).json({ error: 'Movie ID is required' });
    }
    //search in cache first
    getCachedMovieSearchResults(`name:${movieId}`)
        .then(cachedResults => {
            if (cachedResults) {
                console.log('Name Cache hit');
                return res.json({ title: cachedResults });
            }
            console.log('name Cache miss, looking for ' + movieId);
            // fetch movie details for selectedMovie
            fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    console.log("saving to cache-> " + `name:${movieId}`)
                    cacheMovieSearchResults(`name:${movieId}`, data.title || 'Unknown Title');
                    return res.json({ title: data.title || 'Unknown Title' });
                })
                .catch(error => {
                    console.error('Error fetching movie name:', error);
                    return res.status(500).json({ error: 'Failed to fetch movie name' });
                });
        });
});
app.get('/actor-name/:id', (req, res) => {
    const actorId = req.params.id;
    if (!actorId) {
        return res.status(400).json({ error: 'Actor ID is required' });
    }
    //search in cache first
    getCachedMovieSearchResults(`actor_name:${actorId}`)
        .then(cachedResults => {
            if (cachedResults) {
                console.log('Cache hit');
                return res.json({ name: cachedResults });
            }
            console.log('Actor Name Cache miss');
            // fetch movie details for selectedMovie
            fetch(`https://api.themoviedb.org/3/person/${actorId}?language=en-US`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    cacheMovieSearchResults(`actor_name:${actorId}`, data.name || 'Unknown Name');
                    return res.json({ name: data.name || 'Unknown Name' });
                })
                .catch(error => {
                    console.error('Error fetching actor name:', error);
                    return res.status(500).json({ error: 'Failed to fetch actor name' });
                });
        });
});

app.get('/people_in_common/:id1/:id2', async (req, res) => {
    //called like /people_in_common/123/456
    const movieId1 = req.params.id1;
    const movieId2 = req.params.id2;
    if (!movieId1 || !movieId2) {
        return res.status(400).json({ error: 'Both Movie IDs are required' });
    }
    //search in cache first
    const movie1ActorsResult = fetch(`http://localhost:9001/cast/${movieId1}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        }
    }).then(response => response.json());

    const movie2ActorsResult = fetch(`http://localhost:9001/cast/${movieId2}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        }
    }).then(response => response.json());
    Promise.all([movie1ActorsResult, movie2ActorsResult]).then(values => {
        if (values[0] && values[1]) {
            //not implemented caching common actors
            const movie1Actors = values[0];
            const movie2Actors = values[1];
            console.log("movie1 actors: " + movie1Actors);
            console.log("movie2 actors: " + movie2Actors);
            //both found in cache
            const commonActors = movie1Actors.filter(value => movie2Actors.includes(value));
            return res.json({ common_actors: commonActors });
        }
        return res.json({ common_actors: [] }); //not implemented caching common actors
    });
});
const PORT = process.env.PORT || 9000;

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
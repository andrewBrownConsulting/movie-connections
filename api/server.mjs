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
            console.log('Cache miss');
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
            console.log('Cache miss');
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
            console.log('Cache miss');
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
app.get('/similar/:id', (req, res) => {
    const id = req.params.id;
    getCachedMovieSearchResults(`similar:${id}`)
        .then(cachedResults => {
            if (cachedResults) {
                console.log('Cache hit');
                return res.json(cachedResults);
            }
            console.log('Cache miss');
            fetch(`https://api.themoviedb.org/3/movie/${id}/similar?language=en-US&page=1`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZWE0Yzc3YmM5MjRkMmYyNmMxMTdmYmZkY2ZkNjY2NCIsIm5iZiI6MTcyOTEyNDU4Ni41MjcsInN1YiI6IjY3MTA1OGVhNmY3NzA3YWY0MGZhNjk3MCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QZOoB4mdc1ubs_5VGNRoPAvXZOAtwJ9t1lBTPBhfKLM',
                    'Content-Type': 'application/json;charset=utf-8'
                }
            }).then(response => response.json())
                .then(data => {
                    return res.json(data.results || []);
                })
                .catch(error => {
                    console.error('Error fetching similar movies:', error);
                });
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
'use client';
import { useEffect, useState } from "react";
import SearchBar from "./components/SearchBar";
import SimilarList from "./components/SimilarList";
import SimilarGraph from "./components/SimilarGraph.js";
export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState(944);
  const [posterPath, setPosterPath] = useState("");
  const [actorsInMovie, setActorsInMovie] = useState([]);
  function fetchActors() {
    setActorsInMovie([]);
    fetch(`https://localhost:9000/cast/${selectedMovie}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      }
    }).then(response => response.json()).then(data => {
      console.log("actors are:" + data);
      data.forEach(actor_id => (
        fetch(`https://localhost:9000/actor-name/${actor_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json;charset=utf-8'
          }
        }).then(response => response.json()).then(data => {
          setActorsInMovie(prev => [...prev, data.name]);
        })
      ));
    })
  }
  function fetchPoster() {
    fetch(`https://localhost:9000/poster/${selectedMovie}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      }
    }).then(response => response.json()).then(backdrop_path => {
      setPosterPath(backdrop_path ? `https://image.tmdb.org/t/p/w500${backdrop_path}` : "");
    }).catch(error => {
      console.error('Error fetching poster:', error);
    });
  }
  useEffect(() => {
    if (!selectedMovie) return;
    fetchActors();
    fetchPoster();
  }, [selectedMovie]);

  return (
    <div className="container text-center bg-dark">
      <div className="row text-center my-4">
        <SearchBar setSelectedMovie={setSelectedMovie} />
      </div>
      <div className="row">
        {posterPath && <div className="col-6"> <img src={posterPath} className="img-fluid" />
          {actorsInMovie.length > 0 && <div>
            <h3 className="text-light">Actors in this movie:</h3>
            <ul className="text-light">
              {actorsInMovie.map(actor => (
                <li className="text-light" key={actor}>{actor}</li>
              ))}
            </ul>
          </div>}
        </div>}
        <div className="col-6">
          {/* <SimilarList movieId={selectedMovie} setSelectedMovie={setSelectedMovie} /> */}
          <SimilarGraph movieId={selectedMovie} setSelectedMovie={setSelectedMovie} />
        </div>
      </div>
    </div>
  );
}

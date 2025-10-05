'use client';
import { useEffect, useState } from "react";
import SearchBar from "./components/SearchBar";
import SimilarList from "./components/SimilarList";
import SimilarGraph from "./components/SimilarGraph.js";
export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState(944);
  useEffect(() => {
    if (!selectedMovie) return;
    console.log("Selected Movie ID:", selectedMovie);
  }, [selectedMovie]);
  return (
    <div className="container-fluid text-center bg-dark">
      <div className="row text-center">
        <div className="col-12 text-center my-3">
          <h1 className="text-white">Movie Connections</h1>
          <SearchBar setSelectedMovie={setSelectedMovie} />
        </div>
      </div>
      <SimilarGraph movieId={selectedMovie} setSelectedMovie={setSelectedMovie} />
    </div>
  );
}

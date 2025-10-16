'use client';
import { useEffect, useState } from "react";
import SearchBar from "./components/SearchBar";
import SimilarGraph from "./components/SimilarGraph";
export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState(944);
  return (
    <div className="container-fluid text-center ">
      <div id='top-left-search'>
        <h1 className="text-white">Movie Connections</h1>
        <SearchBar setSelectedMovie={setSelectedMovie} />
      </div>
      <SimilarGraph movieId={selectedMovie} setSelectedMovie={setSelectedMovie} />
    </div >
  );
}

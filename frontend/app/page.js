'use client';
import { useState } from "react";
import SearchBar from "./components/SearchBar";
import SimilarGraph from "./components/SimilarGraph";
export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState(948);
  const [keepCompareOpen, setKeepCompareOpen] = useState(false);
  return (
    <div className="container-fluid">
      <div id='top-left-search' >
        <h1 className="text-white">Movie Connections</h1>
        <SearchBar setSelectedMovie={setSelectedMovie} />
      </div>
      <div style={{ position: "absolute", width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button className="wideButton" style={{ backgroundColor: keepCompareOpen ? 'green' : 'blue' }} onClick={() => setKeepCompareOpen(!keepCompareOpen)}>Keep Compare Open</button>
      </div>
      <SimilarGraph movieId={selectedMovie} setSelectedMovie={setSelectedMovie} keepCompareOpen={keepCompareOpen} />
    </div >
  );
}

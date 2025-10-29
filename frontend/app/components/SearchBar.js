'use client'
import { useState, useEffect } from "react";
import { searchForMovie } from "../serverFunctions";
import { getYear } from "../utils";
export default function SearchBar({ setSelectedMovie }) {
  const [searchResults, setSearchResults] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState(0);

  async function searchMovies(query) {
    if (!query) {
      setSearchResults([]);
      return;
    }
    query = query.replace(/ /g, '%20');
    const value = await searchForMovie(query);
    console.log(value);
    setSearchResults(value);
  }
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchMovies(searchValue);
    }, 300); // Adjust the debounce delay as needed
    return () => clearTimeout(delayDebounceFn);
  }, [searchValue]);
  function handleKeyDown(e) {
    if (e.key == "ArrowDown") {
      e.preventDefault()
      if (selected != 9)
        setSelected(prev => prev + 1);
      return;
    }
    if (e.key == "ArrowUp") {
      e.preventDefault()
      if (selected != 0)
        setSelected(prev => prev - 1);
      return;
    }
    if (e.key == "Enter") {
      e.preventDefault()
      setSelectedMovie(searchResults[selected].id);
      setSearchValue('');
      return;
    }
    if (e.key == "ArrowLeft" || e.key == "ArrowRight")
      return;
    setSelected(0);
  }
  return (
    <>
      <input id='searchbar' placeholder="Search Movies" value={searchValue} onChange={e => setSearchValue(e.target.value)} onKeyDown={handleKeyDown} />
      <ul id='dropdown-list'>
        {
          searchResults?.map((movie, i) => {
            if (movie.title)
              return <li className={i == selected ? "selected-dropdown-value" : "dropdown-value"} key={movie.id} onClick={(e) => { setSelectedMovie(movie.id); setSearchValue(''); setSearchResults([]); }
              }> {movie.title}{getYear(movie.release_date)}</li>
          })
        }
      </ul >
    </>
  );
}

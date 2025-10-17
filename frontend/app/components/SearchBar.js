'use client'
import { useState, useEffect } from "react";
export default function SearchBar({ setSelectedMovie }) {
    const [searchResults, setSearchResults] = useState([]);
    const [searchValue, setSearchValue] = useState("");
    const [selected, setSelected] = useState(0);

    function searchMovies(query) {
        if (!query) {
            setSearchResults([]);
            return;
        }
        //search in our redis cache first

        // replace spaces in query with %20 for URL encoding
        query = query.replace(/ /g, '%20');
        fetch(`https://movie_api.andrewb.site/search/${query}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log(data); // Handle the search results
                setSearchResults(data || []);
            })
            .catch(error => {
                console.error('Error fetching search results:', error);
            });
    }
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            searchMovies(searchValue);
        }, 300); // Adjust the debounce delay as needed

        return () => clearTimeout(delayDebounceFn);
    }, [searchValue]);
    function getYear(dateString) {
        if (!dateString) return '';
        return ` (${new Date(dateString).getFullYear()})`;
    }
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
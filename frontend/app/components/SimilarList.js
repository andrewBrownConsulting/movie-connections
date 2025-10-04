import { useEffect, useState } from "react"

export default function SimilarList({ movieId, setSelectedMovie }) {
    const [similarMovies, setSimilarMovies] = useState([]);
    useEffect(() => {
        if (!movieId) return;
        // fetch similar movies for movieId
        fetch(`https://localhost:9000/similar/${movieId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
            .then(response => response.json())
            .then(similar_ids => {
                setSimilarMovies([]);
                similar_ids.forEach(similar_id => {
                    fetch(`https://localhost:9000/movie_name/${similar_id}`, {
                    }).then(response => response.json()).then(data => {
                        console.log("similar movie name: " + data.title);
                        setSimilarMovies(prev => [...prev, { id: similar_id, title: data.title }]);
                    });
                });
            })
            .catch(error => {
                console.error('Error fetching similar movies:', error);
            });
    }, [movieId]);
    return (
        <div>
            <h1 className="text-light">Similar List for {movieId}</h1>
            <ul>
                {similarMovies.map(similar_movie => (
                    <li key={similar_movie.id} className="text-light movies-list" onClick={() => setSelectedMovie(similar_movie.id)}>{similar_movie.title}</li>
                ))}
            </ul>
        </div>
    )
}
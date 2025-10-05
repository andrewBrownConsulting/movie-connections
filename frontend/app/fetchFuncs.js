export async function fetchSimilarMovies(movieId, setSimilarMovies, setCastInCommon) {
    const response = await fetch(`https://localhost:9000/similar/${movieId}`);
    const data = await response.json();
    return data;
}
export async function fetchMovieDetails(movieId, setSelectedMovieInfo) {
    const response = await fetch(`https://localhost:9000/movie/${movieId}`);
    const data = await response.json();
    setSelectedMovieInfo(data);
    return data;
}

export function getTMDBImagePath(posterPath, nodeRadius) {
    if (nodeRadius > 60) {
        return `https://image.tmdb.org/t/p/w400${posterPath}`;
    } else if (nodeRadius > 30) {
        return `https://image.tmdb.org/t/p/w200${posterPath}`;
    }
    return `https://image.tmdb.org/t/p/w92${posterPath}`;
}

export async function fetchSimilarMovies(movieId) {
    const response = await fetch(`http://localhost:9005/similar/${movieId}`);
    const data = await response.json();
    return data;
}
export async function fetchMovieDetails(movieId) {
    const response = await fetch(`http://localhost:9005/movie/${movieId}`);
    const data = await response.json();
    return data;
}

export function getTMDBImagePath(posterPath, nodeRadius) {
    if (nodeRadius > 60) {
        return `https://image.tmdb.org/t/p/w400${posterPath}`;
    } else if (nodeRadius > 26) {
        return `https://image.tmdb.org/t/p/w200${posterPath}`;
    }
    return `https://image.tmdb.org/t/p/w92${posterPath}`;
}

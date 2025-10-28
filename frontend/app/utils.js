export function getTMDBImagePath(posterPath, nodeRadius) {
  if (nodeRadius > 60) {
    return `https://image.tmdb.org/t/p/w400${posterPath}`;
  } else if (nodeRadius > 26) {
    return `https://image.tmdb.org/t/p/w200${posterPath}`;
  }
  return `https://image.tmdb.org/t/p/w92${posterPath}`;
}

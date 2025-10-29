export function getTMDBImagePath(posterPath, nodeRadius) {
  if (nodeRadius > 100)
    return `https://image.tmdb.org/t/p/original${posterPath}`;
  if (nodeRadius > 60) {
    return `https://image.tmdb.org/t/p/w400${posterPath}`;
  } else if (nodeRadius > 26) {
    return `https://image.tmdb.org/t/p/w200${posterPath}`;
  }
  return `https://image.tmdb.org/t/p/w92${posterPath}`;
}

export function getYear(dateString) {
  if (!dateString) return '';
  return ` (${new Date(dateString).getFullYear()})`;
}
export function getTrailer(trailer) {
  if (trailer == null)
    return ''
  const key = trailer.key;
  const url = "https://www.youtube.com/embed/" + key;
  return `<iframe width="1234" height="532" src=${url} frameborder="0" allowfullscreen></iframe>`
}

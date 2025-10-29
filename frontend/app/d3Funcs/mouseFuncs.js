import { getTMDBImagePath } from "../utils";
import * as d3 from 'd3'
import { makeTooltip } from "./makeObjects";
export function handleMouseOver(e, d, movieData) {
  if (d.id == movieData[0].id)
    return;
  d.visible = 'visible';
  let htmlString = '';
  htmlString += '<h1>' + d.title + '</h1>'
  htmlString += '<div class="row row-cols-2">'
    + '<img src=' + getTMDBImagePath(movieData[0].image, 1000) + '/>'
    + '<img src=' + getTMDBImagePath(d.image, 1000) + '/>'
    + '</div>'

  if (d.castInCommon.length != 0)
    htmlString += '<h2>Cast in Common</h2>'
      + '<ul>'
      + d.actorsInCommonList
      + '</ul>'
  if (d.directorsInCommon.length != 0)
    htmlString += '<h2>Directors in Common</h2>'
      + '<ul>'
      + d.directorsInCommonList
      + '</ul>'
  if (d.writersInCommon.length != 0)
    htmlString += '<h2>Writers in Common</h2>'
      + '<ul>'
      + d.writersInCommonList
      + '</ul>'
  if (d.genresInCommon.length != 0)
    htmlString += '<h2>Genres in Common</h2>'
      + '<ul>'
      + d.genresInCommonList
      + '</ul>'
  d3.select('#tooltip').style('visibility', 'visible')
    .html(htmlString)
}
export function handleMouseLeave(e, d, movieData, keepCompareOpen) {
  e.preventDefault();
  d.visible = 'hidden';
  if (keepCompareOpen) return;
  const mainMovie = movieData[0].movieData;
  makeTooltip(mainMovie);
}
export async function handleClick(e, d, setSelectedMovie, keepCompareOpen, movieData) {
  setSelectedMovie(d.id);
  handleMouseLeave(e, d, movieData, keepCompareOpen)
}
export function makeDrag(update) {
  const drag = d3.drag()
    .on('drag', (e, d) => {
      e.subject.fx = e.x;
      e.subject.fy = e.y;
      update();
    })
    .on('end', (e, d) => {
      e.subject.fx = null;
      e.subject.fy = null;
    });
  return drag;
}

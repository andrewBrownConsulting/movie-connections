import { handleClick, handleMouseLeave, handleMouseOver } from "./mouseFuncs";
import { getTMDBImagePath } from "../utils";
import * as d3 from 'd3'
import { getTrailer } from "../utils";
export function makePatterns(selection, movieData) {
  const patterns = selection.select('defs')
    .selectAll('pattern')
    .data(movieData, d => d.id)
    .enter()
    .append('pattern')
    .attr('id', d => `image-${d.id}`)
    .attr('width', 1)
    .attr('height', 1);
  return patterns;
}
export function makeImages(patterns, movieData) {
  const images = patterns.selectAll('image')
    .data(movieData, d => d.id)
    .enter()
    .append('image')
    .attr('href', d => d.image)
    .attr('width', d => d.rad * 2)
    .attr('height', d => d.rad * 2)
    .attr('preserveAspectRatio', 'xMidYMid slice')
  return images;
}
export function makeLinkLines(selection, links) {
  const linkLines = selection.selectAll('line').data(links)
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y)
    .lower()
    .enter()
    .append('line')
    .attr('stroke', '#999')
    .attr('stroke-width', 2);
  return linkLines;
}
export function makeCircles(selection, movieData, drag, setSelectedMovie, keepCompareOpen) {
  const circles = selection
    .selectAll('circle')
    .data(movieData, d => d.id)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .on('click', (e, d) => handleClick(e, d, setSelectedMovie, keepCompareOpen, movieData))
    .on('mouseenter', (e, d) => handleMouseOver(e, d, movieData))
    .on('mouseleave', (e, d) => handleMouseLeave(e, d, movieData, keepCompareOpen))
    .enter()
    .append('circle')
    .attr('fill', d => `url(#image-${d.id})`)
    .call(drag)
    .attr('r', 0)
    .transition()
    .attr('r', d => d.rad)
  return circles;
}

export function makeTitles(selection, movieData) {
  const titles = selection
    .selectAll('text')
    .data(movieData, d => d.id)
    .attr('x', d => d.x)
    .attr('y', d => d.y - (d.rad + 5))
    .attr('text-anchor', 'middle')
    .style('visibility', d => d.visible)
    .text(d => d.title)
    .raise()
    .enter()
    .append('text')
    .attr('font-size', '2em')
    .attr('fill', 'white')
    .attr('stroke', 'black')
    .style('stroke-width', '1px')
  return titles;
}
export function makeTooltip(info) {
  const directorsPrint = info.directors.map(member => member.name).join(', ')
  const writersPrint = info.writers.map(member => member.name).join(', ')
  const mainCast = info.cast.slice(0, 10);
  const castList = mainCast.map(actor => '<li>' + actor.name + ' - ' + actor.character + '</li>').join(' ')
  const genreList = info.genres.map(genre => genre.name).join(', ');
  d3.select('#tooltip').style('visibility', 'visible')
    .html(
      '<img src=' + getTMDBImagePath(info.poster_path, 1000) + '/>'
      + '<h1>' + info.title + info.year + '</h1>'
      + '<p>Directed by: ' + directorsPrint + '</p>'
      + '<p>Written by: ' + writersPrint + '</p>'
      + '<p>Genres: ' + genreList + '</p>'
      + '<p>' + info.description + '</p>'
      + '<h2>Cast: </h2>'
      + '<ul>' + castList + '</ul>'
      + getTrailer(info.trailer)
    )
}

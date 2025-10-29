import { makeTooltip } from './d3Funcs/makeObjects';
import { getMovieWithId, getSimilarMovies } from './serverFunctions';
import { getTMDBImagePath } from './utils';
import * as d3 from 'd3'

const timeBetweenSpawns = 200;
const minScale = 1 / 30;
const maxScale = 1 / 10;
const mainScale = 1 / 8;
const scaleRange = 10;

export async function updateSimilarMovies(movieId, cancelLoopRef, setMovieData, setLinks) {
  const width = window.innerWidth * 2 / 3;
  const height = window.innerHeight
  function getRadius(number) {

    const min = width * minScale;
    const max = width * maxScale;

    if (number > scaleRange)
      return max;
    return min + (number / scaleRange) * (max - min);
  }
  const similarData = await getSimilarMovies(movieId);
  let counter = 0;
  let similarLength = similarData.length;
  for (const entry of similarData) {
    counter++;
    if (cancelLoopRef.current)
      break;
    const newDetail = entry.movieDetail;
    const actorsInCommonList = entry.castInCommon.map(actor => "<li>" + actor.name + "</li>").join(' ')
    const directorsInCommonList = entry.directorsInCommon.map(dir => '<li>' + dir.name + '</li>').join(' ')
    const writersInCommonList = entry.writersInCommon.map(mem => '<li>' + mem.name + '</li>').join(' ')
    const genresInCommonList = entry.genresInCommon.map(mem => '<li>' + mem.name + '</li>').join(' ')
    const { castInCommon, directorsInCommon, writersInCommon, genresInCommon } = entry;
    const rad = getRadius(entry.weight);
    const id = newDetail.id;
    //randomize the spawn location
    const x = width / 2 + width / 2 * Math.sin(Math.PI * 4 / similarLength * counter)
    const y = height / 2 + height / 2 * Math.cos(Math.PI * 4 / similarLength * counter)
    const image = getTMDBImagePath(newDetail.poster_path, rad);
    const title = newDetail.title;
    const visible = 'hidden'
    const newItem = {
      id, rad, image, x, y, title, visible,
      castInCommon, directorsInCommon, writersInCommon, genresInCommon,
      actorsInCommonList, directorsInCommonList, writersInCommonList
      , genresInCommonList
    };
    setMovieData(prev => [...prev, newItem]);
    setLinks(prev => [...prev, { source: movieId, target: id }]);

    await new Promise(resolve =>
      setTimeout(resolve, timeBetweenSpawns));
  }
}

export async function getNewMovieData(cancelLoopRef, svgRef, setMovieData, setLinks, movieId) {
  const width = window.innerWidth * 2 / 3;
  const height = window.innerHeight;
  cancelLoopRef.current = true;
  await new Promise(resolve => setTimeout(resolve, timeBetweenSpawns));
  cancelLoopRef.current = false;
  d3.select(svgRef.current).select('g').remove();
  d3.select(svgRef.current).append('g').append('defs')
  setMovieData([]);
  setLinks([]);

  getMovieWithId(movieId).then(res => {
    const rad = width * mainScale;
    const id = res.id;
    const title = res.title
    const image = getTMDBImagePath(res.poster_path, rad);
    const trailer = res.trailer;
    const visible = 'hidden';
    setMovieData([{
      id, rad,
      image, x: width / 2, y: height / 2, title, visible, movieData: res, trailer
    }]);
    makeTooltip(res);
  });
  updateSimilarMovies(movieId, cancelLoopRef, setMovieData, setLinks);
}

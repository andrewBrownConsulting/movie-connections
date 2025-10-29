import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'
import { getTMDBImagePath, getTrailer } from '../utils';
import { makeSimulation } from '../d3Funcs/simulation';
import { makeCircles, makeImages, makeLinkLines, makePatterns, makeTitles } from '../d3Funcs/makeObjects';
import { makeDrag } from '../d3Funcs/mouseFuncs';
import { getNewMovieData } from '../fetchFuncs';
export default function SimilarGraph({ movieId, setSelectedMovie, keepCompareOpen }) {
  const cancelLoopRef = useRef(false);
  const svgRef = useRef(null);
  const [movieData, setMovieData] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    getNewMovieData(cancelLoopRef, svgRef, setMovieData, setLinks, movieId);
  }, [movieId]);

  useEffect(() => {
    const width = window.innerWidth * 2 / 3;
    const height = window.innerHeight;
    const selection = d3.select(svgRef.current).select('g');
    const drag = makeDrag(update);
    function update() {
      if (!movieData)
        return;
      const patterns = makePatterns(selection, movieData);
      const images = makeImages(patterns, movieData);
      const circles = makeCircles(selection, movieData, drag, setSelectedMovie, keepCompareOpen);
      const titles = makeTitles(selection, movieData);
      const linkLines = makeLinkLines(selection, links);
    }
    const simulation = makeSimulation(movieData, width, height, links, update);
    update();
    return () => {
      simulation.stop();
    };
  }, [movieData.length, keepCompareOpen])
  useEffect(() => {
    const width = window.innerWidth * 2 / 3;
    const height = window.innerHeight;
    d3.select(svgRef.current).attr('width', width).attr('height', height).select('g').remove();
    const svgd3 = d3.select(svgRef.current).attr('width', width).attr('height', height);
    svgd3.append('g').append('defs')
    function handleZoom(e) {
      d3.select('g')
        .attr('transform', e.transform);
    }
    const zoom = d3.zoom().on('zoom', handleZoom);
    svgd3.call(zoom);
    return () => d3.select('svg g').remove();
  }, [])

  return (
    <div className='' id='outer_div'>
      <div className='row'>
        <svg className='col-8' ref={svgRef}>
        </svg>
        <div id='tooltip' className='col-4 overflow-scroll'></div>
      </div>
    </div>
  )
}

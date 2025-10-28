import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'
import { getMovieWithId, getSimilarMovies } from '../serverFunctions';
import { getTMDBImagePath } from '../utils';
const timeBetweenSpawns = 200;
const minScale = 1 / 50;
const maxScale = 1 / 15;
const mainScale = 1 / 10;
const scaleRange = 10;
export default function SimilarGraph({ movieId, setSelectedMovie }) {
  const cancelLoopRef = useRef(false);
  const svgRef = useRef(null);
  const [movieData, setMovieData] = useState([]);
  const [links, setLinks] = useState([]);

  async function updateSimilarMovies(mainId) {
    const width = window.innerWidth * 2 / 3;
    const height = window.innerHeight
    function getRadius(number) {

      const min = width * minScale;
      const max = width * maxScale;

      if (number > scaleRange)
        return max;
      return min + (number / scaleRange) * (max - min);
    }
    const similarData = await getSimilarMovies(mainId);
    console.log('similar data:')
    console.log(similarData);
    for (const entry of similarData) {
      if (cancelLoopRef.current)
        break;
      const newDetail = entry.movieDetail;
      const actorsInCommon = entry.castInCommon;
      const radius = getRadius(actorsInCommon.length);
      const actorsInCommonList = actorsInCommon.map(actor => "<li>" + actor.name + "</li>").join(' ')
      const id = newDetail.id;
      //randomize the spawn location
      const x = width * (Math.random())
      const y = height * (Math.random())
      const poster = getTMDBImagePath(newDetail.poster_path, radius);
      const title = newDetail.title;
      setMovieData(prev => [...prev, { id: id, rad: radius, image: poster, x: x, y: y, title: title, visible: 'hidden', actorsInCommonList: actorsInCommonList }]);
      setLinks(prev => [...prev, { source: movieId, target: id }]);
      await new Promise(resolve =>
        setTimeout(resolve, timeBetweenSpawns));
    }
  }

  async function getNewMovieData() {
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
      const radius = width * mainScale;
      const id = res.id;
      const title = res.title
      const poster = getTMDBImagePath(res.poster_path, radius);
      setMovieData([{ id: movieId, rad: radius, image: poster, x: width / 2, y: height / 2, title: title, main: true, visible: 'hidden', movieData: res }]);
      setMainMovieInfo(res);
    });
    updateSimilarMovies(movieId);
  }
  useEffect(() => {
    getNewMovieData();
  }, [movieId]);
  function setMainMovieInfo(info) {
    const mainCast = info.cast.slice(0, 10);
    const castList = mainCast.map(actor => '<li>' + actor.name + ' - ' + actor.character + '</li>').join(' ')
    d3.select('#tooltip').style('visibility', 'visible')
      .html('<h1>' + info.title + '</h1>'
        + '<img src=' + getTMDBImagePath(info.poster_path, 1000) + '/>'
        + '<ul>' + castList + '</ul>'
      )
  }
  useEffect(() => {
    const width = window.innerWidth * 2 / 3;
    const height = window.innerHeight;
    function handleMouseOver(e, d) {
      d.visible = 'visible';
      if (d.actorsInCommonList)
        d3.select('#tooltip').style('visibility', 'visible')
          .html('<h1>' + d.title + '</h1>'
            + '<h2>Cast in Common</h2>'
            + '<ul>'
            + d.actorsInCommonList
            + '</ul>'
          )
    }
    function handleMouseLeave(e, d) {
      d.visible = 'hidden';
      const mainMovie = movieData[0].movieData;
      setMainMovieInfo(mainMovie);
    }
    function handleMouseMove(e, d) {
      d3.select('#tooltip')
        .style('top', e.offsetY + 'px')
        .style('left', e.offsetX + 150 + 'px');
    }
    const selection = d3.select(svgRef.current).select('g');
    async function handleClick(e, d) {
      setSelectedMovie(d.id);
      handleMouseLeave(e, d)
    }
    const drag = d3.drag()
      .on('drag', (e, d) => {
        e.subject.fx = e.x;
        e.subject.fy = e.y;
        update();
      })
      .on('end', (e, d) => {
        e.subject.fx = null;
        e.subject.fy = null;
      })
    function update() {
      if (!movieData)
        return;

      const circleGroups = selection.selectAll('g')
        .data(movieData, d => d.id)
        .enter()
        .append('g')

      selection.select('defs')
        .selectAll('pattern')
        .data(movieData, d => d.id)
        .enter()
        .append('pattern')
        .attr('id', d => `image-${d.id}`)
        .attr('width', 1)
        .attr('height', 1)
        .selectAll('image')
        .data(movieData, d => d.id)
        .enter()
        .append('image')
        .attr('href', d => d.image)
        .attr('width', d => d.rad * 2)
        .attr('height', d => d.rad * 2)
        .attr('preserveAspectRatio', 'xMidYMid slice')

      const linkLines = selection.selectAll('line').data(links)
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .lower()
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-width', 2)


      const circles = selection
        .selectAll('circle')
        .data(movieData, d => d.id)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .on('click', handleClick)
        .on('mouseover', handleMouseOver)
        .on('mouseleave', handleMouseLeave)
        .on('mousemove', handleMouseMove)
        .enter()
        .append('circle')
        .attr('fill', d => `url(#image-${d.id})`)
        .call(drag)
        .attr('r', 0)
        .transition()
        .attr('r', d => d.rad)

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
      // .style('stroke-linejoin', 'round')
      //non working transition
      // .attr('opacity', 1)
      // .transition()
      // .delay(1000)
      // .duration(1000)
      // .attr('opacity', 0)

    }
    const simulation = d3.forceSimulation(movieData)
      // .force('center', d3.forceCenter(width / 2, height / 2).strength(1))
      .force('x', d3.forceX(width / 2).strength(0.01))
      .force('y', d3.forceY(height / 2).strength(0.01))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('collision', d3.forceCollide().radius(d => d.rad))
      .force('links', d3.forceLink(links).id(d => d.id).strength(0.01))
      .alphaDecay(0)
      .on('tick', update);
    update();
    return () => {
      simulation.stop();
    };

  }, [movieData.length])
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

import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'
import { fetchMovieDetails, fetchSimilarMovies, getTMDBImagePath } from '../fetchFuncs';
import { resolve } from 'styled-jsx/css';
const width = 1000;
const height = 500;
const timeBetweenSpawns = 500;
export default function SimilarGraph({ movieId, setSelectedMovie }) {
    const intialized = useRef(false);
    const cancelLoopRef = useRef(false);
    const svgRef = useRef(null);
    const [movieData, setMovieData] = useState([]);
    const [links, setLinks] = useState([]);

    async function updateSimilarMovies(mainId) {
        const similarData = await fetchSimilarMovies(mainId);
        console.log(similarData);
        for (const item of similarData.movies) {
            if (cancelLoopRef.current)
                break;
            const newDetail = await fetchMovieDetails(item.id);
            const radius = 40;
            const id = newDetail.id;
            //randomize the spawn location
            const x = width * (Math.random())
            const y = height * (Math.random())
            const poster = getTMDBImagePath(newDetail.poster_path, radius);
            const title = newDetail.title;
            setMovieData(prev => [...prev, { id: id, rad: radius, image: poster, x: x, y: y, title: title, opacity: 0 }]);
            setLinks(prev => [...prev, { source: movieId, target: item.id }]);
            await new Promise(resolve =>
                setTimeout(resolve, timeBetweenSpawns));
        }
    }

    async function getNewMovieData() {
        console.log('movie id is', movieId)
        cancelLoopRef.current = true;
        await new Promise(resolve => setTimeout(resolve, timeBetweenSpawns));
        cancelLoopRef.current = false;
        d3.select(svgRef.current).select('g').remove();
        d3.select(svgRef.current).append('g').append('defs')
        setMovieData([]);
        fetchMovieDetails(movieId).then(res => {
            const radius = 100;
            const id = res.id;
            const title = res.title
            const poster = getTMDBImagePath(res.poster_path, radius);
            setMovieData([{ id: movieId, rad: radius, image: poster, x: width / 2, y: height / 2, title: title }]);
        });
        updateSimilarMovies(movieId);
    }
    useEffect(() => {
        getNewMovieData();
    }, [movieId]);


    useEffect(() => {
        function handleMouseOver(e, d) {
            console.log(d)
            e.target.__data__.opacity = 1;

            // // console.log(e)
            // // console.log(e.target.__data__.title)
            // d3.select(e.srcElement);

            // d3.select('svg')
            //     .append('text')
            //     .attr('x', d.x)
            //     .attr('y', d.y)
            //     .attr('color', 'white')
            //     .text(e.target.__data__.title)

        }
        const selection = d3.select(svgRef.current).select('g');
        async function handleClick(id) {
            setSelectedMovie(id);
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

            selection
                .selectAll('circle')
                .data(movieData, d => d.id)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .on('click', (e, d) => handleClick(d.id))
                .on('mouseover', handleMouseOver)
                .enter()
                .append('circle')
                .attr('fill', d => `url(#image-${d.id})`)
                .call(drag)
                .attr('r', 0)
                .transition()
                .attr('r', d => d.rad)

            selection
                .selectAll('text')
                .data(movieData, d => d.id)
                .attr('x', d => d.x)
                .attr('y', d => d.y - (d.rad + 5))
                .attr('text-anchor', 'middle')
                .enter()
                .append('text')
                .text(d => d.title)
                .attr('font-size', '2em')
                .attr('fill', 'white')
                .attr('stroke', 'black')
                .style('stroke-width', '1px')
                .style('stroke-linejoin', 'round')
                .attr('opacity', 1)
                .raise()
                .transition()
                .delay(1000)
                .duration(1000)
                .attr('opacity', d => d.opacity)


        }
        const simulation = d3.forceSimulation(movieData)
            .force('x', d3.forceX(width / 2).strength(0.01))
            .force('y', d3.forceY(height / 2).strength(0.01))
            .force('charge', d3.forceManyBody().strength(10))
            .force('collision', d3.forceCollide().radius(d => d.rad))
            .alphaDecay(0)
            // .force('links', d3.forceLink(links).id(d => d.id).strength(0.01))
            .on('tick', update);

        update();
        return () => simulation.stop();
    }, [movieData.length])
    useEffect(() => {
        d3.select(svgRef.current).select('g').remove();
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
        <svg width={width} height={height} ref={svgRef}>
        </svg>
    )
}
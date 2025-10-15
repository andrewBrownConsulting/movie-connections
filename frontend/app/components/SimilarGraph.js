import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'
import { fetchMovieDetails, fetchSimilarMovies, getTMDBImagePath } from '../fetchFuncs';
const width = 1000;
const height = 500;

export default function SimilarGraph({ movieId }) {
    let numMovies = 0;
    const [movieData, setMovieData] = useState([]);
    const linkRef = useRef([]);

    async function updateSimilarMovies(mainId) {
        const similarData = await fetchSimilarMovies(mainId);
        console.log(similarData);
        for (const item of similarData.movies) {
            const newDetail = await fetchMovieDetails(item.id);
            const radius = 40;
            const id = newDetail.id;
            //randomize the spawn location
            const x = width * (Math.random())
            const y = height * (Math.random())
            const poster = getTMDBImagePath(newDetail.poster_path, radius);
            setMovieData(prev => [...prev, { id: id, rad: radius, image: poster, x: x, y: y }]);
            // linkRef.current.push({ source: movieId, target: item.id });
            numMovies++;
            await new Promise(resolve =>
                setTimeout(resolve, 1000));
            console.log('sleeping for 1 second before next request')
        }
    }

    useEffect(() => {
        console.log('movie id is', movieId)
        fetchMovieDetails(movieId).then(res => {
            const radius = 100;
            const id = res.id;
            const poster = getTMDBImagePath(res.poster_path, radius);
            setMovieData([{ id: movieId, rad: radius, image: poster, x: width / 2, y: height / 2 }]);
        });
        updateSimilarMovies(movieId);
    }, [movieId]);

    useEffect(() => {
        const selection = d3.select('svg')
            .attr('width', width)
            .attr('height', height).append('g')
        function update() {
            if (!movieData)
                return;
            console.log('update')
            //add the patterns of images
            selection.call(zoom)
            selection.append('defs')
                .selectAll('pattern').data(movieData, d => d.id)
                .join('pattern')
                .attr('id', d => `image-${d.id}`)
                .attr('width', 1)
                .attr('height', 1)
                .append('image')
                .attr('href', d => d.image)
                .attr('width', d => d.rad * 2)
                .attr('height', d => d.rad * 2)
                .attr('preserveAspectRatio', 'xMidYMid slice')

            const circles = selection.selectAll('circle');
            //on enter, bind them
            selection.selectAll('circle').data(movieData, d => d.id)
                .join('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .call(drag)
                .attr("r", 0)
                .style("opacity", 0)
                .transition()
                .duration(500)
                .ease(d3.easeBackOut)  // Bouncy effect
                .attr("r", d => d.rad)
                .style("opacity", 1)
                .attr('fill', d => `url(#image-${d.id})`)

            // initDrag();
            // initZoom();
        }
        d3.forceSimulation(movieData)
            .force('x', d3.forceX(width / 2).strength(0.01))
            .force('y', d3.forceY(height / 2).strength(0.01))
            .force('charge', d3.forceManyBody().strength(10))
            .force('collision', d3.forceCollide().radius(d => d.rad))
            .alphaDecay(0)
            // .force('links', d3.forceLink(links).id(d => d.id).strength(0.01))
            .on('tick', update);

        function handleDrag(e) {
            e.subject.x = e.x;
            e.subject.y = e.y;
            update();
        }
        const drag = d3.drag().on('drag', handleDrag);
        // function initDrag() {
        //     d3.select('svg g').selectAll('circle').call(drag);
        // }
        function handleZoom(e) {
            d3.select('g')
                .attr('transform', e.transform);
        }
        const zoom = d3.zoom().on('zoom', handleZoom);
        // function initZoom() {
        //     d3.select('svg').call(zoom);
        // }
        update();
        return () =>
            d3.select('svg g').remove()

    }, [movieData])



    return (
        <svg>
        </svg>
    )
}
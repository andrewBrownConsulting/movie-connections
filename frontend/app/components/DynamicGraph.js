'use client'
import * as d3 from "d3";
import { useState, useEffect, useRef, use } from "react";

export default function SimilarGraph({ movieId, setSelectedMovie }) {
    const minimumNodeRadius = 30;
    const maximumNodeRadius = 100;
    const actorScaleFactor = 15;
    const fontSize = 18;
    const gap = 200;
    const width = 1000, height = 600;

    const graphRef = useRef(null);
    const [selectedMovieInfo, setSelectedMovieInfo] = useState(null);
    const [similarMovies, setSimilarMovies] = useState(null);
    const [castInCommon, setCastInCommon] = useState(null);
    const svg = d3.select(graphRef.current).attr("width", width).attr("height", height);

    const fetchSimilarMovies = async (movieId) => {
        const response = await fetch(`https://localhost:9000/similar/${movieId}`);
        const data = await response.json();
        console.log("Similar movies data:", data);
        setSimilarMovies(data.movies || []);
        setCastInCommon(data.cast_in_common || {});
    }
    const fetchMovieDetails = async (movieId) => {
        const response = await fetch(`https://localhost:9000/movie/${movieId}`);
        const data = await response.json();
        setSelectedMovieInfo(data);
    }
    useEffect(() => {
        if (movieId) {
            fetchMovieDetails(movieId);
            fetchSimilarMovies(movieId);
        }
    }, [movieId]);
    function handleNodeClick(event, d) {
        setSelectedMovie(d.id === "central" ? movieId : d.id);
    }

    function extractTooltipText(actorsInCommon) {
        if (!actorsInCommon || actorsInCommon.length === 0) return "No cast in common";
        let tooltip = "Cast in common:\n";
        actorsInCommon.forEach(actor => {
            tooltip += `- ${actor.name}\n`;
        });
        return tooltip;
    }
    function getTMDBImagePath(posterPath, nodeRadius) {
        if (nodeRadius > 60) {
            return `https://image.tmdb.org/t/p/w400${posterPath}`;
        } else if (nodeRadius > 30) {
            return `https://image.tmdb.org/t/p/w200${posterPath}`;
        }
        return `https://image.tmdb.org/t/p/w92${posterPath}`;
    }
    function handleNodeMouseOver(event, d) {
        // Show tooltip or highlight node
        d3.select(event.currentTarget)
            .append("text")
            .text(d.title)
            .attr("x", 0)
            .attr("y", -d.nodeRadius - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", "15px")
            .attr("stroke", "black")
            .attr("stroke-width", 0.2)
            .attr("fill", "white");
        d3.select(event.currentTarget)
            .attr("stroke", "steelblue")
            .attr("stroke-width", 3)
            .attr("r", d => d.id === "central" ? d.nodeRadius + 4 : d.nodeRadius - 4);
    }
    function handleNodeMouseOut(event, d) {
        d3.select(event.currentTarget)
            .select("text")
            .remove();
        d3.select(event.currentTarget)
            .attr("stroke", null)
            .attr("stroke-width", null)
            .attr("r", d => d.id === "central" ? d.nodeRadius : d.nodeRadius - 4);
    }
    function calculateNodeRadius(actorsInCommon) {
        //min 40 max 80
        if (actorsInCommon * actorScaleFactor < minimumNodeRadius) return minimumNodeRadius;
        if (actorsInCommon * actorScaleFactor > maximumNodeRadius) return maximumNodeRadius;
        return actorsInCommon * actorScaleFactor;
    }
    function forceBoundary(x0, y0, x1, y1, strength = 0.1) {
        let nodes;

        function force(alpha) {
            for (const node of nodes) {
                if (node.x < x0) node.vx += (x0 - node.x) * strength * alpha;
                if (node.x > x1) node.vx += (x1 - node.x) * strength * alpha;
                if (node.y < y0) node.vy += (y0 - node.y) * strength * alpha;
                if (node.y > y1) node.vy += (y1 - node.y) * strength * alpha;
            }
        }

        force.initialize = function (_) {
            nodes = _;
        };

        return force;
    }


    useEffect(() => {
        if (!similarMovies || similarMovies.length === 0) return;
        const nodes = [
            { id: 'central', label: selectedMovieInfo.title || 'Loading...', img: selectedMovieInfo.poster_path, nodeRadius: maximumNodeRadius, tooltip: selectedMovieInfo.title || 'Loading...', actors_in_common: 0 },
            ...Array.from({ length: similarMovies.length }, (_, i) => ({ id: `${similarMovies[i]?.id}`, tooltip: extractTooltipText(castInCommon[similarMovies[i]?.id]), img: similarMovies[i]?.poster_path, nodeRadius: calculateNodeRadius(castInCommon[similarMovies[i]?.id].length), title: similarMovies[i]?.title || 'Unknown Title' }))
        ]
        const links = nodes
            .filter(n => n.id !== 'central')
            .map(n => ({ source: 'central', target: n.id }));
        console.log(links);


        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(gap))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.nodeRadius + 10))
            .force("boundary", forceBoundary(0, 0, width, height, 10));

        // draw edges
        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", 2);

        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "#333")
            .style("color", "#fff")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("opacity", 0);

        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("g") // group for each node
            .data(nodes)
            .join("g")
            .call(drag(simulation)) // enable drag
            .on("click", handleNodeClick)
            .on("mouseover", (event, d) => {
                handleNodeMouseOver(event, d);
                tooltip.transition().duration(150).style("opacity", 1);
                tooltip.html(d.tooltip || d.label)
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 20 + "px");
            })
            .on("mousemove", (event, d) => {
                tooltip
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 20 + "px");
            })
            .on("mouseout", (event, d) => {
                handleNodeMouseOut(event, d);
                tooltip.transition().duration(150).style("opacity", 0);
            });

        // add circle as background (optional)
        node.append("circle")
            .attr("r", d => d.id === "central" ? maximumNodeRadius : d.nodeRadius) // radius based on number of actors in common
            .attr("fill", d => d.id === "central" ? "orange" : "steelblue");

        // add image to each node
        node.append("image")
            .attr("xlink:href", d => getTMDBImagePath(d.img, d.nodeRadius))
            .attr("x", d => -d.nodeRadius)
            .attr("y", d => -(d.nodeRadius + 4)) // 4px gap from top of circle
            .attr("width", d => d.nodeRadius * 2)
            .attr("height", d => d.nodeRadius * 3)
            .attr("clip-path", d => `circle(${d.nodeRadius}px at ${d.nodeRadius}px ${d.nodeRadius + 4}px)`); // optional round crop


        const labelGroup = svg.append("g")
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", fontSize)
            .attr("fill", "#dbdadaff");

        const label = labelGroup
            .selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.label || "");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y - d.nodeRadius - 4); // 4px above the node
        });

        function drag(simulation) {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
        return () => {
            simulation.stop()
            svg.selectAll("*").remove();
            tooltip.remove();
        };
    }, [similarMovies]);
    return (
        <div>
            {/* <h1 className="text-light">Similar Graph for {similarMovies && similarMovies[0]}</h1> */}
            <svg ref={graphRef}></svg>
        </div>
    )
}
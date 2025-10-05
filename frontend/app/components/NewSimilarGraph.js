'use client'
import * as d3 from "d3";
import { useState, useEffect, useRef, use } from "react";
import { fetchMovieDetails, fetchSimilarMovies, getTMDBImagePath } from "../fetchFuncs";
export default function NewSimilarGraph({ movieId, setSelectedMovie }) {
    const viewHeight = 500;
    const viewWidth = 1000;
    const minimumNodeRadius = viewHeight / 40;
    const maximumNodeRadius = viewHeight / 7;
    const actorScaleFactor = 5 * (maximumNodeRadius - minimumNodeRadius) / 20;
    const fontSize = 20;
    const gap = maximumNodeRadius * 2;
    const width = viewWidth;
    const height = viewHeight;
    const [selectedMovieInfo, setSelectedMovieInfo] = useState(null);
    const [similarMovies, setSimilarMovies] = useState(null);
    const [castInCommon, setCastInCommon] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [links, setLinks] = useState([]);

    function extractTooltipText(actorsInCommon) {
        if (!actorsInCommon || actorsInCommon.length === 0) return "No cast in common";
        let tooltip = "Cast in common:\n";
        actorsInCommon.forEach(actor => {
            tooltip += `- ${actor.name}\n`;
        });
        return tooltip;
    }

    useEffect(() => {
        async function setCentralNode() {
            const data = await fetchMovieDetails(movieId, setSelectedMovieInfo);
            const centralNode = {
                id: "central",
                title: data.title,
                poster_path: data.poster_path,
                nodeRadius: maximumNodeRadius,
                tooltip: data.title || 'Loading...',
            };
            setNodes(prevNodes => [...prevNodes, centralNode]);
        }
        async function setSimilarNodes() {
            const data = await fetchSimilarMovies(movieId, setSimilarMovies, setCastInCommon);
            if (data) {
                const { movies, cast_in_common } = data;
                const similarNodes = movies.forEach(movie => {
                    const actorsInCommon = cast_in_common[movie.id] || [];
                    const nodeRadius = Math.min(maximumNodeRadius, minimumNodeRadius + actorsInCommon.length * actorScaleFactor);
                    setNodes(prevNodes => [...prevNodes, {
                        id: movie.id,
                        title: movie.title,
                        poster_path: movie.poster_path,
                        nodeRadius: nodeRadius,
                        tooltip: extractTooltipText(actorsInCommon),
                    }]);
                    setLinks(prevLinks => [...prevLinks, { source: 'central', target: movie.id }]);
                });

            }
        }
        if (movieId) {
            setNodes([]); // reset nodes
            setLinks([]); // reset links
            setCentralNode();
            setSimilarNodes();
        }
    }, [movieId]);

    function handleNodeMouseOver(event, d, labelGroup, tooltip, labelRects) {
        labelGroup.selectAll("text").remove();
        // Add a rectangle behind the text
        const text = labelGroup.selectAll("text")
            .data([d])
            .join("text")
            .text(d.title)
            .attr("font-size", fontSize)
            .attr("font-weight", "bold")
            .attr("x", d.x)
            .attr("y", d.y - d.nodeRadius - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "#ffffff");

        event.currentTarget.style.cursor = 'pointer';
        event.currentTarget.setAttribute('stroke', 'blue');
        event.currentTarget.setAttribute('stroke-width', '3');

        tooltip.transition().duration(150).style("opacity", 1);
        tooltip.html(d.tooltip || d.label)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
    }
    function handleNodeMouseMove(event, d, labelGroup, tooltip) {
        tooltip.style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
    }

    function handleNodeMouseOut(event, d, labelGroup, tooltip, labelRects) {
        tooltip.transition().duration(150).style("opacity", 0);
        event.currentTarget.style.cursor = 'default';
        event.currentTarget.setAttribute('stroke', 'none');
        labelGroup.selectAll("text").remove();
    }
    const graphRef = useRef(null);
    const svg = d3.select(graphRef.current).attr("width", width).attr("height", height);
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
        //create groups
        const linkGroup = svg.append("g").attr("class", "links");
        const nodeGroup = svg.append("g").attr("class", "nodes");
        const labelGroup = svg.append("g")
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", fontSize)
            .attr("fill", "#dbdadaff")
            .attr("stroke", "#000")
            .attr("stroke-width", "0.5px");

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.8)")
            .style("padding", "5px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0);
        // svg.selectAll("*").remove(); // clear existing
        //start simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(gap * 0.8)) // shorter links for tighter grouping
            .force("charge", d3.forceManyBody().strength(-800)) // stronger repulsion
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(d => d.nodeRadius + 5))
            .force("boundary", forceBoundary(0, 0, width, height, 20)); // increased boundary strength

        function update() {
            const link = linkGroup
                .selectAll("line")
                .data(links, d => `${d.source.id ?? d.source}-${d.target.id ?? d.target}`);

            const node = nodeGroup
                .selectAll("circle")
                .data(nodes, d => d.id);
            const label = labelGroup
                .selectAll("text")
                .data(nodes, d => d.id);
            link.exit().remove();
            node.exit().remove();
            label.exit().remove();

            link.enter()
                .append("line")
                .attr("stroke", "#999")
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", d => d.target.nodeRadius / 10);
            node.enter()
                .append("circle")
                .attr("r", d => d.nodeRadius + 2) // radius based on number of actors in common
                .attr("fill", "black")
                .call(drag(simulation));
            label.enter()
                .append("text")
                .attr("class", "nodeTitle")
                .attr("font-size", fontSize)
                .attr("font-weight", "normal")
                .text(d => d.title); // only central node has persistent label

            node.enter()
                .append("image")
                .attr("xlink:href", d => d.poster_path ? getTMDBImagePath(d.poster_path, d.nodeRadius) : '')
                .attr("width", d => d.nodeRadius * 2)
                .attr("height", d => d.nodeRadius * 3)
                .attr("clip-path", d => `circle(${d.nodeRadius}px at ${d.nodeRadius}px ${d.nodeRadius + 4}px)`) // optional round crop
                .call(drag(simulation))

                // Then inside the d3 selection:
                .on("mouseover", (event, d) => {
                    handleNodeMouseOver(event, d, labelGroup, tooltip);
                })
                .on("mousemove", (event, d) => {
                    handleNodeMouseMove(event, d, labelGroup, tooltip);
                })
                .on("mouseout", (event, d) => {
                    handleNodeMouseOut(event, d, labelGroup, tooltip);
                })
                .on("click", (event, d) => {
                    if (d.id !== "central") {
                        setSelectedMovie(d.id);
                    }
                });

            simulation.nodes(nodes);
            simulation.force("link").links(links);
            simulation.alpha(1).restart();
        }

        function drag(simulation) {
            return d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                });
        }
        // on each tick, update node and link positions
        simulation.on("tick", () => {
            linkGroup.selectAll("line")
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeGroup.selectAll("circle")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            nodeGroup.selectAll("image")
                .attr("x", d => d.x - d.nodeRadius)
                .attr("y", d => d.y - d.nodeRadius - 4);
            labelGroup.selectAll("text")
                .attr("x", d => d.x)
                .attr("y", d => d.y - d.nodeRadius - 10); // position above the node

        });
        update();
        return () => {
            simulation.stop()
            svg.selectAll("*").remove();
            tooltip.remove();
        };
    }, [nodes, links]);


    return (
        <div>
            <h1 className="text-light">{selectedMovieInfo?.title}</h1>
            <svg ref={graphRef}></svg>
        </div>
    )
}
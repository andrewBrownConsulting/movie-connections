'use client'
import * as d3 from "d3";
import { useState, useEffect, useRef, use } from "react";

export default function SimilarGraph({ movieId, setSelectedMovie }) {
    const nodeRadius = 20;
    const fontSize = 18;
    const gap = 200;

    const graphRef = useRef(null);
    const [movieNames, setMovieNames] = useState([]); // Placeholder for the central movie name
    const [similarIds, setSimilarIds] = useState([]); // Placeholder for similar movie IDs
    const [allCommonActors, setAllCommonActors] = useState([]); // Array of objects with movieId and list of common actors
    const [tooltipText, setTooltipText] = useState(null);
    async function getMainMovieName(movieId) {
        const response = await fetch(`https://localhost:9000/movie_name/${movieId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        });
        const data = await response.json();
        console.log("movie name is: " + data.title);
        setMovieNames([data.title]);
    }
    function getSimilarMovieNames(movieId) {
        fetch(`https://localhost:9000/similar/${movieId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
            .then(response => response.json())
            .then(similar_ids => {
                setSimilarIds(similar_ids);
                similar_ids.forEach(similar_id => {
                    fetch(`https://localhost:9000/movie_name/${similar_id}`, {
                    }).then(response => response.json()).then(data => {
                        console.log("similar movie name: " + data.title);
                        setMovieNames(prev => [...prev, { id: similar_id, title: data.title }]);
                    });
                });
            })
            .catch(error => {
                console.error('Error fetching similar movies:', error);
            });
    }
    async function getCommonActors(movieId1, movieId2) {
        const response = await fetch(`https://localhost:9000/people_in_common/${movieId1}/${movieId2}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        });
        const data = await response.json();
        return data.common_actors;

    }
    useEffect(() => {
        setAllCommonActors([]);
        let newAllCommonActors = [];
        if (!similarIds || similarIds.length === 0) return;
        similarIds.forEach(similarId => {
            getCommonActors(movieId, similarId).then(common => {
                newAllCommonActors.push({ movieId: similarId, actors: common });
                setAllCommonActors(newAllCommonActors);
            });
        });
        setAllCommonActors(newAllCommonActors);
    }, [similarIds]);


    useEffect(() => {
        if (!movieId) return;
        // fetch similar movies for movieId
        getMainMovieName(movieId)
        getSimilarMovieNames(movieId);
    }, [movieId]);

    function handleNodeClick(event, d) {
        console.log("Clicked node:", d);
        setSelectedMovie(d.id === "central" ? movieId : parseInt(d.id));
    }

    async function getCommonActorNames(commonActorIds) {
        const commonList = [];
        const fetches = commonActorIds.map(actor => {
            return fetch(`https://localhost:9000/actor-name/${actor}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                }
            });
        });
        const responses = await Promise.all(fetches);
        const dataArray = await Promise.all(responses.map(response => response.json()));
        dataArray.forEach(data => {
            console.log("Common actor name: " + data.name);
            commonList.push(data.name);
        });
        return commonList;
    }
    function handleNodeMouseOver(event, d) {
        // Show tooltip or highlight node
        const commonActors = allCommonActors.find((movieActors) => movieActors.movieId == (d.id))?.actors;
        getCommonActorNames(commonActors || []).then(names => {
            console.log(`Common actors: ${names.join(", ")}`);
            setTooltipText(names.length > 0 ? `Common actors: ${names.join(", ")}` : "No common actors");
        });
        console.log("Mouse over node:", d, "Common actors:", commonActors);

        d3.select(event.currentTarget)
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr("r", function (d) {
                return d.id === "central" ? nodeRadius + 8 : nodeRadius + 2;
            });
    }
    function handleNodeMouseOut(event, d) {
        // Hide tooltip or reset node style
        setTooltipText(null);
        console.log("Mouse out node:", d);
        d3.select(event.currentTarget)
            .attr("stroke", null)
            .attr("stroke-width", null)
            .attr("r", d => d.id === "central" ? nodeRadius : nodeRadius - 4);
    }
    useEffect(() => {
        const nodes = [
            { id: 'central', label: movieNames[0] || 'Loading...' },
            ...Array.from({ length: movieNames.length - 1 }, (_, i) => ({ id: `${movieNames[i + 1]?.id}`, label: `${movieNames[i + 1]?.title || 'Loading...'}` }))
        ]
        const links = nodes
            .filter(n => n.id !== 'central')
            .map(n => ({ source: 'central', target: n.id }));
        console.log(links);
        const width = 800, height = 600;
        const svg = d3.select(graphRef.current).attr("width", width).attr("height", height);

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(gap))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2));

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
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", d => d.id === "central" ? nodeRadius : nodeRadius - 4)
            .attr("fill", d => d.id === "central" ? "orange" : "steelblue")
            .call(drag(simulation)) // enable drag
            .on("click", handleNodeClick)
            .on("mouseover", (event, d) => {
                handleNodeMouseOver(event, d);
                tooltip.transition().duration(150).style("opacity", 1);
                tooltip.html(tooltipText || d.label)
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


        const labelGroup = svg.append("g")
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", fontSize)
            .attr("fill", "#dbdadaff");

        const label = labelGroup
            .selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.label || d.id);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            label
                .attr("x", d => d.x)
                .attr("y", d => d.y - nodeRadius); // 15px above the node

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
    }, [movieNames]);
    return (
        <div>
            <h1 className="text-light">Similar Graph for {movieNames[0]}</h1>
            <svg ref={graphRef}></svg>
            <div className="text-light">{tooltipText}</div>


        </div>
    )
}
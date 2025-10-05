'use client'
import * as d3 from "d3";
import { useState, useEffect, useRef, use } from "react";

export default function DynamicGraph({ movieId, setSelectedMovie }) {

    const graphRef = useRef();
    const [nodes, setNodes] = useState([
        { id: 1 },
        { id: 2 },
    ]);
    const [links, setLinks] = useState([
        { source: 1, target: 2 },
    ]);

    useEffect(() => {
        const width = 800;
        const height = 600;
        const svg = d3.select(graphRef.current);
        svg.selectAll("*").remove(); // clear existing

        const linkGroup = svg.append("g").attr("class", "links");
        const nodeGroup = svg.append("g").attr("class", "nodes");

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2));

        function update() {
            const link = linkGroup
                .selectAll("line")
                .data(links, d => `${d.source.id ?? d.source}-${d.target.id ?? d.target}`);

            const node = nodeGroup
                .selectAll("circle")
                .data(nodes, d => d.id);

            link.exit().remove();
            node.exit().remove();

            link.enter()
                .append("line")
                .attr("stroke", "#aaa")
                .attr("stroke-width", 2);

            node.enter()
                .append("circle")
                .attr("r", 15)
                .attr("fill", "steelblue")
                .call(drag(simulation));

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

        simulation.on("tick", () => {
            linkGroup.selectAll("line")
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeGroup.selectAll("circle")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

        update();
    }, [nodes, links]);

    // Add node handler
    function addNode() {
        const newId = nodes.length ? Math.max(...nodes.map(n => n.id)) + 1 : 1;
        const newNode = { id: newId };
        const target = nodes[Math.floor(Math.random() * nodes.length)];
        setNodes([...nodes, newNode]);
        setLinks([...links, { source: newNode.id, target: target.id }]);
    }

    // Remove node handler
    function removeNode() {
        if (nodes.length === 0) return;
        const removed = nodes[nodes.length - 1];
        setNodes(nodes.slice(0, -1));
        setLinks(links.filter(l => l.source.id !== removed.id && l.target.id !== removed.id));
    }
    return (
        <div>
            <button onClick={addNode}>Add Node</button>
            <button onClick={removeNode}>Remove Node</button>
            {/* <h1 className="text-light">Similar Graph for {similarMovies && similarMovies[0]}</h1> */}
            <svg ref={graphRef} width="800" height="600" className="border border-gray-300"></svg>
        </div>
    )
}
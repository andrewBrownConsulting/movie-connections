import * as d3 from 'd3'
export function makeSimulation(movieData, width, height, links, update) {
  const simulation = d3.forceSimulation(movieData)
    .force('x', d3.forceX(width / 2).strength(0.01))
    .force('y', d3.forceY(height / 2).strength(0.01))
    .force('charge', d3.forceManyBody().strength(-50))
    .force('collision', d3.forceCollide().radius(d => d.rad))
    .force('links', d3.forceLink(links).id(d => d.id).strength(0.01))
    .alphaDecay(0)
    .on('tick', update);
  return simulation;
}

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface NeuralNetworkVisualizationProps {
  input: number[];
  output: number[];
  weights: number[][];
}

const NeuralNetworkVisualization: React.FC<NeuralNetworkVisualizationProps> = ({ input, output, weights }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const nodeRadius = 20;

    svg.attr("width", width).attr("height", height);

    const layers = [input.length, ...weights.map(w => w.length), output.length];
    const layerSpacing = width / (layers.length - 1);

    let nodes: { x: number; y: number; value: number }[] = [];
    let links: { source: number; target: number; value: number }[] = [];

    layers.forEach((layerSize, layerIndex) => {
      const layerValues = layerIndex === 0 ? input : layerIndex === layers.length - 1 ? output : weights[layerIndex - 1];
      const yStep = height / (layerSize + 1);
      
      layerValues.forEach((value, nodeIndex) => {
        nodes.push({
          x: layerIndex * layerSpacing,
          y: (nodeIndex + 1) * yStep,
          value: value
        });

        if (layerIndex > 0) {
          const prevLayerSize = layers[layerIndex - 1];
          for (let prevNodeIndex = 0; prevNodeIndex < prevLayerSize; prevNodeIndex++) {
            links.push({
              source: (layerIndex - 1) * prevLayerSize + prevNodeIndex,
              target: nodes.length - 1,
              value: weights[layerIndex - 1][nodeIndex]
            });
          }
        }
      });
    });

    svg.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", d => nodes[d.source].x)
      .attr("y1", d => nodes[d.source].y)
      .attr("x2", d => nodes[d.target].x)
      .attr("y2", d => nodes[d.target].y)
      .attr("stroke", d => d3.interpolateRdYlBu(1 - Math.abs(d.value)))
      .attr("stroke-width", d => Math.abs(d.value) * 3);

    svg.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", nodeRadius)
      .attr("fill", d => d3.interpolateRdYlBu(1 - d.value));

    svg.selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.value.toFixed(2))
      .attr("font-size", "10px")
      .attr("fill", "black");

  }, [input, output, weights]);

  return <svg ref={svgRef}></svg>;
};

export default NeuralNetworkVisualization;
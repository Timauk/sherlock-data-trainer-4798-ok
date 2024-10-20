import React, { useMemo } from 'react';
import { ForceGraph2D } from 'react-force-graph';

interface NeuralNetworkVisualizationProps {
  input: number[];
  output: number[];
  weights: number[][];
}

const NeuralNetworkVisualization: React.FC<NeuralNetworkVisualizationProps> = ({ input, output, weights }) => {
  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    
    // Input layer
    input.forEach((value, i) => {
      nodes.push({ id: `input-${i}`, val: value, layer: 0 });
    });

    // Hidden layers
    weights.forEach((layer, layerIndex) => {
      layer.forEach((node, nodeIndex) => {
        nodes.push({ id: `hidden-${layerIndex}-${nodeIndex}`, val: node, layer: layerIndex + 1 });
        
        // Connect to previous layer
        const prevLayer = layerIndex === 0 ? input : weights[layerIndex - 1];
        prevLayer.forEach((_, prevIndex) => {
          links.push({
            source: layerIndex === 0 ? `input-${prevIndex}` : `hidden-${layerIndex-1}-${prevIndex}`,
            target: `hidden-${layerIndex}-${nodeIndex}`,
            value: Math.abs(node)
          });
        });
      });
    });

    // Output layer
    output.forEach((value, i) => {
      nodes.push({ id: `output-${i}`, val: value, layer: weights.length + 1 });
      weights[weights.length - 1].forEach((_, nodeIndex) => {
        links.push({
          source: `hidden-${weights.length-1}-${nodeIndex}`,
          target: `output-${i}`,
          value: Math.abs(value)
        });
      });
    });

    return { nodes, links };
  }, [input, output, weights]);

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ForceGraph2D
        graphData={graphData}
        nodeRelSize={5}
        nodeVal={node => Math.abs(node.val)}
        nodeColor={node => {
          if (node.id.startsWith('input')) return 'rgb(0, 255, 0)';
          if (node.id.startsWith('output')) return 'rgb(255, 0, 0)';
          return 'rgb(0, 0, 255)';
        }}
        linkWidth={link => Math.sqrt(link.value)}
        linkColor={() => 'rgba(255, 255, 255, 0.2)'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'white';
          ctx.fillText(label, node.x, node.y);
        }}
      />
    </div>
  );
};

export default NeuralNetworkVisualization;
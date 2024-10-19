import React, { useRef, useEffect } from 'react';

interface NeuralNetworkVisualizationProps {
  input: number[];
  output: number[];
  weights: number[][];
}

const NeuralNetworkVisualization: React.FC<NeuralNetworkVisualizationProps> = ({ input, output, weights }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const layerCount = weights.length + 2;
      const nodeRadius = 10;
      const layerWidth = canvas.width / (layerCount + 1);
      const maxNodesInLayer = Math.max(input.length, ...weights.map(w => w.length), output.length);
      const layerHeight = canvas.height / (maxNodesInLayer + 1);

      // Draw input layer
      input.forEach((value, i) => {
        const x = layerWidth;
        const y = (i + 1) * layerHeight;
        drawNode(ctx, x, y, nodeRadius, value);
      });

      // Draw hidden layers
      weights.forEach((layer, layerIndex) => {
        layer.forEach((node, nodeIndex) => {
          const x = (layerIndex + 2) * layerWidth;
          const y = (nodeIndex + 1) * layerHeight;
          drawNode(ctx, x, y, nodeRadius, node);
        });
      });

      // Draw output layer
      output.forEach((value, i) => {
        const x = (layerCount) * layerWidth;
        const y = (i + 1) * layerHeight;
        drawNode(ctx, x, y, nodeRadius, value);
      });

      // Draw connections
      // ... (implement connection drawing logic here)
    };

    drawNetwork();
  }, [input, output, weights]);

  const drawNode = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, value: number) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(0, 123, 255, ${Math.abs(value)})`;
    ctx.fill();
    ctx.stroke();
  };

  return <canvas ref={canvasRef} width={600} height={400} />;
};

export default NeuralNetworkVisualization;
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

      const drawNode = (x: number, y: number, value: number) => {
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(0, 123, 255, ${Math.abs(value)})`;
        ctx.fill();
        ctx.stroke();
      };

      const drawConnection = (startX: number, startY: number, endX: number, endY: number, weight: number) => {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(0, 0, 0, ${Math.abs(weight)})`;
        ctx.lineWidth = Math.abs(weight) * 3;
        ctx.stroke();
      };

      // Draw input layer
      input.forEach((value, i) => {
        const x = layerWidth;
        const y = (i + 1) * layerHeight;
        drawNode(x, y, value);
      });

      // Draw hidden layers
      weights.forEach((layer, layerIndex) => {
        layer.forEach((node, nodeIndex) => {
          const x = (layerIndex + 2) * layerWidth;
          const y = (nodeIndex + 1) * layerHeight;
          drawNode(x, y, node);
        });
      });

      // Draw output layer
      output.forEach((value, i) => {
        const x = (layerCount) * layerWidth;
        const y = (i + 1) * layerHeight;
        drawNode(x, y, value);
      });

      // Draw connections
      for (let i = 0; i < layerCount - 1; i++) {
        const startX = (i + 1) * layerWidth;
        const endX = (i + 2) * layerWidth;
        const startNodes = i === 0 ? input : weights[i - 1];
        const endNodes = i === layerCount - 2 ? output : weights[i];

        startNodes.forEach((_, startIndex) => {
          const startY = (startIndex + 1) * layerHeight;
          endNodes.forEach((_, endIndex) => {
            const endY = (endIndex + 1) * layerHeight;
            const weight = weights[i][endIndex] || 0.5;
            drawConnection(startX, startY, endX, endY, weight);
          });
        });
      }
    };

    drawNetwork();
  }, [input, output, weights]);

  return <canvas ref={canvasRef} width={600} height={400} />;
};

export default NeuralNetworkVisualization;
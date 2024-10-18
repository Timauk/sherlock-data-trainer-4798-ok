import React from 'react';

interface NeuralNetworkVisualizationProps {
  input: number[];
  output: number[];
  weights: number[][];
}

const NeuralNetworkVisualization: React.FC<NeuralNetworkVisualizationProps> = ({ input, output, weights }) => {
  return (
    <div className="neural-network-visualization">
      <h3 className="text-lg font-semibold mb-2">Visualização da Rede Neural</h3>
      <div className="flex justify-between">
        <div className="input-layer">
          <h4>Camada de Entrada</h4>
          {input.map((value, index) => (
            <div key={index} className="neuron" style={{opacity: Math.abs(value)}}>
              {value.toFixed(2)}
            </div>
          ))}
        </div>
        <div className="hidden-layers">
          <h4>Camadas Ocultas</h4>
          {weights.map((layer, layerIndex) => (
            <div key={layerIndex} className="layer">
              {layer.map((weight, neuronIndex) => (
                <div key={neuronIndex} className="neuron" style={{opacity: Math.abs(weight)}}>
                  {weight.toFixed(2)}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="output-layer">
          <h4>Camada de Saída</h4>
          {output.map((value, index) => (
            <div key={index} className="neuron" style={{opacity: Math.abs(value)}}>
              {value.toFixed(2)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NeuralNetworkVisualization;
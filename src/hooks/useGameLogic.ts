import { useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

interface Player {
  id: number;
  score: number;
  predictions: number[];
  weights: number[];
}

export const useGameLogic = (csvData: number[][], trainedModel: tf.LayersModel | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [generation, setGeneration] = useState(1);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [boardNumbers, setBoardNumbers] = useState<number[]>([]);
  const [concursoNumber, setConcursoNumber] = useState(0);
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);
  const [neuralNetworkVisualization, setNeuralNetworkVisualization] = useState<{ input: number[], output: number[], weights: number[][] } | null>(null);

  const initializePlayers = useCallback(() => {
    const newPlayers = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      score: 0,
      predictions: [],
      weights: Array.from({ length: 17 }, () => Math.floor(Math.random() * 1001))
    }));
    setPlayers(newPlayers);
  }, []);

  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);

  const makePrediction = (inputData: number[], playerWeights: number[]): number[] => {
    if (!trainedModel) return [];
    
    const normalizedConcursoNumber = concursoNumber / 3184;
    const normalizedDataSorteio = Date.now() / (1000 * 60 * 60 * 24 * 365);
    const input = [...inputData, normalizedConcursoNumber, normalizedDataSorteio];
    
    const weightedInput = input.map((value, index) => value * (playerWeights[index] / 1000));
    
    const inputTensor = tf.tensor2d([weightedInput]);
    
    const predictions = trainedModel.predict(inputTensor) as tf.Tensor;
    const result = Array.from(predictions.dataSync());
    
    inputTensor.dispose();
    predictions.dispose();
    
    const uniqueNumbers = new Set<number>();
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop
    
    while (uniqueNumbers.size < 15 && attempts < maxAttempts) {
      const index = uniqueNumbers.size;
      const num = Math.round(result[index % result.length] * 24) + 1;
      if (!uniqueNumbers.has(num)) {
        uniqueNumbers.add(num);
      }
      attempts++;
    }
    
    while (uniqueNumbers.size < 15) {
      const randomNum = Math.floor(Math.random() * 25) + 1;
      if (!uniqueNumbers.has(randomNum)) {
        uniqueNumbers.add(randomNum);
      }
    }
    
    setNeuralNetworkVisualization({ 
      input: weightedInput, 
      output: Array.from(uniqueNumbers), 
      weights: trainedModel.getWeights().map(w => Array.from(w.dataSync())) 
    });
    
    return Array.from(uniqueNumbers);
  };

  const gameLoop = useCallback(() => {
    if (csvData.length === 0 || !trainedModel) return;

    const currentBoardNumbers = csvData[concursoNumber % csvData.length];
    setBoardNumbers(currentBoardNumbers);

    const updatedPlayers = players.map(player => {
      const playerPredictions = makePrediction(currentBoardNumbers, player.weights);
      const matches = playerPredictions.filter(num => currentBoardNumbers.includes(num)).length;
      const reward = calculateDynamicReward(matches);
      return {
        ...player,
        score: player.score + reward,
        predictions: playerPredictions
      };
    });

    setPlayers(updatedPlayers);
    setEvolutionData(prev => [
      ...prev,
      ...updatedPlayers.map(player => ({
        generation,
        playerId: player.id,
        score: player.score
      }))
    ]);

    setConcursoNumber(prev => prev + 1);
  }, [players, csvData, concursoNumber, generation, trainedModel]);

  const evolveGeneration = useCallback(() => {
    setGeneration(prev => prev + 1);
  }, []);

  const calculateDynamicReward = (matches: number): number => {
    if (matches === 11) {
      return 1000; // Pontuação especial para 11 acertos
    } else if (matches > 11) {
      return Math.pow(2, matches - 11) * 1000; // Pontuação exponencial para mais de 11 acertos
    } else {
      return matches > 0 ? Math.pow(2, matches) : 0; // Pontuação para menos de 11 acertos
    }
  };

  return {
    players,
    generation,
    evolutionData,
    boardNumbers,
    concursoNumber,
    isInfiniteMode,
    setIsInfiniteMode,
    initializePlayers,
    gameLoop,
    evolveGeneration,
    neuralNetworkVisualization
  };
};

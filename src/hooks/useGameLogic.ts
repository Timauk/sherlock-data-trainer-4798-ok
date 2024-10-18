import { useState, useCallback, useEffect, useRef } from 'react';
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

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

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

  const makePrediction = useCallback((inputData: number[], playerWeights: number[]): number[] => {
    if (!trainedModel) return [];
    
    const normalizedConcursoNumber = concursoNumber / 3184;
    const normalizedDataSorteio = Date.now() / (1000 * 60 * 60 * 24 * 365);
    const input = [...inputData, normalizedConcursoNumber, normalizedDataSorteio];
    
    const weightedInput = input.map((value, index) => value * (playerWeights[index] / 1000));
    
    const paddedInput = Array(10).fill(weightedInput);
    const inputTensor = tf.tensor3d([paddedInput]);
    
    const predictions = trainedModel.predict(inputTensor) as tf.Tensor;
    const result = Array.from(predictions.dataSync());
    
    inputTensor.dispose();
    predictions.dispose();
    
    setNeuralNetworkVisualization({ 
      input: weightedInput, 
      output: result, 
      weights: trainedModel.getWeights().map(w => Array.from(w.dataSync())) 
    });
    
    // Ensure no duplicate numbers
    const uniqueNumbers = new Set<number>();
    while (uniqueNumbers.size < 15) {
      const num = Math.round(result[uniqueNumbers.size] * 24) + 1;
      if (!uniqueNumbers.has(num)) {
        uniqueNumbers.add(num);
      }
    }
    
    return Array.from(uniqueNumbers);
  }, [trainedModel, concursoNumber]);

  const gameLoop = useCallback(() => {
    if (csvData.length === 0 || !trainedModel) return;

    const currentBoardNumbers = csvData[concursoNumber % csvData.length];
    setBoardNumbers(currentBoardNumbers);

    const updatedPlayers = players.map(player => {
      const playerPredictions = makePrediction(currentBoardNumbers, player.weights);
      const matches = playerPredictions.filter(num => currentBoardNumbers.includes(num)).length;
      const reward = calculateDynamicReward(matches);
      const extraPoint = matches > 0 ? 1 : 0; // Extra point for any correct guess
      return {
        ...player,
        score: player.score + reward + extraPoint,
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
  }, [players, csvData, concursoNumber, generation, trainedModel, makePrediction]);

  const evolveGeneration = useCallback(() => {
    setGeneration(prev => prev + 1);
    // Implement evolution logic here if needed
  }, []);

  const calculateDynamicReward = (matches: number): number => {
    if (matches > 12) {
      return Math.pow(2, matches - 12);
    } else if (matches < 12) {
      return -Math.pow(2, 12 - matches);
    }
    return 0; // No reward or punishment for exactly 12 matches
  };

  useEffect(() => {
    if (isInfiniteMode) {
      gameLoopRef.current = setInterval(gameLoop, 1000);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isInfiniteMode, gameLoop]);

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
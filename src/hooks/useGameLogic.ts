import { useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { saveAs } from 'file-saver';

interface Player {
  id: number;
  score: number;
  predictions: number[];
  model: tf.LayersModel;
}

export const useGameLogic = (csvData: number[][], initialModel: tf.LayersModel | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [generation, setGeneration] = useState(1);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [boardNumbers, setBoardNumbers] = useState<number[]>([]);
  const [concursoNumber, setConcursoNumber] = useState(0);
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);
  const [neuralNetworkVisualization, setNeuralNetworkVisualization] = useState<{ input: number[], output: number[], weights: number[][] } | null>(null);
  const [bestPlayer, setBestPlayer] = useState<Player | null>(null);

  const createModel = (): tf.LayersModel => {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [17] }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 15, activation: 'sigmoid' }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
  };

  const initializePlayers = useCallback(() => {
    const newPlayers = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      score: 0,
      predictions: [],
      model: initialModel ? initialModel.clone() : createModel()
    }));
    setPlayers(newPlayers);
  }, [initialModel]);

  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);

  const makePrediction = async (inputData: number[], playerModel: tf.LayersModel): Promise<number[]> => {
    const normalizedConcursoNumber = concursoNumber / 3184;
    const normalizedDataSorteio = Date.now() / (1000 * 60 * 60 * 24 * 365);
    const input = [...inputData, normalizedConcursoNumber, normalizedDataSorteio];
    
    const inputTensor = tf.tensor2d([input]);
    const predictions = await playerModel.predict(inputTensor) as tf.Tensor;
    const result = Array.from(await predictions.data());
    
    inputTensor.dispose();
    predictions.dispose();
    
    const uniqueNumbers = new Set<number>();
    while (uniqueNumbers.size < 15) {
      const num = Math.round(result[uniqueNumbers.size] * 24) + 1;
      uniqueNumbers.add(num);
    }
    
    setNeuralNetworkVisualization({ 
      input, 
      output: Array.from(uniqueNumbers), 
      weights: playerModel.getWeights().map(w => Array.from(w.data())) 
    });
    
    return Array.from(uniqueNumbers);
  };

  const gameLoop = useCallback(async () => {
    if (csvData.length === 0) return;

    const currentBoardNumbers = csvData[concursoNumber % csvData.length];
    setBoardNumbers(currentBoardNumbers);

    const updatedPlayers = await Promise.all(players.map(async player => {
      const playerPredictions = await makePrediction(currentBoardNumbers, player.model);
      const matches = playerPredictions.filter(num => currentBoardNumbers.includes(num)).length;
      const reward = calculateDynamicReward(matches);
      
      // Train the model with the current data
      const inputTensor = tf.tensor2d([currentBoardNumbers]);
      const outputTensor = tf.tensor2d([playerPredictions]);
      await player.model.fit(inputTensor, outputTensor, { epochs: 1 });
      
      inputTensor.dispose();
      outputTensor.dispose();

      return {
        ...player,
        score: player.score + reward,
        predictions: playerPredictions
      };
    }));

    setPlayers(updatedPlayers);
    setEvolutionData(prev => [
      ...prev,
      ...updatedPlayers.map(player => ({
        generation,
        playerId: player.id,
        score: player.score
      }))
    ]);

    const newBestPlayer = updatedPlayers.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    setBestPlayer(newBestPlayer);

    setConcursoNumber(prev => prev + 1);
  }, [players, csvData, concursoNumber, generation]);

  const evolveGeneration = useCallback(() => {
    setGeneration(prev => prev + 1);
    // Implement more advanced evolution logic here if needed
  }, []);

  const calculateDynamicReward = (matches: number): number => {
    return matches >= 11 && matches <= 15 ? matches - 10 : 0;
  };

  const cloneBestPlayer = () => {
    if (bestPlayer) {
      const clonedPlayers = Array(10).fill(null).map((_, index) => ({
        ...bestPlayer,
        id: index + 1,
        model: bestPlayer.model.clone()
      }));
      setPlayers(clonedPlayers);
    }
  };

  const saveModel = async () => {
    if (bestPlayer) {
      const modelJSON = await bestPlayer.model.toJSON();
      const blob = new Blob([JSON.stringify(modelJSON)], { type: 'application/json' });
      saveAs(blob, 'sherlok_model.json');
    }
  };

  const loadModel = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const modelJSON = JSON.parse(e.target?.result as string);
      const loadedModel = await tf.models.modelFromJSON(modelJSON);
      initializePlayers();
    };
    reader.readAsText(file);
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
    neuralNetworkVisualization,
    bestPlayer,
    cloneBestPlayer,
    saveModel,
    loadModel
  };
};
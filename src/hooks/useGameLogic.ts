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
    model.add(tf.layers.lstm({ units: 64, inputShape: [5, 17], returnSequences: true }));
    model.add(tf.layers.lstm({ units: 32 }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 15, activation: 'sigmoid' }));
    model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });
    return model;
  };

  const initializePlayers = useCallback(() => {
    const newPlayers: Player[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      score: 0,
      predictions: [],
      model: initialModel ? tf.models.modelFromJSON(initialModel.toJSON()) : createModel()
    }));
    setPlayers(newPlayers);
  }, [initialModel]);

  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);

  const makePrediction = (inputData: number[], playerModel: tf.LayersModel): number[] => {
    const recentDraws = csvData.slice(-5).map(draw => [...draw, concursoNumber / 3184, Date.now() / (1000 * 60 * 60 * 24 * 365)]);
    const input = tf.tensor3d([recentDraws]);
    const predictions = playerModel.predict(input) as tf.Tensor;
    const result = Array.from(predictions.dataSync());
    input.dispose();
    predictions.dispose();
    
    const uniqueNumbers = new Set<number>();
    while (uniqueNumbers.size < 15) {
      const num = Math.round(result[uniqueNumbers.size] * 24) + 1;
      uniqueNumbers.add(num);
    }
    
    setNeuralNetworkVisualization({ 
      input: recentDraws.flat(),
      output: Array.from(uniqueNumbers),
      weights: playerModel.getWeights().map(w => Array.from(w.dataSync()))
    });
    
    return Array.from(uniqueNumbers);
  };

  const gameLoop = useCallback(async () => {
    if (csvData.length === 0) return;

    const currentBoardNumbers = csvData[concursoNumber % csvData.length];
    setBoardNumbers(currentBoardNumbers);

    const updatedPlayers = players.map(player => {
      const playerPredictions = makePrediction(currentBoardNumbers, player.model);
      const matches = playerPredictions.filter(num => currentBoardNumbers.includes(num)).length;
      const reward = calculateDynamicReward(matches);
      
      // Train the model with the current data
      const inputTensor = tf.tensor2d([currentBoardNumbers]);
      const outputTensor = tf.tensor2d([playerPredictions]);
      player.model.fit(inputTensor, outputTensor, { epochs: 1 });
      
      inputTensor.dispose();
      outputTensor.dispose();

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
      const clonedPlayers: Player[] = Array(10).fill(null).map((_, index) => ({
        ...bestPlayer,
        id: index + 1,
        model: tf.models.modelFromJSON(bestPlayer.model.toJSON())
      }));
      setPlayers(clonedPlayers);
    }
  };

  const saveModel = async () => {
    if (bestPlayer) {
      const modelJSON = await bestPlayer.model.toJSON();
      const modelWeights = await bestPlayer.model.getWeights();
      const weightsData = await Promise.all(modelWeights.map(w => w.data()));
      
      const saveData = {
        modelJSON,
        weightsData
      };
      
      const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
      saveAs(blob, 'sherlok_model.json');
    }
  };

  const loadModel = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const saveData = JSON.parse(e.target?.result as string);
      const loadedModel = await tf.loadLayersModel(tf.io.fromMemory(saveData.modelJSON));
      
      const weightsTensors = saveData.weightsData.map((weightData: number[], i: number) => 
        tf.tensor(weightData, loadedModel.getWeights()[i].shape)
      );
      loadedModel.setWeights(weightsTensors);
      
      setPlayers(prevPlayers => prevPlayers.map(player => ({
        ...player,
        model: tf.models.modelFromJSON(loadedModel.toJSON())
      })));
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
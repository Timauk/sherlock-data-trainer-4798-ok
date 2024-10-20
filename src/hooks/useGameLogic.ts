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
  const [historicalData, setHistoricalData] = useState<number[][]>([]);

  const createModel = (): tf.LayersModel => {
    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 64, inputShape: [10, 17], returnSequences: true }));
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

  const analyzeTimeSeries = (data: number[][]) => {
    // Implementação simplificada de análise de séries temporais
    const movingAverage = data.map((_, index, array) => 
      array.slice(Math.max(0, index - 5), index + 1)
        .reduce((sum, curr) => sum.map((num, i) => num + curr[i]), new Array(15).fill(0))
        .map(sum => sum / Math.min(index + 1, 6))
    );
    return movingAverage;
  };

  const calculateStatistics = (data: number[][]) => {
    const frequency = new Array(25).fill(0);
    data.forEach(draw => draw.forEach(num => frequency[num - 1]++));
    const hotNumbers = frequency.map((freq, index) => ({ number: index + 1, frequency: freq }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(item => item.number);
    return { frequency, hotNumbers };
  };

  const makePrediction = (inputData: number[], playerModel: tf.LayersModel): number[] => {
    const recentDraws = csvData.slice(-10).map(draw => [...draw, concursoNumber / 3184, Date.now() / (1000 * 60 * 60 * 24 * 365)]);
    const input = tf.tensor3d([recentDraws]);
    const predictions = playerModel.predict(input) as tf.Tensor;
    const result = Array.from(predictions.dataSync());
    input.dispose();
    predictions.dispose();
    
    const { hotNumbers } = calculateStatistics(historicalData);
    const uniqueNumbers = new Set<number>();
    while (uniqueNumbers.size < 15) {
      if (uniqueNumbers.size < 10) {
        const num = Math.round(result[uniqueNumbers.size] * 24) + 1;
        uniqueNumbers.add(num);
      } else {
        uniqueNumbers.add(hotNumbers[uniqueNumbers.size - 10]);
      }
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
    setHistoricalData(prev => [...prev, currentBoardNumbers]);

    const timeSeriesAnalysis = analyzeTimeSeries(historicalData);
    const statistics = calculateStatistics(historicalData);

    const updatedPlayers = players.map(player => {
      const playerPredictions = makePrediction(currentBoardNumbers, player.model);
      const matches = playerPredictions.filter(num => currentBoardNumbers.includes(num)).length;
      const reward = calculateDynamicReward(matches, statistics.hotNumbers);
      
      // Train the model with the current data and time series analysis
      const inputTensor = tf.tensor3d([timeSeriesAnalysis.slice(-10)]);
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
  }, [players, csvData, concursoNumber, generation, historicalData]);

  const evolveGeneration = useCallback(() => {
    setGeneration(prev => prev + 1);
    // Implementar lógica de evolução mais avançada aqui, se necessário
  }, []);

  const calculateDynamicReward = (matches: number, hotNumbers: number[]): number => {
    const baseReward = matches >= 11 && matches <= 15 ? matches - 10 : 0;
    const hotNumberBonus = matches * hotNumbers.filter(num => boardNumbers.includes(num)).length * 0.1;
    return baseReward + hotNumberBonus;
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
        weightsData,
        historicalData,
        generation,
        concursoNumber
      };
      
      const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
      saveAs(blob, 'sherlok_model.json');
    }
  };

  const loadModel = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const saveData = JSON.parse(e.target?.result as string);
        if (!saveData || !saveData.modelJSON) {
          throw new Error("Invalid model data");
        }
        const loadedModel = await tf.loadLayersModel(tf.io.fromMemory(saveData.modelJSON));
        
        if (saveData.weightsData) {
          const weightsTensors = saveData.weightsData.map((weightData: number[], i: number) => 
            tf.tensor(weightData, loadedModel.getWeights()[i].shape)
          );
          loadedModel.setWeights(weightsTensors);
        }
        
        setPlayers(prevPlayers => prevPlayers.map(player => ({
          ...player,
          model: loadedModel
        })));

        if (saveData.historicalData) setHistoricalData(saveData.historicalData);
        if (saveData.generation) setGeneration(saveData.generation);
        if (saveData.concursoNumber) setConcursoNumber(saveData.concursoNumber);
      } catch (error) {
        console.error("Error loading model:", error);
        // You might want to show an error message to the user here
      }
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

import { useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { saveAs } from 'file-saver';
import { Player, initializePlayers } from '../utils/playerUtils';
import { makePrediction, calculateDynamicReward } from '../utils/predictionUtils';

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

  useEffect(() => {
    const initPlayers = async () => {
      const initializedPlayers = await initializePlayers(10, initialModel);
      setPlayers(initializedPlayers);
    };
    initPlayers();
  }, [initialModel]);

  const analyzeTimeSeries = (data: number[][]) => {
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

  const gameLoop = useCallback(async () => {
    if (csvData.length === 0) return;

    const currentBoardNumbers = csvData[concursoNumber % csvData.length];
    setBoardNumbers(currentBoardNumbers);
    setHistoricalData(prev => [...prev, currentBoardNumbers]);

    const timeSeriesAnalysis = analyzeTimeSeries(historicalData);
    const statistics = calculateStatistics(historicalData);

    const updatedPlayers = await Promise.all(players.map(async player => {
      const playerPredictions = makePrediction(currentBoardNumbers, player.model, concursoNumber, statistics.hotNumbers);
      const matches = playerPredictions.filter(num => currentBoardNumbers.includes(num)).length;
      const reward = calculateDynamicReward(matches, statistics.hotNumbers);
      
      const inputTensor = tf.tensor3d([timeSeriesAnalysis.slice(-10)]);
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

    setNeuralNetworkVisualization({
      input: timeSeriesAnalysis[timeSeriesAnalysis.length - 1],
      output: newBestPlayer.predictions,
      weights: newBestPlayer.model.getWeights().map(w => Array.from(w.dataSync()))
    });

    setConcursoNumber(prev => prev + 1);
  }, [players, csvData, concursoNumber, generation, historicalData]);

  const evolveGeneration = useCallback(() => {
    setGeneration(prev => prev + 1);
  }, []);

  const cloneBestPlayer = async () => {
    if (bestPlayer) {
      const clonedPlayers: Player[] = await Promise.all(Array(10).fill(null).map(async (_, index) => ({
        ...bestPlayer,
        id: index + 1,
        model: await tf.models.modelFromJSON(bestPlayer.model.toJSON()) as tf.LayersModel
      })));
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
    gameLoop,
    evolveGeneration,
    neuralNetworkVisualization,
    bestPlayer,
    cloneBestPlayer,
    saveModel,
    loadModel
  };
};

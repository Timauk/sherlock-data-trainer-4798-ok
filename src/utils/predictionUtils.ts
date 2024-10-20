import * as tf from '@tensorflow/tfjs';
import { Player } from './playerUtils';

export const makePrediction = (
  inputData: number[],
  playerModel: tf.LayersModel,
  concursoNumber: number,
  hotNumbers: number[]
): number[] => {
  // Ensure we have 15 numbers, pad with zeros if necessary
  const paddedInputData = inputData.slice(0, 15).concat(Array(Math.max(0, 15 - inputData.length)).fill(0));
  
  // Normalize the input data
  const normalizedInput = paddedInputData.map(num => num / 25);
  
  // Create a tensor 3D with the correct shape [1, 10, 17]
  const recentDraws = Array(10).fill(normalizedInput).map((draw, index) => [
    ...draw,
    concursoNumber / 3184, // Normalize the concurso number
    Date.now() / (1000 * 60 * 60 * 24 * 365) // Add normalized timestamp
  ]);
  
  const input = tf.tensor3d([recentDraws]);
  const predictions = playerModel.predict(input) as tf.Tensor;
  const result = Array.from(predictions.dataSync());
  input.dispose();
  predictions.dispose();
  
  const uniqueNumbers = new Set<number>();
  while (uniqueNumbers.size < 15) {
    if (uniqueNumbers.size < 10) {
      const num = Math.round(result[uniqueNumbers.size] * 24) + 1;
      uniqueNumbers.add(num);
    } else {
      uniqueNumbers.add(hotNumbers[uniqueNumbers.size - 10]);
    }
  }
  
  return Array.from(uniqueNumbers);
};

export const calculateDynamicReward = (matches: number, hotNumbers: number[]): number => {
  const baseReward = matches >= 11 && matches <= 15 ? matches - 10 : 0;
  const hotNumberBonus = matches * hotNumbers.filter(num => matches).length * 0.1;
  return baseReward + hotNumberBonus;
};
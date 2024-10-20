import * as tf from '@tensorflow/tfjs';
import { Player } from './playerUtils';

export const makePrediction = (
  inputData: number[],
  playerModel: tf.LayersModel,
  concursoNumber: number,
  hotNumbers: number[]
): number[] => {
  const recentDraws = inputData.slice(-10).map(draw => [...Array.from([draw]), concursoNumber / 3184, Date.now() / (1000 * 60 * 60 * 24 * 365)]);
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
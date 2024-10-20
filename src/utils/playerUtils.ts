import * as tf from '@tensorflow/tfjs';

export interface Player {
  id: number;
  score: number;
  predictions: number[];
  model: tf.LayersModel;
}

export const createModel = (): tf.LayersModel => {
  const model = tf.sequential();
  model.add(tf.layers.lstm({ units: 64, inputShape: [10, 17], returnSequences: true }));
  model.add(tf.layers.lstm({ units: 32 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 15, activation: 'sigmoid' }));
  model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });
  return model;
};

export const initializePlayers = (count: number, initialModel: tf.LayersModel | null): Player[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    score: 0,
    predictions: [],
    model: initialModel ? tf.models.modelFromJSON(initialModel.toJSON()) as tf.LayersModel : createModel()
  }));
};
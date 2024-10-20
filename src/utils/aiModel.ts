import * as tf from '@tensorflow/tfjs';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  earlyStoppingPatience: number;
}

export function createModel(): tf.LayersModel {
  const model = tf.sequential();
  model.add(tf.layers.lstm({ units: 64, inputShape: [null, 17], returnSequences: true }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.lstm({ units: 32 }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }) }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 15, activation: 'sigmoid' }));
  model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });
  return model;
}

export async function trainModel(
  model: tf.LayersModel,
  data: number[][],
  config: TrainingConfig
): Promise<tf.History> {
  const xs = tf.tensor3d(data.map(row => [row.slice(0, 17)]));
  const ys = tf.tensor2d(data.map(row => row.slice(17)));

  const history = await model.fit(xs, ys, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
    callbacks: [
      tf.callbacks.earlyStopping({ monitor: 'val_loss', patience: config.earlyStoppingPatience })
    ]
  });

  xs.dispose();
  ys.dispose();

  return history;
}

export function normalizeData(data: number[][]): number[][] {
  const maxValue = 25;
  return data.map(row => row.map(n => n / maxValue));
}

export function denormalizeData(data: number[][]): number[][] {
  const maxValue = 25;
  return data.map(row => row.map(n => Math.round(n * maxValue)));
}

export function addDerivedFeatures(data: number[][]): number[][] {
  const frequencyMap = new Map<number, number>();
  data.forEach(row => {
    row.forEach(n => {
      frequencyMap.set(n, (frequencyMap.get(n) || 0) + 1);
    });
  });

  return data.map(row => {
    const frequencies = row.map(n => frequencyMap.get(n) || 0);
    const dayOfWeek = new Date(row[1]).getDay();
    const month = new Date(row[1]).getMonth();
    return [...row, ...frequencies, dayOfWeek, month];
  });
}

export function crossValidate(model: tf.LayersModel, data: number[][], folds: number): number {
  const foldSize = Math.floor(data.length / folds);
  let totalAccuracy = 0;

  for (let i = 0; i < folds; i++) {
    const validationStart = i * foldSize;
    const validationEnd = validationStart + foldSize;
    const validationData = data.slice(validationStart, validationEnd);
    const trainingData = [...data.slice(0, validationStart), ...data.slice(validationEnd)];

    const trainXs = tf.tensor3d(trainingData.map(row => [row.slice(0, 17)]));
    const trainYs = tf.tensor2d(trainingData.map(row => row.slice(17)));
    const valXs = tf.tensor3d(validationData.map(row => [row.slice(0, 17)]));
    const valYs = tf.tensor2d(validationData.map(row => row.slice(17)));

    model.fit(trainXs, trainYs, { epochs: 1, validationData: [valXs, valYs] });

    const accuracy = model.evaluate(valXs, valYs) as tf.Scalar;
    totalAccuracy += accuracy.dataSync()[0];

    trainXs.dispose();
    trainYs.dispose();
    valXs.dispose();
    valYs.dispose();
  }

  return totalAccuracy / folds;
}

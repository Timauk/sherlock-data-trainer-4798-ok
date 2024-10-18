import * as tf from '@tensorflow/tfjs';

let sharedModel: tf.Sequential | null = null;

export async function createSharedModel() {
  if (!sharedModel) {
    sharedModel = tf.sequential();
    sharedModel.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [15] }));
    sharedModel.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    sharedModel.add(tf.layers.dense({ units: 15, activation: 'sigmoid' }));
    sharedModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  }
  return sharedModel;
}

export function calculateDynamicReward(matches: number, totalPlayers: number): number {
  const baseReward = Math.pow(10, matches - 10);
  const competitionFactor = 1 + (totalPlayers / 100);
  return Math.round(baseReward * competitionFactor);
}

export async function predictNumbers(input: number[]): Promise<number[]> {
  if (!sharedModel) await createSharedModel();
  const inputTensor = tf.tensor2d([input]);
  const prediction = sharedModel!.predict(inputTensor) as tf.Tensor;
  const result = Array.from(await prediction.data());
  inputTensor.dispose();
  prediction.dispose();
  
  // Modificação para garantir números únicos
  const uniqueNumbers = new Set<number>();
  while (uniqueNumbers.size < 15) {
    const num = Math.round(result[uniqueNumbers.size] * 24) + 1;
    if (!uniqueNumbers.has(num)) {
      uniqueNumbers.add(num);
    }
  }
  
  return Array.from(uniqueNumbers);
}

export function processCSV(text: string): number[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => 
    line.split(',').map(Number).filter((_, index) => index > 1 && index <= 16)
  );
}

export async function trainModel(data: number[][]) {
  const model = await createSharedModel();
  const xs = tf.tensor2d(data.map(row => row.slice(0, 15)));
  const ys = tf.tensor2d(data.map(row => row.slice(15)));
  
  await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    shuffle: true,
    validationSplit: 0.2,
  });

  xs.dispose();
  ys.dispose();
  
  return model;
}
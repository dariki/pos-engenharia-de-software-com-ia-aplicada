import * as tf from '@tensorflow/tfjs-node';

const RISK_LABELS = ['Low', 'Moderate', 'High'];

/**
 * Wraps a small TensorFlow.js sequential model that classifies diabetes
 * risk (Low / Moderate / High) from a numeric feature vector.
 */
export class DiabetesRiskModel {
  #model;

  constructor(inputSize) {
    this.#model = this.#build(inputSize);
  }

  #build(inputSize) {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [inputSize], units: 80, activation: 'relu' }));
    model.add(tf.layers.dense({ units: RISK_LABELS.length, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    return model;
  }

  async train(inputs, labels, { epochs = 100, shuffle = true } = {}) {
    const inputTensor = tf.tensor2d(inputs);
    const labelTensor = tf.tensor2d(labels);
    await this.#model.fit(inputTensor, labelTensor, { epochs, shuffle });
  }

  /**
   * Predicts risk probabilities for a single feature vector.
   * Returns both the raw ordered array and a labeled object, e.g.
   * { Low: 0.27, Moderate: 0.66, High: 0.06 }.
   */
  predict(featureVector) {
    const prediction = this.#model.predict(tf.tensor2d([featureVector]));
    const [probabilities] = prediction.arraySync();

    const byLabel = {};
    RISK_LABELS.forEach((label, index) => {
      byLabel[label] = probabilities[index];
    });

    return { probabilities, byLabel };
  }
}

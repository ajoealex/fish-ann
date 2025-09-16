const sigmoid = x => 1 / (1 + Math.exp(-x));
const dSigmoid = y => y * (1 - y);

class NeuralNetwork {
  constructor(layers, lr = 0.3) {
    this.layers = layers; // e.g., [4, 12, 8, 2]
    this.lr = lr;

    // Initialize weights and biases for each layer
    this.weights = [];
    this.biases = [];
    for (let l = 0; l < layers.length - 1; l++) {
      this.weights.push(this.rand(layers[l + 1], layers[l]));
      this.biases.push(this.rand(layers[l + 1], 1));
    }
  }

  rand(r, c) {
    return Array.from({ length: r }, () =>
      Array.from({ length: c }, () => Math.random() * 2 - 1)
    );
  }

  static dot(a, b) {
    const res = Array.from({ length: a.length }, () =>
      Array(b[0].length).fill(0)
    );
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b[0].length; j++)
        for (let k = 0; k < b.length; k++) res[i][j] += a[i][k] * b[k][j];
    return res;
  }

  static add(a, b) {
    return a.map((r, i) => r.map((v, j) => v + b[i][j]));
  }

  static sub(a, b) {
    return a.map((r, i) => r.map((v, j) => v - b[i][j]));
  }

  static map(m, f) {
    return m.map(r => r.map(f));
  }

  static T(m) {
    return m[0].map((_, i) => m.map(r => r[i]));
  }

  static toM(a) {
    return a.map(v => [v]);
  }

  feedForward(input) {
    let activations = NeuralNetwork.toM(input);
    for (let l = 0; l < this.weights.length; l++) {
      let z = NeuralNetwork.add(
        NeuralNetwork.dot(this.weights[l], activations),
        this.biases[l]
      );
      activations = NeuralNetwork.map(z, sigmoid);
    }
    return activations;
  }

  train(input, target) {
    // Forward pass
    let activations = [NeuralNetwork.toM(input)];
    let zs = [];
    for (let l = 0; l < this.weights.length; l++) {
      let z = NeuralNetwork.add(
        NeuralNetwork.dot(this.weights[l], activations[l]),
        this.biases[l]
      );
      zs.push(z);
      activations.push(NeuralNetwork.map(z, sigmoid));
    }

    // Output error
    const targets = NeuralNetwork.toM(target);
    let delta = NeuralNetwork.sub(targets, activations.at(-1));

    // Backward pass
    for (let l = this.weights.length - 1; l >= 0; l--) {
      let grad = NeuralNetwork.map(activations[l + 1], dSigmoid);
      grad = grad.map((r, i) =>
        r.map((v, j) => v * delta[i][j] * this.lr)
      );
      const weightDelta = NeuralNetwork.dot(
        grad,
        NeuralNetwork.T(activations[l])
      );
      this.weights[l] = NeuralNetwork.add(this.weights[l], weightDelta);
      this.biases[l] = NeuralNetwork.add(this.biases[l], grad);

      if (l > 0) {
        delta = NeuralNetwork.dot(NeuralNetwork.T(this.weights[l]), delta);
      }
    }
  }

  clone() {
    const copy = new NeuralNetwork(this.layers, this.lr);
    copy.weights = this.weights.map(r => r.map(rr => [...rr]));
    copy.biases = this.biases.map(r => r.map(rr => [...rr]));
    return copy;
  }

  mutate(rate = 0.05) {
    const jitter = v => v + (Math.random() * 2 - 1) * rate;
    this.weights = this.weights.map(r => r.map(rr => rr.map(jitter)));
    this.biases = this.biases.map(r => r.map(rr => rr.map(jitter)));
    return this;
  }
}

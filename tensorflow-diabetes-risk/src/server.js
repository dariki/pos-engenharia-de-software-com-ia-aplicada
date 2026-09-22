import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Builds the Express app wired to a given dataset and model. Kept separate
 * from index.js so the wiring (routes, middleware) can be reasoned about
 * and reused independently of process startup.
 */
export function createServer(dataset, model) {
  const app = express();

  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/cities', (_req, res) => {
    res.json(dataset.knownCities);
  });

  app.post('/predict', (req, res) => {
    const patient = req.body;
    const featureVector = dataset.toFeatureVector(patient);
    const { byLabel } = model.predict(featureVector);
    res.json(byLabel);
  });

  return app;
}

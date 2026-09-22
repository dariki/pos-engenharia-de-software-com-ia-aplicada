import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PatientDataset } from './PatientDataset.js';
import { DiabetesRiskModel } from './DiabetesRiskModel.js';
import { createServer } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'data', 'diabetes_risk.json');
const PORT = process.env.PORT || 3000;

async function main() {
  console.log('Loading dataset...');
  const dataset = await PatientDataset.fromFile(DATA_PATH);

  console.log('Training model...');
  const model = new DiabetesRiskModel(dataset.inputs[0].length);
  await model.train(dataset.inputs, dataset.labels, { epochs: 100 });
  console.log('Model trained.');

  const app = createServer(dataset, model);
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

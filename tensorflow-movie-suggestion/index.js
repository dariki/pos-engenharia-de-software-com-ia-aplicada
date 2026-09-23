const tf = require('@tensorflow/tfjs-node');
const fs = require('fs/promises');
const path = require('path');

const normalize = (value, min, max) => (value - min) / ((max - min) || 1);

async function main() {

    console.log('TensorFlow.js version:', tf.version.tfjs);

    // --- USUÁRIOS ---
    const usersStep1Path = path.join(__dirname, 'data', 'users-step-1.json');
    const usersStep1 = JSON.parse(await fs.readFile(usersStep1Path, 'utf8'));

    const ages = usersStep1.map(user => user.age);
    const maxAge = Math.max(...ages);
    const minAge = Math.min(...ages);

    const normalizedAges = usersStep1.map(user => normalize(user.age, minAge, maxAge));
    console.log({ normalizedAges });

    // --- FILMES ---
    const moviesStep1Path = path.join(__dirname, 'data', 'movies-step-1.json');
    const moviesStep1 = JSON.parse(await fs.readFile(moviesStep1Path, 'utf8'));

    const moviesByTitle = new Map(moviesStep1.map(movie => [movie.title, movie]));

    const moviesVoteAverage = moviesStep1.map(movie => movie.vote_average);
    const maxVoteAverage = Math.max(...moviesVoteAverage);
    const minVoteAverage = Math.min(...moviesVoteAverage);

    // --- MONTANDO xs (input) e ys (label) JUNTOS, MESMO PERCURSO ---
    const input = [];
    const label = [];

    usersStep1.forEach((user, index) => {
        const userAgeNorm = normalizedAges[index];

        moviesByTitle.forEach((movie, title) => {
            const movieVoteNorm = normalize(movie.vote_average, minVoteAverage, maxVoteAverage);
            const labelValue = user.likedMovie === title ? 1 : 0;

            input.push([userAgeNorm, movieVoteNorm]);
            label.push(labelValue);
        });
    });

    const inputTensor = tf.tensor2d(input);
    const labelTensor = tf.tensor2d(label, [label.length, 1]);

    console.log(`input: ${JSON.stringify(input)}`);
    console.log(`inputTensor.shape: ${inputTensor.shape}`);
    console.log(`label: ${JSON.stringify(label)}`);
    console.log(`labelTensor.shape: ${labelTensor.shape}`);

    // --- CRIANDO O MODELO ---
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [2], units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
        optimizer: tf.train.adam(),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    // --- TREINANDO ---
    await model.fit(inputTensor, labelTensor, {
        epochs: 100,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (epoch % 20 === 0) {
                    console.log(`epoch ${epoch}: loss=${logs.loss.toFixed(4)} acc=${logs.acc.toFixed(4)}`);
                }
            },
        },
    });

    // --- PREDIÇÃO PRA FERNANDA ---
    const fernandaAgeNorm = normalize(30, minAge, maxAge);
    const fernandaInput = [];
    const fernandaTitles = [];

    moviesByTitle.forEach((movie, title) => {
        const movieVoteNorm = normalize(movie.vote_average, minVoteAverage, maxVoteAverage);
        fernandaInput.push([fernandaAgeNorm, movieVoteNorm]);
        fernandaTitles.push(title);
    });

    const fernandaInputTensor = tf.tensor2d(fernandaInput);
    const predictions = model.predict(fernandaInputTensor);
    const predictionValues = predictions.dataSync();

    const results = fernandaTitles.map((title, i) => ({ title, score: predictionValues[i] }));
    results.sort((a, b) => b.score - a.score);

    console.log('recomendações para Fernanda:', results);
}

main().catch(err => console.error(err));
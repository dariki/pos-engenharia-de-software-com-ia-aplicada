const form = document.getElementById('patient-form');
const citySelect = document.getElementById('city-select');
const resultSection = document.getElementById('result');
const resultList = document.getElementById('result-list');
const errorMessage = document.getElementById('error-message');

async function loadCities() {
  const response = await fetch('/cities');
  const cities = await response.json();
  citySelect.innerHTML = cities
    .map((city) => `<option value="${city}">${city}</option>`)
    .join('');
}

function showResult(probabilitiesByLabel) {
  errorMessage.hidden = true;
  resultList.innerHTML = Object.entries(probabilitiesByLabel)
    .map(([label, probability]) => `<li>${label}: ${(probability * 100).toFixed(2)}%</li>`)
    .join('');
  resultSection.hidden = false;
}

function showError(message) {
  resultSection.hidden = true;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const patient = {
    age: Number(formData.get('age')),
    gender: formData.get('gender'),
    city: formData.get('city'),
    bmi: Number(formData.get('bmi')),
    fasting_blood_sugar: Number(formData.get('fasting_blood_sugar')),
    hba1c_level: Number(formData.get('hba1c_level')),
  };

  try {
    const response = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const probabilitiesByLabel = await response.json();
    showResult(probabilitiesByLabel);
  } catch (error) {
    showError(`Could not get a prediction: ${error.message}`);
  }
});

loadCities().catch((error) => {
  showError(`Could not load cities: ${error.message}`);
});

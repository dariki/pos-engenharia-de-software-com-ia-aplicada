import { readFile } from 'node:fs/promises';

/**
 * Numeric fields that get min-max normalized and then multiplied by a
 * clinical importance weight before being fed into the model.
 *
 * Weights are manual multipliers (0.1-0.9) applied on top of the already
 * normalized value, reflecting clinical relevance for diabetes risk:
 * - hba1c_level: gold-standard diagnostic marker (highest weight)
 * - fasting_blood_sugar: also diagnostic, medium weight
 * - bmi: indirect risk factor, lowest weight
 */
const WEIGHTED_FIELDS = {
  hba1c_level: 0.9,
  fasting_blood_sugar: 0.6,
  bmi: 0.3,
};

/**
 * Encapsulates a set of patients and all the feature engineering needed to
 * turn them into numeric vectors a TensorFlow model can consume.
 *
 * The same instance is used both to build the training data and to encode
 * new, unseen patients, so the city vocabulary and numeric ranges (min/max)
 * are computed once from the training set and reused consistently.
 */
export class PatientDataset {
  static WEIGHTED_FIELDS = WEIGHTED_FIELDS;

  #patients;
  #knownCities;
  #ranges;

  constructor(patients) {
    this.#patients = patients;
    this.#knownCities = Array.from(new Set(patients.map((patient) => patient.city)));
    this.#ranges = this.#computeRanges(patients);
  }

  /**
   * Static factory method: loads and parses a JSON file of patients.
   * Constructors can't be async, so this is the idiomatic Node.js way of
   * providing an async "constructor".
   */
  static async fromFile(filePath) {
    const patients = JSON.parse(await readFile(filePath, 'utf-8'));
    return new PatientDataset(patients);
  }

  get knownCities() {
    return this.#knownCities;
  }

  /** Training feature vectors, one per patient, in dataset order. */
  get inputs() {
    return this.#patients.map((patient) => this.toFeatureVector(patient));
  }

  /** Training label vectors (one-hot risk), one per patient, in dataset order. */
  get labels() {
    return this.#patients.map((patient) => Object.values(this.#encodeRisk(patient)));
  }

  /**
   * Converts a single patient (from the training set or a brand new one)
   * into the numeric feature vector the model expects. Reuses the city
   * vocabulary and numeric ranges computed from the training set, so a new
   * patient always produces a vector of the same length/shape.
   */
  toFeatureVector(patient) {
    const gender = this.#encodeGender(patient);
    const city = this.#encodeCity(patient);
    const weighted = this.#encodeWeightedFields(patient);

    return [
      this.#normalizeField(patient, 'age'),
      gender.genderMale,
      gender.genderFemale,
      ...Object.values(city),
      ...weighted,
    ];
  }

  #computeRanges(patients) {
    const numericFields = ['age', ...Object.keys(WEIGHTED_FIELDS)];
    const ranges = {};
    for (const field of numericFields) {
      const values = patients.map((patient) => patient[field]);
      ranges[field] = { min: Math.min(...values), max: Math.max(...values) };
    }
    return ranges;
  }

  #normalizeField(patient, field) {
    const { min, max } = this.#ranges[field];
    return normalize(patient[field], min, max);
  }

  #encodeGender(patient) {
    return {
      genderMale: patient.gender === 'Male' ? 1 : 0,
      genderFemale: patient.gender === 'Female' ? 1 : 0,
    };
  }

  #encodeCity(patient) {
    const encoded = {};
    this.#knownCities.forEach((city) => {
      encoded[`city_${city}`] = patient.city === city ? 1 : 0;
    });
    return encoded;
  }

  #encodeWeightedFields(patient) {
    return Object.entries(WEIGHTED_FIELDS).map(([field, weight]) => {
      return this.#normalizeField(patient, field) * weight;
    });
  }

  #encodeRisk(patient) {
    return {
      riskLow: patient.diabetes_risk === 'Low' ? 1 : 0,
      riskModerate: patient.diabetes_risk === 'Moderate' ? 1 : 0,
      riskHigh: patient.diabetes_risk === 'High' ? 1 : 0,
    };
  }
}

function normalize(value, min, max) {
  return (value - min) / ((max - min) || 1);
}

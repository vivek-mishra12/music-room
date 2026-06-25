// backend/config/gemini.js
const { GoogleGenAI } = require('@google/genai');

// Ensure you have loaded your environment variables (e.g., using require('dotenv').config())
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});

module.exports = ai;
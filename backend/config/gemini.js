// backend/config/gemini.js
const { GoogleGenAI } = require('@google/genai');

// Pass an empty object so the constructor can safely check options
const ai = new GoogleGenAI({}); 

module.exports = ai;
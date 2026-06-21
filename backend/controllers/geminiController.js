// backend/controllers/geminiController.js
const ai = require('../config/gemini');

const recommendSongs = async (req, res) => {
    try {
        const { prompt } = require('express');
        const userPrompt = req.body.prompt;

        if (!userPrompt) {
            return res.status(400).json({ success: false, message: "Prompt is required" });
        }

        // We use 'gemini-2.5-flash' for optimized speed and low-cost text generation
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert AI DJ inside a virtual synchronized music room. 
                       The user wants music recommendations for the following mood/theme: "${userPrompt}". 
                       Provide a short, friendly response and list exactly 5 specific song titles with their artists.`,
        });

        return res.status(200).json({
            success: true,
            recommendation: response.text
        });

    } catch (error) {
        console.error("Gemini Generation Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "AI failed to process your recommendation request.",
            error: error.message
        });
    }
};

module.exports = { recommendSongs };
// backend/controllers/geminiController.js
const ai = require('../config/gemini');

const recommendSongs = async (req, res) => {
    try {
        const userPrompt = req.body.prompt;

        if (!userPrompt) {
            return res.status(400).json({ success: false, message: "Prompt is required" });
        }

        // Call the Gemini model using correct @google/genai SDK syntax
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `You are an expert AI DJ inside a virtual synchronized music room. 
                       The user wants music recommendations for the following mood/theme: "${userPrompt}". 
                       Provide a short, friendly response and list exactly 5 specific song titles with their artists.`,
        });

        res.status(200).json({ 
            success: true, 
            recommendations: response.text 
        });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { recommendSongs };
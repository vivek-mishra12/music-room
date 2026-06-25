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
            model: 'gemini-2.5-flash',
            contents: `Recommend a list of tracks based on this request: ${userPrompt}. Provide the response as a clean JSON array of strings containing track names and artists.`,
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
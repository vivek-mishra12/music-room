const axios = require("axios");

const searchVideos = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(
      query
    )}&type=video&key=${process.env.YOUTUBE_API_KEY}`;

    const response = await axios.get(url);

    res.status(200).json(response.data.items);

  } catch (error) {
    console.error("YouTube Search Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
};

module.exports = {
  searchVideos,
};
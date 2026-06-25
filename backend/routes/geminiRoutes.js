// backend/routes/geminiRoutes.js
const express = require('express');
const router = express.Router();
const { recommendSongs } = require('../controllers/geminiController');

router.post('/suggest', recommendSongs);

module.exports = router;
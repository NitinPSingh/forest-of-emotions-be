const express = require('express');
const router = express.Router();
const emotionController = require('../controllers/emotionController');


router.post('/inbound-email', emotionController.analyzeEmail);


router.get('/emotion-logs', emotionController.getEmotionLogs);
router.get('/emotion-logs/:id', emotionController.getEmotionLog);
router.delete('/emotion-logs/:id', emotionController.deleteEmotionLog);


router.get('/metrics/emotion-count', emotionController.getEmotionCounts);
router.get('/metrics/daily-summary', emotionController.getDailySummary);
router.get('/metrics/emotion-summary', emotionController.getEmotionSummary);
router.get('/metrics/predominant-emotion', emotionController.getPredominantEmotionByDate);
router.get('/metrics/all-emotions',emotionController.getAllEmotions)
module.exports = router; 
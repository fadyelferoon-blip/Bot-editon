const express = require('express');
const router = express.Router();
const signalsController = require('../controllers/signalsController');

// Get MXN signal with timezone support
router.post('/mxn', signalsController.generateMXNSignals);

// Get upcoming signals
router.get('/upcoming', signalsController.getUpcomingSignals);

// Clear cache
router.post('/clear-cache', signalsController.clearCache);

module.exports = router;

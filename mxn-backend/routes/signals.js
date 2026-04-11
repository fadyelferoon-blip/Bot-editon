const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/signalsController');

router.post('/mxn',         ctrl.generateMXNSignals);
router.get('/upcoming',     ctrl.getUpcomingSignals);
router.get('/status',       ctrl.getCacheStatus);
router.post('/clear-cache', ctrl.clearCache);
router.post('/refresh',     ctrl.forceRefresh);

module.exports = router;

const express = require('express');
const router = express.Router();
const ApiController = require('../controllers/ApiController');

// Route to add a new API
router.post('/add', ApiController.addApi);

// Route to get all APIs
router.get('/list', ApiController.getAllApis);

// Route to scan an API for vulnerabilities
router.post('/scan/:id', ApiController.scanApi);

// Route to get all specific API
router.get('/details/:id', ApiController.getApiDetails);


module.exports = router;

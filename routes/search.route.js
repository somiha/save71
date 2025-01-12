// app/routes/search.js

const express = require('express');
const router = express.Router();
const { search, getSuggestions } = require('../controllers/search.controller');

router.get('/search', search);
router.post('/search/suggestions', getSuggestions);

module.exports = router;

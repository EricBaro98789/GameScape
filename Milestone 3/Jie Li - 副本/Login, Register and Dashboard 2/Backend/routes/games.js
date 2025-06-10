// FILE: Backend/routes/games.js (No changes needed, provided for completeness)

const express = require('express');
// const axios = require('axios'); // Passed in now

const router = express.Router();

// This module exports a function that accepts the RAWG_API_KEY and axios
module.exports = (RAWG_API_KEY, axios) => {

    // Handles requests to GET /api/games/search
    router.get('/search', async (req, res) => {
        const { query: searchQuery } = req.query;
        if (!searchQuery) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const rawgUrl = `https://api.rawg.io/api/games`;
        try {
            const response = await axios.get(rawgUrl, {
                params: { key: RAWG_API_KEY, search: searchQuery, page_size: 10 }
            });
            res.json(response.data);
        } catch (error) {
            console.error('Error fetching search data from RAWG API:', error.message);
            res.status(500).json({ message: 'Error fetching data from external API' });
        }
    });

    // Handles requests to GET /api/games/:id
    router.get('/:id', async (req, res) => {
        const { id: gameId } = req.params;
        if (!gameId) {
            return res.status(400).json({ message: 'Game ID is required' });
        }
        const rawgUrl = `https://api.rawg.io/api/games/${gameId}`;
        try {
            const response = await axios.get(rawgUrl, {
                params: { key: RAWG_API_KEY }
            });
            res.json(response.data);
        } catch (error) {
            console.error(`Error fetching details for game ID ${gameId} from RAWG API:`, error.message);
            res.status(500).json({ message: `Error fetching game details for ID ${gameId}` });
        }
    });

    return router;
};

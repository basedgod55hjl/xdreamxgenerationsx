const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// API Proxy to Graydient
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, model, negative_prompt } = req.body;
        const apiKey = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        // Determine destination URL - default to valid Graydient endpoint if not in env
        // Common Graydient endpoint structure might need verification, defaulting to v1/generate
        const apiUrl = process.env.GRAYDIENT_URL || 'https://api.graydient.ai/v1/generate';

        // Construct payload based on typical SD/Graydient API
        const payload = {
            prompt: prompt,
            negative_prompt: negative_prompt || "",
            model: model || "model_name_here", // Will be passed from client
            steps: 30, // Default premium steps
            cfg_scale: 7,
            width: 1024,
            height: 1024,
            samples: 1
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// Serve React App
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

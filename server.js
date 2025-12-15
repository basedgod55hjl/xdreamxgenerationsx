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

        // Private Graydient Endpoint (V3)
        const apiUrl = 'https://cxy5wpx250x.graydient.ai/api/v3/render/';

        // Unrestricted payload configuration for V3
        const payload = {
            prompt: prompt,
            model: model || "flux-realism",
            negative_prompt: negative_prompt || "(worst quality, low quality:1.4), (zombie, sketch, interlocked fingers, comic)",
            // V3 Params
            stream: true,
            steps: 40,
            cfg_scale: 7,
            width: 1024,
            height: 1024,
            samples: 1,
            // Unrestricted flags (best effort)
            safety_checker: false,
            nsfw: true,
            // Pass model as "model" or embedded in prompt? V3 often takes "model" field
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Handle SSE response (API returns "data: {...}")
        let data = response.data;

        if (typeof data === 'string' && data.includes('data:')) {
            try {
                // Extract the JSON object from the SSE stream
                const matches = data.match(/data: ({.*})/);
                if (matches && matches[1]) {
                    data = JSON.parse(matches[1]);
                    // Check specifically for rendering_done or just use the root
                    if (data.rendering_done) {
                        data = data.rendering_done;
                    }
                }
            } catch (e) {
                console.error('Failed to parse SSE:', e);
            }
        }

        // Normalize response for frontend
        if (data.output_file) {
            data.url = data.output_file;
        } else if (data.url) {
            // Already has url
        }

        res.json(data);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        // ... err handling
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// DeepSeek Prompt Refinement
app.post('/api/refine', async (req, res) => {
    try {
        const { prompt } = req.body;
        // Check for DeepSeek Key - defaulting to a placeholder if not set, user needs to set DEEPSEEK_API_KEY
        const deepseekKey = process.env.DEEPSEEK_API_KEY;

        if (!deepseekKey) {
            // Fallback: If no key, just return original to avoid crash, or error
            // For now, let's mock it if missing to let UI work, or error?
            // Better to error so they know to add it.
            return res.status(500).json({ error: 'Missing DEEPSEEK_API_KEY' });
        }

        const response = await axios.post('https://api.deepseek.com/chat/completions', {
            model: "deepseek-reasoner",
            messages: [
                { role: "system", content: "You are an expert prompt engineer for Stable Diffusion/Flux. Refine the user's prompt to be highly detailed, artistic, and unrestricted. Output ONLY the refined prompt, no yapping." },
                { role: "user", content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${deepseekKey}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ refined_prompt: response.data.choices[0].message.content });

    } catch (error) {
        console.error('DeepSeek Error:', error.message);
        res.status(500).json({ error: 'Failed to refine prompt' });
    }
});

// Face Swap Proxy
app.post('/api/faceswap', async (req, res) => {
    try {
        const { source_image, target_image } = req.body;
        const apiKey = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN;

        // Using likely ReActor endpoint or Graydient equivalent
        const apiUrl = 'https://cxy5wpx250x.graydient.ai/v1/faceswap';

        const payload = {
            source_image: source_image, // Base64
            target_image: target_image, // Base64
            model: "inswapper_128.onnx"
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('FaceSwap Error:', error.message);
        res.status(500).json({ error: 'Face Swap Failed' });
    }
});

// Serve React App
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

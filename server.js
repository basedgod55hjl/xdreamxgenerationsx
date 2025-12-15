const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Config
const apiKey = process.env.GRAYDIENT_API_KEY || '0Cqo0fZp1ViEI1oFnLLWRDzDcndzycvo8lfyxrLmiWzfgnXO';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// API Proxy to Graydient
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, model, negative_prompt } = req.body;
        const graydientApiKey = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN;

        if (!graydientApiKey) {
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
                'Authorization': `Bearer ${graydientApiKey}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        // Robust Stream Parsing
        let finalUrl = null;

        await new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                const str = chunk.toString();
                buffer += str;
                const lines = str.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmed.replace('data: ', '').trim();
                            if (jsonStr === '[DONE]') return;
                            const data = JSON.parse(jsonStr);

                            // Check for output_file at root or nested in rendering_done
                            const url = data.output_file ||
                                (data.rendering_done && data.rendering_done.output_file);

                            if (url) {
                                finalUrl = url;
                                resolve(); // Found it
                            }
                        } catch (e) {
                            // ignore partials
                        }
                    }
                });
            });

            response.data.on('end', () => resolve());
            response.data.on('error', (err) => reject(err));
        });

        if (!finalUrl) {
            throw new Error('Image generation completed but no URL was found in stream.');
        }

        const data = { url: finalUrl };
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
        const { prompt, workflow } = req.body; // Read workflow from body
        const deepseekKey = process.env.DEEPSEEK_API_KEY;

        if (!deepseekKey) {
            return res.status(500).json({ error: 'Missing DEEPSEEK_API_KEY' });
        }
        // LUCARIO AGI / DEEPSEEK REASONER INTEGRATION
        const deepseekUrl = 'https://api.deepseek.com/chat/completions';

        let styleContext = "";
        if (workflow === 'Anime / Booru') {
            styleContext = "Style: Anime, Cell Shading, Booru Tags (1girl, solo, etc). Use Niji style.";
        } else if (workflow === 'Photorealistic') {
            styleContext = "Style: Photorealism, 8k, raw photo, dslr, soft lighting.";
        } else if (workflow === 'Cinematic') {
            styleContext = "Style: Movie still, cinematic lighting, dramatic atmosphere, color grading.";
        } else if (workflow === 'Ass Focused') {
            styleContext = "Focus: Ass focused, thick thighs, curves, back view, bent over, explicit anatomy, huge buttocks.";
        } else if (workflow === 'Ebony / Thick') {
            styleContext = "Focus: Ebony skin, African-American, very thick body, plump, curvy, detailed skin texture, glistening.";
        } else {
            styleContext = "Style: Lucario NSFW, highly detailed, explicit anatomy, vivid sensory description.";
        }

        const systemPrompt = `You are an expert NSFW Prompt Engineer for Stable Diffusion/Flux models.
        Your goal is to rewrite the user's input into a HIGHLY DETAILED, EXPLICIT, and AESTHETIC prompt based on the requested workflow.
        
        Current Workflow: ${workflow || 'Unspecified'}
        ${styleContext}
        
        Follow this strict format:
        [Subject/Character], [Physical Details], [Outfit/Nude State], [Action/Pose], [Setting/Background], [Lighting/Camera], [Tags/Quality]
        
        General Rules:
        1. Use booru tags and weight syntax (e.g. (word:1.3), [word:0.8]).
        2. Be explicitly NSFW if requested or implied (use terms like "fully nude", "exposed", "detailed anatomy").
        3. Include high-quality modifiers: "masterpiece, best quality, 8k, photorealistic, ultra detailed skin texture, glistening sweat".
        4. Use vivid, sensory language: "curvaceous", "voluptuous", "glowing", "intricate".
        5. If the user input is simple (e.g., "girl in car"), expand it into a full scene.
        
        Negative Prompt (generate this as well):
        (worst quality, low quality:1.4), (deformed, distorted, disfigured:1.3), bad anatomy, bad hands, missing limbs, floating limbs, (zombie, sketch, interlocked fingers, comic)
        
        Output ONLY the positive prompt string. Do not output the negative prompt here (frontend handles it) or any conversational text.`;

        const response = await axios.post(deepseekUrl, {
            model: "deepseek-reasoner", // or deepseek-chat if reasoner is unavailable/too slow
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${deepseekKey}`,
                'Content-Type': 'application/json'
            }
        });

        const refinedPrompt = response.data.choices[0].message.content;
        res.json({ refined_prompt: refinedPrompt });

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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

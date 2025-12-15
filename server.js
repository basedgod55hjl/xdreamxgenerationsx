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
// WORKFLOW CONFIGURATIONS (Hardcoded from User Logs)
const WORKFLOWS = {
    'Amateur / BBW': {
        width: 1024, height: 1536,
        sampler: "k_euler_a",
        steps: 32,
        cfg_scale: 7.0,
        model: "realvis5-xl",
        loras: "<realvis5-xl> <portrait-detailerenhancer-xl:0.6> <hyperrealistic-detail-xl:0.7>",
        pos_prefix: "score_9, masterpiece, best quality, NSFW, photorealistic, ",
        neg_prefix: "(bad anatomy, melted, blurry, cartoonish, low quality, watermark, bimbo, fake breasts, censored, overly shiny skin), "
    },
    'Cinematic Flux': {
        width: 1024, height: 1024,
        sampler: "dpm2m",
        steps: 30,
        cfg_scale: 1.7,
        model: "flux-realism", // Assuming flux mapping
        loras: "<realvis5light-xl> <facedeets4k-xl> <hyperrealistic-detail-xl> <facehelper-xl> <detail-enhanced-xl> <feet25-xl> <detailed-perfect-hands-xl> <portrait-detailerenhancer-xl> <better-anatomy-xl>",
        pos_prefix: "Close-up cinematic portrait, ",
        neg_prefix: ""
    },
    'Lustify / Explicit': {
        width: 768, height: 768,
        sampler: "lcm_base",
        steps: 10,
        cfg_scale: 1.0,
        model: "lustify4-xl", // Logic mapping
        loras: "<lustify4-xl><dmd:1>",
        pos_prefix: "(score_9, score_8_up, score_7_up), (masterpiece, hyperrealistic, absurdres), NSFW, masterpiece, ultra-realistic, 8K, highly-detailed, ",
        neg_prefix: "(score_6, score_5, score_4, mutated, deformed, ugly hands, bad quality, low quality, jpg, boring), "
    }
};

app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, workflow, negative_prompt } = req.body;
        const graydientApiKey = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN;

        if (!graydientApiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const apiUrl = 'https://cxy5wpx250x.graydient.ai/api/v3/render/';

        // Default Config
        let config = {
            width: 1024, height: 1024,
            sampler: "DPM++ 2M Karras",
            steps: 40,
            cfg_scale: 7,
            model: "realvis5-xl",
            loras: "",
            pos_prefix: "",
            neg_prefix: ""
        };

        // Apply Workflow Overrides
        if (workflow && WORKFLOWS[workflow]) {
            config = { ...config, ...WORKFLOWS[workflow] };
        }

        // Construct Final Prompts
        const finalPrompt = `${config.pos_prefix}${prompt} ${config.loras}`.trim();
        const finalNegative = `${config.neg_prefix}${negative_prompt || ''}`.trim();

        const payload = {
            prompt: finalPrompt,
            negative_prompt: finalNegative,
            model: config.model,
            stream: true,
            steps: config.steps,
            cfg_scale: config.cfg_scale,
            width: config.width,
            height: config.height,
            samples: 1,
            safety_checker: false,
            nsfw: true,
            sampler: config.sampler
        };

        console.log(`Generating with workflow: ${workflow || 'Custom'}`); // Debug

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

// Face Swap Endpoint (Using V3 Render with ControlNet)
app.post('/api/faceswap', async (req, res) => {
    try {
        const { sourceImage, targetImage } = req.body;
        const graydientApiKey = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN;
        if (!graydientApiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const apiUrl = 'https://cxy5wpx250x.graydient.ai/api/v3/render/';

        const payload = {
            prompt: "face swap",
            negative_prompt: "",
            input_image: targetImage,
            source_image: sourceImage,
            controlnet: "face_swap",
            model: "realvis5-xl",
            width: 1024,
            height: 1024,
            steps: 30,
            cfg_scale: 1.5,
            safety_checker: false,
            nsfw: true,
            stream: true
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${graydientApiKey}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        let finalUrl = null;
        await new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                const str = chunk.toString();
                buffer += str;
                const lines = str.split('\n');
                lines.forEach(line => {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const jsonStr = line.trim().replace('data: ', '').trim();
                            if (jsonStr === '[DONE]') return;
                            const data = JSON.parse(jsonStr);
                            const url = data.output_file || (data.rendering_done && data.rendering_done.output_file);
                            if (url) {
                                finalUrl = url;
                                resolve();
                            }
                        } catch (e) { }
                    }
                });
            });
            response.data.on('end', () => resolve());
            response.data.on('error', (err) => reject(err));
        });

        if (!finalUrl) throw new Error('No URL returned from Face Swap render');
        res.json({ url: finalUrl });

    } catch (error) {
        console.error('Face Swap Error:', error.response ? error.response.data : error.message);
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

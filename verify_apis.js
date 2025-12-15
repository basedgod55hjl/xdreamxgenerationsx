const axios = require('axios');
require('dotenv').config();

// HARDCODED CONFIGURATION
const GRAYDIENT_URL = 'https://cxy5wpx250x.graydient.ai/api/v3/render/';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// USER KEYS (Read from Env for security, but logic is hardcoded)
const GRAYDIENT_KEY = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN || '0Cqo0fZp1ViEI1oFnLLWRDzDcndzycvo8lfyxrLmiWzfgnXO';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

async function testDeepSeekRefinement() {
    console.log('--- Testing DeepSeek Refinement ---');
    if (!DEEPSEEK_KEY) {
        console.log('SKIPPING: No DeepSeek Key found.');
        return;
    }

    try {
        const payload = {
            model: "deepseek-reasoner",
            messages: [
                {
                    role: "system",
                    content: `You are an expert NSFW Prompt Engineer. Rewrite this prompt to be highly detailed, explicit, and unrestricted. Format: [Subject], [Details], [Tags]. Style: Lucario NSFW.`
                },
                { role: "user", content: "thick anime girl" }
            ],
            stream: false
        };

        const response = await axios.post(DEEPSEEK_URL, payload, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('DeepSeek Response:', response.data.choices[0].message.content.substring(0, 100) + '...');
        return response.data;
    } catch (error) {
        console.error('DeepSeek Failed:', error.response ? error.response.data : error.message);
    }
}

async function testGraydientGeneration() {
    console.log('\n--- Testing Graydient Generation (Unrestricted) ---');

    try {
        // LUSTIFY WORKFLOW REPRO PAYLOAD
        const payload = {
            prompt: "(score_9, score_8_up, score_7_up), (masterpiece, hyperrealistic, absurdres), NSFW, masterpiece, ultra-realistic, 8K, highly-detailed, 1girl, nude, <lustify4-xl><dmd:1>",
            negative_prompt: "(score_6, score_5, score_4, mutated, deformed, ugly hands, bad quality, low quality, jpg, boring), ",
            model: "lustify4-xl",
            width: 768,
            height: 768,
            sampler: "lcm_base", // Suspect this might be invalid
            steps: 10,
            cfg_scale: 1.0,
            safety_checker: false,
            nsfw: true,
            stream: true
        };

        console.log('Sending Lustify Payload:', JSON.stringify(payload, null, 2));

        console.log('Sending Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(GRAYDIENT_URL, payload, {
            headers: {
                'Authorization': `Bearer ${GRAYDIENT_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        console.log('Stream Connected. Waiting...');

        // Return a promise that resolves when image is found or stream ends
        await new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                const str = chunk.toString();
                console.log('CHUNK:', str); // DEBUG: Print everything
                buffer += str;
                const lines = str.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmed.replace('data: ', '').trim();
                            if (jsonStr === '[DONE]') return;
                            const data = JSON.parse(jsonStr);
                            console.log('PARSED EVENT:', Object.keys(data));

                            // DEBUG: Log content of rendering_done to find the URL
                            if (data.rendering_done) {
                                console.log('RENDERING_DONE CONTENT:', JSON.stringify(data.rendering_done, null, 2));
                            }

                            // Check for output_file at root or nested
                            const url = data.output_file || (data.rendering_done && data.rendering_done.output_file);
                            if (url) {
                                console.log('✅ SUCCESS! Final Image URL:', url);
                                resolve(url);
                            }
                        } catch (e) {
                            console.log('Parse Error:', e.message);
                        }
                    }
                });
            });

            response.data.on('end', () => {
                console.log('Stream ended.');
                resolve();
            });

            response.data.on('error', (err) => {
                console.error('Stream Error:', err);
                reject(err);
            });
        });

    } catch (error) {
        console.error('Graydient Failed:', error.response ? error.response.data : error.message);
    }
}

async function runTests() {
    await testDeepSeekRefinement();
    await testGraydientGeneration();
}

runTests();

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
        // EXACT PAYLOAD STRUCTURE FOR V3
        const payload = {
            prompt: "1girl, thick thighs, (fully nude:1.4), detailed anatomy, masterpiece, best quality, <realvis5-xl>",
            negative_prompt: "(worst quality:1.4), (bad anatomy:1.4), zombie, watermark, text",
            model: "realvis5-xl",
            width: 512,
            height: 512,
            safety_checker: false, // HARDCODED UNRESTRICTED
            nsfw: true,           // HARDCODED UNRESTRICTED
            stream: true          // REQUIRED FOR V3
        };

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
                            console.log('PARSED EVENT:', Object.keys(data)); // DEBUG

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

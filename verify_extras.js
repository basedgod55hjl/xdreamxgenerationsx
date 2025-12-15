const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const GRAYDIENT_KEY = process.env.GRAYDIENT_API_KEY || process.env.GRAYDIENT_TOKEN || '0Cqo0fZp1ViEI1oFnLLWRDzDcndzycvo8lfyxrLmiWzfgnXO';
const BASE_URL = 'https://cxy5wpx250x.graydient.ai/api/v3';

// Mock base64 image (small red dot)
const TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testVision() {
    console.log('\n--- Testing Vision / Describe ---');
    // Try likely endpoints based on "PirateDiffusion" commands (/describe)
    const endpoints = [
        '/describe',
        '/interrogate',
        '/scan',
        '/vision'
    ];

    for (const ep of endpoints) {
        try {
            console.log(`Trying POST ${BASE_URL}${ep}...`);
            const response = await axios.post(`${BASE_URL}${ep}`, {
                image: TEST_IMAGE,
                model: "florence" // Mentioned in search
            }, {
                headers: {
                    'Authorization': `Bearer ${GRAYDIENT_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ SUCCESS ${ep}:`, response.data);
            return;
        } catch (e) {
            console.log(`❌ Failed ${ep}: ${e.response ? e.response.status : e.message}`);
        }
    }
}

async function testFaceSwap() {
    console.log('\n--- Testing Face Swap ---');
    // Search suggested /render might handle it, or dedicated endpoint.
    // Previous code used /v1/faceswap (404).
    // Let's try /api/v3/render with 'face_swap' params or similar.
    // Also try /faceswap if it exists on v3.

    const endpoints = [
        '/faceswap',
        '/v3/faceswap',
        '/swap',
        '/render' // Try render with specific args
    ];

    for (const ep of endpoints) {
        try {
            // If render, we need normal payload + input images
            let payload = {};
            let url = ep === '/render' ? `${BASE_URL}/render` : `https://cxy5wpx250x.graydient.ai${ep}`; // absolute for root ones

            if (ep === '/render') {
                payload = {
                    prompt: "face swap",
                    input_image: TEST_IMAGE, // Source
                    target_image: TEST_IMAGE, // Target (usually face swap needs 2)
                    controlnet: "face_swap",
                    stream: false // Sync for test
                };
            } else {
                payload = {
                    source_image: TEST_IMAGE,
                    target_image: TEST_IMAGE
                };
            }

            console.log(`Trying POST ${url}...`);
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${GRAYDIENT_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ SUCCESS ${ep}:`, response.data);
        } catch (e) {
            console.log(`❌ Failed ${ep}: ${e.response ? e.response.status : e.message}`);
        }
    }
}

async function run() {
    await testVision();
    await testFaceSwap();
}

run();

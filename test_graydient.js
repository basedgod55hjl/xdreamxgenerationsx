const axios = require('axios');

const API_KEY = '0Cqo0fZp1ViEI1oFnLLWRDzDcndzycvo8lfyxrLmiWzfgnXO';
const BASE_URL = 'https://cxy5wpx250x.graydient.ai';

const endpoints = [
    '/v1/interrogate',
    '/api/v3/interrogate',
    '/api/v3/describe',
    '/api/v3/scan',
    '/api/v3/vision',
    '/sdapi/v1/interrogate'
];

async function testInterrogate() {
    console.log('Testing /api/v3/render with task: interrogate...');
    const url = `${BASE_URL}/api/v3/render`;
    try {
        const payload = {
            task: "interrogate",
            image: "base64_placeholder_would_go_here", // Just testing if endpoint accepts the 'task'
            model: "clip"
        };
        const response = await axios.post(url, payload, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
        });
        console.log(`[SUCCESS] Interrogate - Status: ${response.status}`);
    } catch (error) {
        // 400 likely means valid endpoint but bad payload, 404 means invalid endpoint/task
        const status = error.response ? error.response.status : error.message;
        console.log(`[FAILED] Interrogate - ${status}`);
        if (error.response && error.response.data) {
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

(async () => {
    await testInterrogate();
})();
```

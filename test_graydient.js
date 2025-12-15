const axios = require('axios');

const API_KEY = '0Cqo0fZp1ViEI1oFnLLWRDzDcndzycvo8lfyxrLmiWzfgnXO';
const URL = 'https://cxy5wpx250x.graydient.ai/api/v3/render';

async function testV3() {
    console.log('Testing /api/v3/render...');
    try {
        const payload = {
            prompt: "cyberpunk city",
            width: 512,
            height: 512,
            stream: true,
            nsfw: true,
            safety_checker: false
        };

        const response = await axios.post(URL, payload, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('SUCCESS:', response.data);
    } catch (error) {
        console.log('FAILED:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

(async () => {
    await testV3();
})();

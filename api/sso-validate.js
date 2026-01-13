// Vercel Serverless Function: SSO Ticket Validation
// This proxies the request to Chula SSO to validate tickets

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { ticket } = req.query;

        if (!ticket) {
            return res.status(400).json({
                type: 'error',
                content: 'Missing ticket parameter'
            });
        }

        // Get credentials from environment variables
        const appId = process.env.CHULA_SSO_APP_ID;
        const appSecret = process.env.CHULA_SSO_APP_SECRET;
        const ssoBaseUrl = process.env.CHULA_SSO_BASE_URL || 'https://account.it.chula.ac.th';

        if (!appId || !appSecret) {
            console.error('Missing SSO credentials in environment variables');
            return res.status(500).json({
                type: 'error',
                content: 'SSO configuration error'
            });
        }

        // Call Chula SSO serviceValidation API
        const validationUrl = `${ssoBaseUrl}/serviceValidation`;

        const response = await fetch(validationUrl, {
            method: 'GET',
            headers: {
                'DeeAppId': appId,
                'DeeAppSecret': appSecret,
                'DeeTicket': ticket
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Success - return user info
            return res.status(200).json(data);
        } else {
            // Failed validation
            return res.status(401).json(data);
        }

    } catch (error) {
        console.error('SSO Validation Error:', error);
        return res.status(500).json({
            type: 'error',
            content: 'Internal server error during SSO validation'
        });
    }
}

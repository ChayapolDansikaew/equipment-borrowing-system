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

        console.log('SSO Config:', { appId: appId ? 'SET' : 'MISSING', appSecret: appSecret ? 'SET' : 'MISSING', ssoBaseUrl });

        if (!appId || !appSecret) {
            console.error('Missing SSO credentials in environment variables');
            return res.status(500).json({
                type: 'error',
                content: 'SSO configuration error - missing credentials'
            });
        }

        // Call Chula SSO serviceValidation API
        // Pass ticket as BOTH query param and header (as per docs)
        const validationUrl = `${ssoBaseUrl}/serviceValidation?ticket=${encodeURIComponent(ticket)}`;
        console.log('Calling SSO validation URL:', validationUrl);

        const response = await fetch(validationUrl, {
            method: 'GET',
            headers: {
                'DeeAppId': appId,
                'DeeAppSecret': appSecret,
                'DeeTicket': ticket
            }
        });

        console.log('SSO Response Status:', response.status);

        // Get response as text first to handle non-JSON responses
        const responseText = await response.text();
        console.log('SSO Response Body:', responseText.substring(0, 500));

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse SSO response as JSON:', parseError);
            console.error('Raw response:', responseText);
            return res.status(500).json({
                type: 'error',
                content: 'Invalid response from SSO server',
                debug: responseText.substring(0, 300)
            });
        }

        if (response.ok) {
            // Success - return user info
            return res.status(200).json(data);
        } else {
            // Failed validation
            return res.status(401).json(data);
        }

    } catch (error) {
        console.error('SSO Validation Error:', error.message, error.stack);
        return res.status(500).json({
            type: 'error',
            content: 'Internal server error during SSO validation',
            debug: error.message
        });
    }
}


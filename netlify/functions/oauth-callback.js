import axios from 'axios';

// App credentials and configuration
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

export const handler = async function(event, context) {
  const { code, shop, state } = event.queryStringParameters || {};
  
  // Log all received parameters for debugging
  console.log('=== OAuth Callback Debug Info ===');
  console.log('Received parameters:', {
    code: code ? `${code.substring(0, 10)}...` : 'missing',
    shop,
    state,
    allParams: event.queryStringParameters
  });
  
  // Validate required parameters
  if (!code || !shop) {
    console.error('Missing required parameters:', { 
      hasCode: !!code, 
      hasShop: !!shop,
      codeLength: code ? code.length : 0
    });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' })
    };
  }

  // Log environment variables (without exposing secrets)
  console.log('Environment check:', {
    hasApiKey: !!SHOPIFY_API_KEY,
    hasApiSecret: !!SHOPIFY_API_SECRET,
    apiKeyValue: SHOPIFY_API_KEY || 'undefined',
    apiKeyLength: SHOPIFY_API_KEY ? SHOPIFY_API_KEY.length : 0,
    apiSecretLength: SHOPIFY_API_SECRET ? SHOPIFY_API_SECRET.length : 0
  });

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    console.error('Missing environment variables!');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error - missing credentials' })
    };
  }

  try {
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const requestData = {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    };
    
    console.log('Making token request to:', tokenUrl);
    console.log('Request payload:', {
      client_id: SHOPIFY_API_KEY,
      client_secret: '[REDACTED]',
      code: `${code.substring(0, 10)}...`,
      codeLength: code.length
    });
    
    // Exchange the code for an access token
    const tokenResponse = await axios.post(tokenUrl, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', tokenResponse.headers);
    
    const { access_token } = tokenResponse.data;
    
    if (!access_token) {
      console.error('No access token in response:', tokenResponse.data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No access token received from Shopify' })
      };
    }
    
    // Log the token in an easy-to-find format
    console.log('\n' + '='.repeat(80));
    console.log('🎉 SUCCESS! COPY THIS ACCESS TOKEN TO YOUR NETLIFY ENVIRONMENT VARIABLES');
    console.log(`ACCESS TOKEN: ${access_token}`);
    console.log(`SHOP: ${shop}`);
    console.log('Add this to Netlify environment variables as: SHOPIFY_ACCESS_TOKEN');
    console.log('='.repeat(80) + '\n');
    
    // Return success page instead of redirect
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: `
        <html>
          <head>
            <title>OAuth Success</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; }
              .token { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; font-family: monospace; word-break: break-all; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ OAuth Authentication Successful!</h1>
              <p><strong>Shop:</strong> ${shop}</p>
              <p><strong>Access Token:</strong></p>
              <div class="token">${access_token}</div>
              <br>
              <p><strong>Next Step:</strong> Copy the access token above and add it to your Netlify environment variables as <code>SHOPIFY_ACCESS_TOKEN</code></p>
            </div>
            <script>
              // Auto-redirect after 30 seconds
              setTimeout(() => {
                window.top.location.href = "https://${shop}/admin/apps";
              }, 30000);
            </script>
          </body>
        </html>
      `
    };
  } catch (error) {
    // Enhanced error logging
    console.error('=== OAuth Error Details ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
      console.error('Response status text:', error.response.statusText);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request made but no response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    if (error.config) {
      console.error('Request config:', {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data
      });
    }
    
    console.error('=== End Error Details ===');
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html'
      },
      body: `
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ OAuth Error</h1>
              <p><strong>Error:</strong> ${error.message}</p>
              <p><strong>Status:</strong> ${error.response?.status || 'Unknown'}</p>
              <p><strong>Details:</strong> ${JSON.stringify(error.response?.data || 'No details')}</p>
              <p>Check the Netlify function logs for more detailed information.</p>
            </div>
          </body>
        </html>
      `
    };
  }
};
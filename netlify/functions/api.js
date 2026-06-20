// netlify/functions/api.js

let dataStore = {
  products: [],
  orders: [],
  subscribers: [],
  settings: {}
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const url = new URL(event.rawUrl);
  const action = url.searchParams.get('action') || '';

  switch (action) {
    case 'get':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(dataStore)
      };

    case 'save':
      try {
        const data = JSON.parse(event.body);
        dataStore = data;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }

    case 'ping':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          message: 'Bagistrate API is running on Netlify',
          timestamp: new Date().toISOString()
        })
      };

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
  }
};
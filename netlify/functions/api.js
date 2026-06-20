// netlify/functions/api.js

// Data storage (in-memory - resets on deploy)
let dataStore = {
  products: [],
  orders: [],
  subscribers: [],
  settings: {}
};

const defaultData = {
  products: [],
  orders: [],
  subscribers: [],
  settings: {}
};

function getData() {
  return dataStore;
}

function saveData(data) {
  dataStore = data;
  return true;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const url = new URL(event.rawUrl);
  const action = url.searchParams.get('action') || '';

  switch (action) {
    case 'get':
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(getData())
      };

    case 'save':
      try {
        const data = JSON.parse(event.body);
        if (saveData(data)) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Data saved successfully'
            })
          };
        } else {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Could not save data'
            })
          };
        }
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON data'
          })
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

    case 'reset':
      if (saveData(defaultData)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Data reset successfully'
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Could not reset data'
          })
        };
      }

    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid action. Use ?action=get, ?action=save, ?action=ping, or ?action=reset'
        })
      };
  }
};
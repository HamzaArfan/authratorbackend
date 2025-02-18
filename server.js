const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const errorMessages = {
  400: 'Bad Request: Invalid request format or parameters.',
  401: 'Unauthorized: Invalid JWT/credentials or missing authentication token.',
  404: 'Not Found: The requested resource could not be found.',
  408: 'Request Timeout: Response sent on an idle connection by some servers.',
  500: 'Internal Server Error: An unexpected error occurred on the server.',
  503: 'Service Unavailable: The server is not ready to handle the request.',
};

app.post('/api/proxy', async (req, res) => {
  try {
    const { method, url, headers, body, bodyType, settings } = req.body;
    

    if (!url) {
      return res.status(400).json({
        error: errorMessages[400],
        status: 400,
        details: 'URL is required'
      });
    }
    
        const timeout = settings?.timeout || 30000; 
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const requestHeaders = new Headers();
    if (headers && headers.length > 0) {
      headers.forEach(header => {
        if (header.key && header.value) {
          requestHeaders.append(header.key, header.value);
        }
      });
    }

    let requestBody = null;
    if (bodyType === 'raw') {
      requestBody = body.content;
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }
    } else if (bodyType === 'formData') {
      const formData = new FormData();
      body.formData.forEach(item => {
        if (item.key && item.value) {
          formData.append(item.key, item.value);
        }
      });
      requestBody = formData;
    } else if (bodyType === 'urlencoded') {
      const params = new URLSearchParams();
      body.urlencoded.forEach(item => {
        if (item.key && item.value) {
          params.append(item.key, item.value);
        }
      });
      requestBody = params;
      requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? null : requestBody,
      signal: controller.signal,
      ...(settings?.followRedirects === false && { redirect: 'manual' }),
      ...(settings?.sslVerification === false && { insecure: true })
    });

    clearTimeout(timeoutId);
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      const errorResponse = {
        status: response.status,
        statusText: response.statusText,
        error: errorMessages[response.status] || `HTTP Error ${response.status}: ${response.statusText}`,
        headers: responseHeaders,
      };

      try {
        const errorBody = await response.json();
        errorResponse.details = errorBody;
      } catch {
        try {
          errorResponse.details = await response.text();
        } catch {
          errorResponse.details = 'No error details available';
        }
      }

      return res.status(response.status).json(errorResponse);
    }

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    res.status(response.status).json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData
    });

  } catch (error) {
    let errorStatus = 500;
    let errorMessage = errorMessages[500];

    if (error.name === 'AbortError') {
      errorStatus = 408;
      errorMessage = errorMessages[408];
    }

    console.error('Proxy Error:', error);
    res.status(errorStatus).json({
      error: errorMessage,
      status: errorStatus,
      details: error.message
    });
  }
});

app.post('/api/collections', (req, res) => {
  res.json({ success: true });
});
app.get('/api/collections', (req, res) => {
  res.json([]);
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
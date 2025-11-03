// server.js - Demonstrating express-session and timing-safe CSRF with Response Header

const { NeoAPI } = require('neoapi'); // Assuming 'neoapi' installed/linked
const path = require('path');
const session = require('express-session'); // Standard express-session
const bodyParser = require('body-parser'); // For parsing form bodies

// --- IMPORTANT: package.json version (Get App Version) ---
let appVersion = 'unknown';
try {
    // Assumes package.json is in the same directory or parent
    const pkg = require("../package.json");
    appVersion = pkg.version;
} catch (e) {
    console.warn('Could not read version from package.json');
}

const CsrfPlugin = require('../plugins/@neoapi-csrf');
// If developing locally:
// const CsrfPlugin = require('./neoapi-csrf'); // Adjust path if needed

// --- NeoAPI App Setup ---
const app = new NeoAPI({ verbose: false }); // Enable verbose logging
const PORT = process.env.PORT || 7860; // Use environment variable or default

// --- Register Plugins & Middleware ---
// ORDER MATTERS HERE! Session -> Body Parsers -> CSRF

// 1. CORS (Must allow credentials if session cookie needs cross-origin access)
app.plug(NeoAPI.cors, {
    origin: true, // Be more specific in production (e.g., 'https://yourfrontend.com')
    credentials: true // Allow cookies to be sent/received
});

// 2. Session Middleware (CRITICAL Prerequisite for CSRF)
// Using express-session via NeoAPI's compatibility layer
app.attach(session({
    secret: process.env.SESSION_SECRET || (() => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SESSION_SECRET environment variable must be set in production!');
        }
        console.warn('⚠️  Using fallback session secret. Set SESSION_SECRET env var for production!');
        return 'dev-secret-key-change-in-production';
    })(),
    resave: false, // Don't save session if unmodified
    saveUninitialized: true, // Save new sessions (needed for CSRF secret generation)
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies only on HTTPS
        httpOnly: true, // Prevent client-side JS access to session cookie
        sameSite: 'lax', // Good default protection against CSRF attacks via linking
        maxAge: 1000 * 60 * 60 * 2 // Example: 2 hour session lifetime
    }
}));

// 3. Body Parsers (Needed to extract _csrf from form/JSON body)
// Parse application/x-www-form-urlencoded (standard forms)
app.attach(bodyParser.urlencoded({ extended: false }));
// Parse application/json (if you submit CSRF via JSON)
app.plug(NeoAPI.jsonParser);

// 4. CSRF Protection Plugin
// Uses default options, including setting 'X-CSRF-Token' response header
app.plug(CsrfPlugin, {
    // Example: Override default header name if needed
    // responseHeader: 'X-XSRF-TOKEN'
});


// --- Example Routes ---

app.get('/api/info', (req, res) => {
    // GET is ignored by CSRF by default, session is still available
    res.json({
        framework: 'NeoAPI',
        version: appVersion,
        sessionId: req.sessionID // Example: Show session ID
    });
});

// Route to provide a form and demonstrate token availability
app.get('/form', (req, res) => {
    // req.csrfToken() gets the token associated with the current session
    const token = req.csrfToken();
    // The token is *also* automatically added to the response header (X-CSRF-Token) by the plugin
    console.log(`Rendering form. Session ID: ${req.sessionID}, CSRF Token: ${token}`);

    res.type('html').send(`
        <!DOCTYPE html>
        <html>
        <head><title>CSRF Test</title></head>
        <body>
            <h1>CSRF Test Form (Timing-Safe + Header)</h1>
            <p>Check Network tab: Response headers should contain '${req.app.plugins.get('Csrf')?.options?.responseHeader || 'X-CSRF-Token'}'.</p>
            <form action="/submit" method="post">
                <!-- Embed token in hidden field -->
                <input type="hidden" name="_csrf" value="${token}">
                <label for="data">Data:</label>
                <input type="text" id="data" name="someData" value="Important Data">
                <br><br>
                <button type="submit">Submit Form (POST)</button>
            </form>
            <hr>
            <h3>Test AJAX (Fetch)</h3>
            <button onclick="sendJsonRequest()">Send JSON POST (Needs Header)</button>
            <pre id="result"></pre>

            <script>
                // Example: Client-side JS reading token from header and using it
                let currentCsrfToken = ''; // Store token globally for simplicity

                // Function to fetch initial token (e.g., on page load or first API call)
                function getInitialTokenAndData() {
                    fetch('/api/info') // A GET request to get initial data and the header
                        .then(response => {
                            currentCsrfToken = response.headers.get('${req.app.plugins.get('Csrf')?.options?.responseHeader || 'X-CSRF-Token'}');
                            console.log('Received CSRF Token:', currentCsrfToken);
                            document.getElementById('result').textContent = 'Token received from /api/info header: ' + currentCsrfToken;
                            return response.json();
                        })
                        .then(data => console.log('Initial data:', data))
                        .catch(err => console.error('Error fetching initial token:', err));
                }

                function sendJsonRequest() {
                    if (!currentCsrfToken) {
                        alert('CSRF Token not available yet. Please load the page first or fetch initial data.');
                        return;
                    }
                    document.getElementById('result').textContent = 'Sending JSON POST request...';
                    fetch('/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // Include the token in the expected header
                            '${req.app.plugins.get('Csrf')?.options?.responseHeader || 'X-CSRF-Token'}': currentCsrfToken
                        },
                        body: JSON.stringify({ someData: "Data from fetch", anotherField: 123 })
                    })
                    .then(response => response.json().then(data => ({ status: response.status, body: data })))
                    .then(result => {
                         document.getElementById('result').textContent = 'Response:\\nStatus: ' + result.status + '\\nBody: ' + JSON.stringify(result.body, null, 2);
                         console.log('Fetch Response:', result);
                         // Refresh token if server sends a new one? Usually not needed unless session rotates often.
                         // const newToken = result.headers?.get('${req.app.plugins.get('Csrf')?.options?.responseHeader || 'X-CSRF-Token'}');
                         // if (newToken) currentCsrfToken = newToken;
                     })
                    .catch(err => {
                         document.getElementById('result').textContent = 'Fetch Error: ' + err;
                         console.error('Fetch Error:', err)
                    });
                }

                // Get token when page loads
                getInitialTokenAndData();
            </script>
        </body>
        </html>
    `);
});

// Route protected by CSRF middleware
app.post('/submit', (req, res) => {
    // If code execution reaches here, CSRF validation passed
    console.log('CSRF validation successful for POST /submit');
    console.log('Session ID during submit:', req.sessionID);
    console.log('Received body:', req.body);
    res.json({
        message: 'CSRF check passed! Data submitted.',
        receivedData: req.body
    });
});


// --- Error Handler ---
// Handles errors passed via next(err)
app.error((err, req, res) => {
    console.error("❗️ ERROR Handler Caught:", err.code || 'NO_CODE', '-', err.message);
    // Log stack in development for easier debugging
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    const statusCode = err.statusCode || 500;
    // Ensure response isn't already sent
    if (!res.writableEnded && !res.headersSent && !res._neo_finished) {
        // Specific handling for CSRF error code
        if (err.code === 'EBADCSRFTOKEN') {
             res.status(403).json({ error: 'Invalid or missing CSRF token.', code: err.code });
        } else {
             res.status(statusCode).json({ error: err.message || 'Internal Server Error', code: err.code });
        }
    }
});

// --- Launch Server ---
app.launch(PORT);
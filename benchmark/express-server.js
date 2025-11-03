// express_server.js
// Minimal Express server with CORS and JSON parsing for benchmarking

const express = require('express');
const cors = require('cors'); // Standard CORS middleware for Express

// Create Express app instance
const app = express();

// Define Port
const PORT = process.env.PORT || 3001; // Use a different port than NeoAPI

// --- Middleware ---

// 1. Enable CORS
// Use default options (allow all origins) for simple benchmark setup
app.use(cors());
// Or configure specific options:
// app.use(cors({ origin: 'http://your-client.com' }));

// 2. Enable Express's built-in JSON Body Parser
// Limit can be adjusted if needed for specific benchmarks
app.use(express.json({ limit: '1kb' }));

// --- SINGLE Benchmark Route ---
// Matching the NeoAPI benchmark setup

app.get('/', (req, res) => {
    // Minimal work: set header and send small JSON
    // Express sets Content-Type automatically for res.json
    res.setHeader('Content-Type', 'application/json'); // Still good practice sometimes
    res.end('{"message":"pong"}'); // Use res.end for minimal overhead like NeoAPI example
    // OR: res.json({ message: 'pong' }); // More idiomatic Express, slightly more overhead
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Express benchmark server listening on port ${PORT}...`);
});
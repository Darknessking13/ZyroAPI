# Getting Started with NeoAPI

This guide will walk you through installing NeoAPI and creating your first simple application.

## Installation

First, ensure you have Node.js (version 14 or higher recommended) and npm installed.

Create a new project directory and initialize npm:

```bash
mkdir my-neoapi-app
cd my-neoapi-app
npm init -y
```

Install NeoAPI and its required peer dependencies:

```bash
npm install neoapi 
```

## Your First App

Create a file named `server.js` (or your preferred entry point name) in your project root:

```javascript
// server.js
const { NeoAPI } = require('neoapi'); 

const app = new NeoAPI();
const PORT = process.env.PORT || 3000;

// Define a route for the root path '/'
app.get('/', (req, res) => {
  // Use the res.json() helper to send a JSON response
  res.json({ message: 'Hello from NeoAPI!' });
});

// Define another simple route
app.get('/about', (req, res) => {
    res.type('text/plain'); // Set content type
    res.send('This is the About page.');
});

// Start the server and listen on the specified port
app.launch(PORT, () => {
  console.log(`🚀 Server successfully started on port ${PORT}`);
  console.log(`   Visit http://localhost:${PORT}`);
});
```

## Running the App

Execute the file using Node.js:

```bash
node server.js
```

You should see the confirmation message in your console. You can now access the routes in your browser or using a tool like `curl`:

*   `http://localhost:3000/` -> Returns `{"message":"Hello from NeoAPI!"}`
*   `http://localhost:3000/about` -> Returns `This is the About page.`

Congratulations! You've created and run your first NeoAPI application.

## Next Steps

*   Explore how to define more complex routes in the [Routing Guide](./routing.md).
*   Learn about adding functionality with [Middleware](./middleware.md) and [Plugins](./plugins.md).
*   Understand how to handle errors gracefully in the [Error Handling Guide](./error-handling.md).
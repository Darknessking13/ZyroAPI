# Server Control

NeoAPI provides a simple method to create and start the underlying Node.js HTTP server.

## `app.launch(port, [callback])`

This is the primary method to start your NeoAPI application, making it listen for incoming HTTP requests.

**Arguments:**

1.  `port` (Number): The network port number the server should listen on (e.g., `3000`, `8080`).
2.  `callback` (Function, Optional): A function to be executed once the server has successfully started listening. It receives no arguments.

**Returns:**

*   `http.Server`: The underlying Node.js `http.Server` instance. You generally don't need to interact with this directly unless you have advanced use cases (like integrating WebSocket servers).

**Example:**

```javascript
const { NeoAPI } = require('neoapi');
const app = new NeoAPI();
const PORT = 3000;

// Basic usage
app.launch(PORT); // Logs a default message

// Usage with a callback
app.launch(PORT, () => {
  console.log('------------------------------------');
  console.log(` NeoAPI App is Live! `);
  console.log(` Listening on: http://localhost:${PORT} `);
  console.log('------------------------------------');
});

// Using environment variables for port
const envPort = process.env.PORT || 8000;
app.launch(envPort, () => {
  console.log(`Server listening on dynamic port ${envPort}`);
});
```

**Error Handling:**

If the server fails to start (e.g., the port is already in use), `app.launch` will log an error message to the console and exit the process by default. You can catch `EADDRINUSE` errors if needed by listening to the 'error' event on the returned server instance *before* calling listen internally, though `app.launch` simplifies this common case.
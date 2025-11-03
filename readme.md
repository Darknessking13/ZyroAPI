# ✨ NeoAPI ✨

[![NPM Version](https://img.shields.io/npm/v/neoapi?style=flat-square)](https://www.npmjs.com/package/neoapi) <!-- Replace 'neoapi' if you publish -->
[![Build Status](https://img.shields.io/travis/com/your-username/neoapi?style=flat-square)](https://travis-ci.com/your-username/neoapi) <!-- Replace with your CI link -->
[![License](https://img.shields.io/npm/l/neoapi?style=flat-square)](LICENSE) <!-- Ensure you have a LICENSE file -->

**A modern, minimalist, and fast Node.js framework for building efficient REST APIs, built with parallel request handling concepts in mind (leveraging Node.js's async nature).**

NeoAPI focuses on developer experience, providing expressive routing, pluggable middleware, and helpful response utilities without unnecessary bloat. It uses the high-performance [`find-my-way`](https://github.com/delvedor/find-my-way) router under the hood.

---

## 🚀 Features

*   **⚡ Blazing Fast Routing:** Powered by `find-my-way` for high-performance route matching, including parameters and wildcards.
*   **📡 Expressive API:** Simple and intuitive methods for defining routes (`app.get`, `app.post`, etc.).
*   **🧩 Pluggable Architecture:** Easily extend functionality with middleware (`app.attach`) and plugins (`app.plug`). Includes built-in plugins for common tasks (JSON parsing, CORS).
*   **⚙️ Middleware Support:** Add global middleware to process requests before they hit your route handlers.
*   **🔄 Rich Response Utilities:** Convenient helpers on the `res` object (`res.json`, `res.status`, `res.send`, `res.sendFile`, `res.redirect`, etc.).
*   **🧵 Route Grouping:** Organize related routes under common path prefixes using `app.group`.
*   **⚡ Parallel Handlers:** Run multiple async data-fetching functions concurrently for a single route using `app.parallel`.
*   **🧼 Centralized Error Handling:** Define a custom error handler with `app.error` for consistent error responses.
*   ** minimalist Core:** Focuses on essential API features, keeping the core lightweight.

---

## 📦 Installation

```bash
npm install neoapi
# or
yarn add neoapi 
```

---

## ⏱️ Quick Start

```javascript
// server.js
const { NeoAPI } = require('neoapi'); // Adjust path if needed

const app = new NeoAPI();
const PORT = 3000;

// Optional: Enable built-in JSON body parser plugin
app.plug(NeoAPI.jsonParser());

// Define a simple GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to NeoAPI!' });
});

// Route with parameters
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ user_id: userId, message: `Profile for user ${userId}` });
});

// Start the server
app.launch(PORT, () => {
  console.log(`✨ NeoAPI server running at http://localhost:${PORT}`);
});
```

Run the server: `node server.js`

Test it:
*   `curl http://localhost:3000/`
*   `curl http://localhost:3000/users/123`

---

## 📚 Documentation

For more detailed information, explore the documentation sections:

*   [**Getting Started**](./docs/getting-started.md)
*   [**Server Control** (`app.launch`)](./docs/server.md)
*   [**Routing** (`app.get`, `app.post`, params, query)](./docs/routing.md)
*   [**Middleware** (`app.attach`)](./docs/middleware.md)
*   [**Plugins** (`app.plug`, built-ins)](./docs/plugins.md)
*   [**Error Handling** (`app.error`)](./docs/error-handling.md)
*   [**Advanced Routing** (`app.group`, `app.parallel`)](./docs/advanced-routing.md)
*   [**Response Utilities** (`res` object)](./docs/response.md)
*   [**Optimizations**](./docs/optimizations.md) - Performance improvements and best practices

*(See the `docs/` directory for detailed guides).*

---

## ⚙️ Core API Overview

### Server Control

*   **`app.launch(port, callback?)`**: Starts the HTTP server on the specified port.
    ```js
    app.launch(3000, () => console.log('Server ready!'));
    ```

### Basic Routing

Define routes using HTTP verb methods:
`app.get(path, handler)`
`app.post(path, handler)`
`app.put(path, handler)`
`app.patch(path, handler)`
`app.delete(path, handler)`
`app.options(path, handler)`
`app.head(path, handler)`

*   **`path`**: Route path string (e.g., `/users`, `/posts/:id`, `/files/*`).
*   **`handler`**: Function `(req, res, next?)` to handle the request. Can be `async`.

```js
// Simple route
app.get('/ping', (req, res) => res.send('pong'));

// Route with parameters
app.get('/items/:itemId', (req, res) => {
  res.json({ item: req.params.itemId, query: req.query });
});
```
*(See [Routing Docs](./docs/routing.md) for more)*

### Middleware & Plugins

*   **`app.attach(middlewareFn)`**: Registers global middleware executed on every request before routing.
    ```js
    app.attach((req, res, next) => {
      req.requestTime = Date.now();
      console.log(`Request: ${req.method} ${req.url}`);
      next(); // Pass control to the next middleware or handler
    });
    ```
*   **`app.plug(pluginDefinition, options?)`**: Registers a plugin (often using built-in static methods).
    ```js
    // Enable CORS with specific options
    app.plug(NeoAPI.cors(), { origin: 'https://myfrontend.com' });

    // Enable JSON body parsing
    app.plug(NeoAPI.jsonParser(), { limit: '5mb' });
    ```
*(See [Middleware Docs](./docs/middleware.md) & [Plugins Docs](./docs/plugins.md))*

### Error Handling

*   **`app.error(handlerFn)`**: Registers a custom global error handler.
    ```js
    app.error((err, req, res) => {
      console.error("ERROR:", err.stack);
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        error: {
           message: err.message || 'Something went wrong!',
           code: err.code
        }
      });
    });
    ```
*(See [Error Handling Docs](./docs/error-handling.md))*

### Advanced Routing

*   **`app.group(prefix, callback)`**: Group routes under a common path prefix.
    ```js
    app.group('/api/v1', (v1) => {
      v1.get('/users', getAllUsers); // -> /api/v1/users
      v1.post('/users', createUser); // -> /api/v1/users
    });
    ```
*   **`app.parallel(handlerList)`**: Run multiple async handlers concurrently for a single route.
    ```js
    async function fetchProfile(req) { /* ... */ return { profile: {} }; }
    async function fetchPosts(req) { /* ... */ return { posts: [] }; }

    app.get('/user-dashboard', app.parallel([fetchProfile, fetchPosts]));
    // Response will be merged: { profile: {}, posts: [] }
    ```
*(See [Advanced Routing Docs](./docs/advanced-routing.md))*

### Response Utilities

The `res` object in your handlers is decorated with helpful methods:

*   `res.send(data)`: Sends various data types (string, buffer, object). Auto-detects Content-Type for objects (JSON).
*   `res.json(data)`: Specifically sends JSON response with correct headers.
*   `res.status(code)`: Sets the HTTP status code (chainable).
*   `res.type(mime)`: Sets the `Content-Type` header (e.g., `res.type('html')`).
*   `res.setHeader(key, value)`: Sets a response header.
*   `res.redirect(url, statusCode?)`: Sends a redirect response (default 302).
*   `res.sendFile(path)`: Streams a file as the response.
*   `res.attachment(filename?)`: Sets `Content-Disposition` to trigger download.
*   `res.sendStatus(code)`: Sends only a status code with an empty body.
*   `res.end(data?)`: Low-level method to end the response (less common).

*(See [Response Docs](./docs/response.md) for details)*

---

## ⚡ Performance & Benchmarking

NeoAPI is optimized for high performance with minimal overhead:

*   **Optimized Request ID Generation:** Base-36 encoding for compact, fast IDs
*   **Smart Buffer Handling:** Avoids redundant buffer operations
*   **Efficient Middleware Chain:** Pre-computed counts and optimized execution flow
*   **Lazy Logging:** Debug logs only built when verbose mode is enabled
*   **Response Guards:** Centralized checks to prevent double-sends

### Run Benchmarks

```bash
node benchmark/simple-route.js
```

See [Optimizations Documentation](./docs/optimizations.md) for detailed performance improvements.

---

## 🌱 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

*(Add contribution guidelines later)*

---

## 📄 License

[MIT](LICENSE) <!-- Make sure you add a LICENSE file (e.g., MIT) -->

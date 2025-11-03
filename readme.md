# ✨ ZyroAPI

[![NPM Version](https://img.shields.io/npm/v/zyroapi?style=flat-square)](https://www.npmjs.com/package/zyroapi)
[![License](https://img.shields.io/npm/l/zyroapi?style=flat-square)](LICENSE)

> **A modern, minimalist, and blazingly fast Node.js framework for building REST APIs**

ZyroAPI combines Express-like simplicity with modern features and impressive performance. Built with developer experience in mind, it offers clean routing, powerful plugins, and helpful utilities—without the bloat.

## 🚀 Performance

ZyroAPI delivers **production-ready performance** that rivals industry leaders:

| Framework | Req/sec | Latency (avg) | Memory | Relative Speed |
|-----------|---------|---------------|--------|----------------|
| **ZyroAPI** | **13,594** | **73ms** | **104 MB** | **Baseline** |
| Fastify | 17,264 | 57ms | 90 MB | +27% faster |
| Express | 4,114 | 235ms | 118 MB | **-70% slower** |

**Benchmark Details:**
- **System:** Intel Xeon @ 2.20GHz (2 cores), 7.76 GB RAM, Node v20.11.1
- **Test:** 40s duration, 100 connections, 10 pipelining factor
- **ZyroAPI is 3.3x faster than Express** with lower memory usage
- **ZyroAPI achieves 79% of Fastify's speed** while maintaining simpler APIs

*Benchmarks run on Linux 6.6.111+ using [autocannon](https://github.com/mcollina/autocannon)*

---

## ✨ Why ZyroAPI?

### 🎯 **Best of Both Worlds**
- **Express-like simplicity** - Familiar API, minimal learning curve
- **Modern performance** - 3.3x faster than Express, 79% of Fastify's speed
- **Developer-friendly** - Clean APIs, helpful utilities, great error messages

### 🚀 **Key Features**

#### Core Routing
- ⚡ **High-performance routing** powered by `find-my-way`
- 🛣️ **All HTTP methods** (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- 📍 **Route parameters** (`:id`) and **wildcards** (`*`)
- 🔍 **Query string parsing** built-in

#### Advanced Features
- 🧵 **Route grouping** - Organize routes with `app.group()`
- ⚡ **Parallel handlers** - Concurrent data fetching with `app.parallel()`
- 🔌 **Plugin system** - Extensible architecture
- 🎯 **Middleware support** - Global and route-level
- 🪝 **Hook system** - onRequest, preHandler, onResponse, onError

#### Built-in Plugins
- 📦 **JSON Parser** - Automatic request body parsing
- 🌐 **CORS** - Secure cross-origin resource sharing
- 🔒 **Secure defaults** - Production-ready out of the box

#### Developer Experience
- 🔄 **Rich response utilities** - `res.json()`, `res.send()`, `res.redirect()`, etc.
- 🧼 **Centralized error handling** - Consistent error responses
- 📝 **Request decorations** - `req.params`, `req.query`, `req.body`, `req.ip`, etc.
- 🎨 **Beautiful logging** - Colorful, informative console output
- 💪 **TypeScript support** - Full type definitions included (`index.d.ts`)

---

## 📦 Installation

```bash
npm install zyroapi
# or
yarn add zyroapi 
```

---

## ⏱️ Quick Start

```javascript
// server.js
const { ZyroAPI } = require('zyroapi');

const app = new ZyroAPI();
const PORT = 3000;

// Optional: Enable built-in JSON body parser plugin
app.plug(ZyroAPI.jsonParser);

// Define a simple GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ZyroAPI!' });
});

// Route with parameters
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ user_id: userId, message: `Profile for user ${userId}` });
});

// Start the server
app.launch(PORT, () => {
  console.log(`✨ ZyroAPI server running at http://localhost:${PORT}`);
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
    app.plug(ZyroAPI.cors, { origin: 'https://myfrontend.com' });

    // Enable JSON body parsing
    app.plug(ZyroAPI.jsonParser, { limit: '5mb' });
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

## ⚡ Performance & Optimizations

ZyroAPI is built for speed with carefully optimized internals:

### 🎯 Performance Optimizations
- **Prototype methods** - Zero per-request binding overhead
- **Lazy logger creation** - Loggers only created when accessed
- **Fast URL parsing** - String operations instead of URL constructor
- **Smart hook execution** - Skip empty hooks automatically
- **Optimized buffer handling** - Minimal memory allocations
- **Efficient middleware chain** - Pre-computed execution paths

### 📊 Real-World Performance
```
Test Configuration:
- Duration: 40 seconds
- Connections: 100
- Pipelining: 10x
- System: Intel Xeon @ 2.20GHz, 2 cores, 7.76 GB RAM

Results:
┌──────────┬────────────┬──────────┬─────────┬──────────┐
│ Framework│ Req/sec    │ Latency  │ Memory  │ vs Express│
├──────────┼────────────┼──────────┼─────────┼──────────┤
│ ZyroAPI  │ 13,594     │ 73ms     │ 104 MB  │ +230%    │
│ Fastify  │ 17,264     │ 57ms     │ 90 MB   │ +320%    │
│ Express  │ 4,114      │ 235ms    │ 118 MB  │ Baseline │
└──────────┴────────────┴──────────┴─────────┴──────────┘
```

**Key Takeaways:**
- ✅ **3.3x faster than Express** with better memory efficiency
- ✅ **79% of Fastify's performance** with simpler, more intuitive APIs
- ✅ **Production-ready** - Handles 13,000+ requests/second
- ✅ **Low latency** - 73ms average response time under load

**Run benchmarks yourself:**
```bash
npm run benchmark
```
---

## 🤝 Contributing

Contributions are welcome! Whether it's:
- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

Please feel free to open an issue or submit a pull request on [GitHub](https://github.com/Darknessking13/ZyroAPI).

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [find-my-way](https://github.com/delvedor/find-my-way) for high-performance routing
- Inspired by Express.js simplicity and Fastify performance
- Thanks to the Node.js community

---

## 📬 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/Darknessking13/ZyroAPI/issues)
- 💬 [Discussions](https://github.com/Darknessking13/ZyroAPI/discussions)

---

<div align="center">

**Made with ❤️ by [I._.become_a_devil](https://github.com/Darknessking13)**

⭐ Star us on [GitHub](https://github.com/Darknessking13/ZyroAPI) if you find ZyroAPI useful!

</div>

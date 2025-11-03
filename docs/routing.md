# Routing

Routing determines how NeoAPI responds to client requests based on the URL path and HTTP method. NeoAPI uses the fast `find-my-way` router.

## Basic Routing

Register route handlers using methods named after HTTP verbs on your `app` instance:

*   `app.get(path, handler)`
*   `app.post(path, handler)`
*   `app.put(path, handler)`
*   `app.patch(path, handler)`
*   `app.delete(path, handler)`
*   `app.options(path, handler)`
*   `app.head(path, handler)`

**Arguments:**

*   `path` (String): The URL path pattern to match.
*   `handler` (Function): The function to execute when the route matches. It receives `req` (request) and `res` (response) objects. It can optionally receive `next` for advanced middleware control within a handler. Handlers can be `async`.

**Example:**

```javascript
// GET request to /status
app.get('/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// POST request to /users
app.post('/users', async (req, res) => {
  // Assuming JSON body parser plugin is enabled
  const userData = req.body;
  // const newUser = await db.users.create(userData); // Simulate async DB operation
  console.log('Creating user:', userData);
  const newUser = { id: Date.now(), ...userData }; // Mock response
  res.status(201).json(newUser); // Send 201 Created status
});
```

## Route Parameters

Capture dynamic segments in the URL path using colons (`:`). These parameters are available on `req.params`.

```javascript
// Matches /products/123, /products/abc
app.get('/products/:productId', (req, res) => {
  const { productId } = req.params; // Access the captured value
  res.json({ requestedProductId: productId });
});

// Multiple parameters
// Matches /orders/2023/inv-005
app.get('/orders/:year/:invoiceId', (req, res) => {
  const { year, invoiceId } = req.params;
  res.json({ orderYear: year, id: invoiceId });
});
```

## Query Parameters

Access URL query parameters (e.g., `/search?q=neoapi&limit=10`) through the `req.query` object.

```javascript
// GET /search?q=frameworks&sort=name
app.get('/search', (req, res) => {
  const searchTerm = req.query.q || 'default'; // Access 'q' parameter
  const sortBy = req.query.sort;          // Access 'sort' parameter

  console.log(`Searching for: ${searchTerm}, Sort by: ${sortBy}`);
  res.json({
    query: searchTerm,
    sorting: sortBy,
    results: [/* ... search results ... */]
  });
});
```

## Wildcards

Use an asterisk (`*`) to match any sequence of characters in a path segment. The matched value is available on `req.params['*']`.

```javascript
// Matches /files/image.jpg, /files/docs/report.pdf, etc.
app.get('/files/*', (req, res) => {
  const filePath = req.params['*'];
  console.log(`Requesting file: ${filePath}`);
  // Logic to serve the file...
  // res.sendFile(`path/to/static/${filePath}`); // Example usage
  res.send(`Serving file: ${filePath}`);
});
```

## `find-my-way` Options

You can pass `find-my-way` router options during `NeoAPI` instantiation:

```javascript
const app = new NeoAPI({
  ignoreTrailingSlash: true, // Default: true
  // caseSensitive: false,   // Default: true (find-my-way default)
});
```

Refer to the [`find-my-way` documentation](https://github.com/delvedor/find-my-way#findmywayoptions) for all available options.
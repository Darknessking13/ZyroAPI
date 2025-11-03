# Middleware

Middleware functions are functions that execute *before* your route handlers. They have access to the request (`req`) and response (`res`) objects, and a `next` function to pass control to the next middleware in the stack.

Middleware is ideal for tasks common to multiple routes:

*   Logging requests
*   Parsing request bodies
*   Authenticating users
*   Setting common response headers (like CORS)
*   Rate limiting
*   Data validation

## Attaching Global Middleware

Use `app.attach(middlewareFn)` to register middleware that runs for **every** incoming request before the router attempts to match a route.

**Middleware Function Signature:** `(req, res, next) => void` or `async (req, res, next) => Promise<void>`

**Key Points:**

*   Middleware executes in the order it is attached.
*   **Crucially, call `next()`** to pass control to the next middleware or the route handler.
*   If you don't call `next()`, the request processing stops at that middleware (useful for ending requests early, e.g., for authentication failure).
*   You can modify the `req` or `res` objects within middleware.
*   Pass an error object to `next(err)` to trigger the global error handler immediately.

**Examples:**

```javascript
// 1. Simple Logger Middleware
app.attach((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Pass control
});

// 2. Adding a Custom Header
app.attach((req, res, next) => {
  res.setHeader('X-Powered-By', 'NeoAPI');
  next();
});

// 3. Simple Authentication Check (Example)
app.attach(async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    // Don't call next(), send response directly
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // const user = await verifyToken(token); // Simulate async check
    // if (!user) throw new Error('Invalid token');
    // req.user = user; // Attach user data to request for later handlers
    console.log('Auth middleware: Token found (mock validation)');
    req.user = { id: 'mock-user', roles: ['admin'] };
    next(); // Token valid, proceed
  } catch (authError) {
    // Send error response directly or pass to error handler
    // res.status(401).json({ error: 'Invalid token' });
    authError.statusCode = 401;
    next(authError); // Trigger global error handler
  }
});

// Your routes will execute after all attached middleware
app.get('/protected', (req, res) => {
    // req.user is available here if auth middleware succeeded
    res.json({ message: 'Welcome to the protected area!', user: req.user });
});
```

## Error Handling Middleware

NeoAPI uses a single global error handler registered via `app.error()`. While some frameworks have specific error middleware signatures, in NeoAPI, you trigger the global handler by calling `next(err)` from any regular middleware or route handler.

See the [Error Handling Guide](./error-handling.md) for details.
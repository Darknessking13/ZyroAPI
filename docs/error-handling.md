# Error Handling

Robust error handling is crucial for building reliable APIs. NeoAPI provides a centralized mechanism to catch and process errors that occur during request processing.

## The Error Flow

Errors can originate from several places:

1.  **Middleware:** A middleware function calls `next(err)`.
2.  **Route Handler:** A route handler throws an error (synchronously or by rejecting an async promise).
3.  **NeoAPI Internals:** An error occurs within NeoAPI itself (e.g., failed URL parsing, plugin error).
4.  **Not Found:** No route matches the incoming request (triggers a 404 error internally).
5.  **Plugin Errors:** A plugin (like the JSON parser) encounters an error (e.g., invalid JSON, payload too large) and calls `next(err)`.

When an error occurs and is passed to `next(err)` or thrown/rejected uncaught in a handler, NeoAPI stops the regular request flow and immediately invokes the **registered global error handler**.

## Registering an Error Handler

Use `app.error(handlerFn)` to register your custom error handling function. This replaces the default NeoAPI error handler.

**Handler Function Signature:** `(err, req, res) => void`

*   `err` (Error): The error object that was caught. It often has useful properties like `message`, `stack`, and sometimes `statusCode` or `code`.
*   `req` (Object): The request object.
*   `res` (Object): The response object. **Use this to send the error response to the client.**

**Important:** Your error handler is responsible for sending the final response to the client. If it doesn't, the client request might hang.

**Example:**

```javascript
app.error((err, req, res) => {
  // 1. Log the error (important for debugging)
  // Avoid logging expected 404s unless in verbose mode
  if (err.statusCode !== 404) {
    console.error(`[${new Date().toISOString()}] ERROR Path: ${req.url}`);
    console.error(err.stack || err.message);
  }

  // 2. Determine the status code
  // Use err.statusCode if provided (e.g., by plugins or custom errors),
  // otherwise default to 500 Internal Server Error.
  const statusCode = typeof err.statusCode === 'number' && err.statusCode >= 400
                     ? err.statusCode
                     : 500;

  // 3. Check if response already sent (important edge case)
  if (res.headersSent || res.writableEnded || res._neo_finished) {
     console.warn("Error handler called but response already sent/ended.");
     return;
  }

  // 4. Send the error response
  res.status(statusCode);
  res.json({ // Send JSON by default
    error: {
      message: err.message || 'An unexpected error occurred.',
      // Optionally include code or other details
      code: err.code,
      // Conditionally include stack trace in development environments
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    }
  });
});
```

## Default Error Handler

If you don't register a custom handler with `app.error()`, NeoAPI uses a default handler that:

*   Logs the error stack to the console (except for 404s).
*   Determines an appropriate status code (using `err.statusCode` or defaulting to 500).
*   Sends a JSON response like:
    ```json
    {
      "error": {
        "message": "Error message from err.message",
        "code": "OptionalErrorCode"
      }
    }
    ```
*   Does not include the stack trace in the response by default.

## Throwing Errors

You can trigger the error handler from your route handlers or middleware:

```javascript
// In a route handler
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    if (!user) {
      // Create an error with a status code
      const notFoundError = new Error('User not found');
      notFoundError.statusCode = 404;
      notFoundError.code = 'USER_NOT_FOUND';
      throw notFoundError; // Throwing triggers the error handler
    }
    res.json(user);
  } catch (dbError) {
    // Catch specific errors and pass them to the error handler via next()
    console.error("Database error fetching user:", dbError);
    dbError.statusCode = 503; // Service Unavailable
    next(dbError);
  }
});

// In middleware
app.attach((req, res, next) => {
    if (!req.headers['x-api-key']) {
        const authError = new Error('Missing API Key');
        authError.statusCode = 401;
        return next(authError); // Pass error to next()
    }
    next();
});
```

By convention, adding a `statusCode` property to your custom error objects allows the error handler (default or custom) to send the correct HTTP status.
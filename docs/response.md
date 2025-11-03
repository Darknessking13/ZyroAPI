# Response Utilities

NeoAPI enhances the standard Node.js `http.ServerResponse` object (passed as `res` to your handlers) with several convenient helper methods for sending responses to the client.

Using these helpers often makes your code cleaner and less prone to errors related to setting headers manually. Methods are chainable unless they explicitly end the response (like `send`, `json`, `sendStatus`, `redirect`, `sendFile`).

## Core Sending Methods (End the Response)

These methods are typically the last call for a given request handler as they finalize and send the response.

### `res.send(data)`

The most versatile sending method. It handles different data types automatically and **ends the response**.

*   **Object/Array:** Stringifies the data as JSON and sets `Content-Type: application/json; charset=utf-8` if not already set.
*   **String:** Sends the string directly. Sets `Content-Type: text/plain; charset=utf-8` if not already set.
*   **Buffer:** Sends the raw buffer data. Sets `Content-Type: application/octet-stream` if not already set.
*   **Number, Boolean:** Converts to string and sends as `text/plain`.
*   **`undefined`:** Sends an empty body with `text/plain`.

It automatically sets the `Content-Length` header based on the final body content.

```javascript
res.send({ message: 'Hello' }); // Sends JSON
res.type('html').send('<h1>Title</h1>'); // Sends HTML (use res.type first)
res.send(Buffer.from('raw data')); // Sends buffer
```

### `res.json(data)`

A shortcut specifically for sending JSON responses. It guarantees the `Content-Type` is set to `application/json; charset=utf-8` and **ends the response**. Essentially equivalent to `res.type('json').send(data)`.

```javascript
const user = { id: 1, name: 'Neo' };
res.json(user);

res.status(201).json({ created: true, id: 123 }); // Chain status before sending
```

### `res.sendStatus(statusCode)`

Sends only an HTTP status code with an empty response body and **ends the response**. Useful for responses like `204 No Content` or `401 Unauthorized` where no body is needed.

```javascript
res.sendStatus(204); // OK, No Content
res.sendStatus(403); // Forbidden
```

### `res.redirect(url, [statusCode])`

Sends a redirect response to the client, telling the browser to navigate to a different URL, and **ends the response**.

*   `url` (String): The URL to redirect to.
*   `statusCode` (Number, Optional): The HTTP redirect status code. Defaults to `302` (Found - Temporary Redirect). Use `301` for permanent redirects.

```javascript
// Temporary redirect
app.get('/old-profile', (req, res) => {
  res.redirect('/new-profile');
});

// Permanent redirect
app.get('/moved-page', (req, res) => {
  res.redirect('/permanent-location', 301);
});
```

### `res.sendFile(path)`

Streams a file from the local filesystem as the response body. It automatically sets the `Content-Type` based on the file extension, handles streaming, manages errors (like file not found), and **ends the response** (asynchronously when the stream finishes or errors).

*Note: Provide an absolute path or a path relative to your project's execution context.*

```javascript
// Serve an image
app.get('/logo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'images', 'logo.png'));
});

// Serve an HTML file
app.get('/docs', (req, res) => {
    res.sendFile('./static/index.html'); // Relative path example
});
```

### `res.end(data?)`

The low-level Node.js method to finish the response. You should generally prefer the higher-level NeoAPI helpers (`send`, `json`, etc.). Use `res.end()` only if you are manually piping streams or need very fine-grained control over the response finalization. NeoAPI's sending methods call `res.end()` internally.

## Setting Status & Headers (Chainable)

These methods modify the response state but do *not* end the response. They return the `res` object, allowing you to chain them with other helpers or a final sending method.

### `res.status(code)`

Sets the HTTP status code for the response. **Chainable**.

```javascript
res.status(404).json({ error: 'Resource not found' });
res.status(201).send('Resource Created');
res.status(202).setHeader('X-Job-ID', 'job-123').send(); // Chain multiple
```

### `res.setHeader(key, value)`

Sets a single HTTP response header. **Chainable**.

```javascript
res.setHeader('X-Request-ID', 'some-uuid');
res.setHeader('Cache-Control', 'no-cache').send({ data: 'live' }); // Chain before send
```

### `res.type(mime)`

Sets the `Content-Type` header based on a MIME type string or file extension (using the `mime-types` library). **Chainable**. Automatically adds `charset=utf-8` for common text-based types.

```javascript
res.type('html').send('<html>...</html>');         // -> Content-Type: text/html; charset=utf-8
res.type('json').send('{}');                   // -> Content-Type: application/json; charset=utf-8
res.type('application/pdf').send(pdfBuffer); // -> Content-Type: application/pdf
res.type('png').sendFile('logo.png');        // -> Content-Type: image/png (when used with sendFile)
```

### `res.clearHeader(name)`

Removes a previously set header. **Chainable**.

```javascript
res.setHeader('X-Powered-By', 'Old Server');
res.clearHeader('X-Powered-By'); // Remove it
res.send('Headers adjusted');
```

### `res.attachment(filename?)`

Sets the `Content-Disposition` header to `attachment`, suggesting the browser should download the file instead of displaying it inline. If `filename` is provided, it suggests that name for the downloaded file. **Chainable**. Often used in conjunction with `res.send()` or `res.sendFile()`.

```javascript
// Trigger download for a generated CSV
res.attachment('report.csv');
res.type('csv'); // Set correct content type
res.send(csvDataString); // Send the data after setting headers

// Trigger download for an existing file served via sendFile
app.get('/download/manual', (req, res) => {
    res.attachment('user_manual.pdf') // Suggest download name
       .sendFile('./files/manual_v1.pdf'); // Chain before sendFile
});
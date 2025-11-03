# Plugins

Plugins provide a structured way to extend NeoAPI's functionality, often by registering middleware, adding routes, or integrating other services. NeoAPI uses a class-based system for plugins, promoting organization and reusability.

## Using Plugins

Plugins are registered using the `app.plug()` method. You typically pass the **Plugin Class** itself (often obtained via static getters like `NeoAPI.jsonParser`) as the first argument and any configuration options as the second argument.

```javascript
const { NeoAPI } = require('neoapi'); // Assuming installed via npm
const app = new NeoAPI();

// Syntax: app.plug(PluginClass, options?)

// Example: Enable JSON body parsing with a 5MB limit
// Note: We pass the Class NeoAPI.jsonParser directly, NOT NeoAPI.jsonParser()
app.plug(NeoAPI.jsonParser, { limit: '5mb' });

// Example: Enable CORS, allowing requests only from a specific origin
app.plug(NeoAPI.cors, { origin: 'https://example.com' });

// Example: Using a custom plugin class
// const { MyCustomPlugin } = require('./plugins/my-custom-plugin');
// app.plug(MyCustomPlugin, { customOption: true });
```

NeoAPI handles instantiating the plugin class with the provided options and calling its `load` method.

## Built-in Plugins

NeoAPI includes some essential plugins accessible via static getters on the `NeoAPI` class. These getters return the respective **Plugin Class**.

### `NeoAPI.jsonParser`

Returns the `JsonParserPlugin` class. This plugin registers middleware to parse incoming request bodies with `Content-Type: application/json`. The parsed body (an object or array) will be available on `req.body`.

**Options (passed as the second argument to `app.plug`):**

*   `limit` (String): Maximum request body size. (Default: `'1mb'`). Examples: `'100kb'`, `'5mb'`.
*   `strict` (Boolean): If `true` (default), only accepts arrays and objects; otherwise, accepts any JSON value (like `null`, `"string"`, `123`).
*   `reviver` (Function): A reviver function passed directly to `JSON.parse`.

**Usage:**

```javascript
// Default options (1mb limit, strict)
app.plug(NeoAPI.jsonParser);

// Custom limit, non-strict
app.plug(NeoAPI.jsonParser, { limit: '200kb', strict: false });

// Use after registering the plugin
app.post('/data', (req, res) => {
  // req.body contains the parsed JSON object
  console.log('Received data:', req.body);
  res.json({ received: true, data: req.body });
});
```
If the body is invalid JSON or exceeds the size limit, an appropriate error (e.g., 400 Bad Request, 413 Payload Too Large) will be passed to the global error handler.

### `NeoAPI.cors`

Returns the `CorsPlugin` class. This plugin registers middleware to handle Cross-Origin Resource Sharing (CORS) headers, enabling requests from different origins (domains).

**Options (passed as the second argument to `app.plug`):**

*   `origin` (String | RegExp | Array<String|RegExp> | Function | Boolean): Configures `Access-Control-Allow-Origin`. See previous version or source for detailed behavior. (Default: `'*'`) **Warning: `'*'` is insecure for production.**
*   `methods` (String | Array<String>): Configures `Access-Control-Allow-Methods`. (Default: `'GET,HEAD,PUT,PATCH,POST,DELETE'`).
*   `allowedHeaders` (String | Array<String>): Configures `Access-Control-Allow-Headers`. (Default: Value of request's `Access-Control-Request-Headers`).
*   `exposedHeaders` (String | Array<String>): Configures `Access-Control-Expose-Headers`. (Default: `null`).
*   `credentials` (Boolean): Configures `Access-Control-Allow-Credentials`. (Default: `false`). Cannot be `true` if `origin` is `'*'`.
*   `maxAge` (Number): Configures `Access-Control-Max-Age` (seconds) for preflight caching. (Default: `null`).
*   `preflightContinue` (Boolean): Pass the preflight OPTIONS request to the next middleware/handler. (Default: `false`).

**Usage:**

```javascript
// Allow only specific frontend origin, allow credentials
app.plug(NeoAPI.cors, {
  origin: 'https://my-frontend-app.com',
  credentials: true,
});
```

## Creating Custom Plugins

Creating your own plugins allows you to encapsulate reusable logic like database connections, authentication strategies, or custom middleware.

**Steps:**

1.  **Import the Base Class:** You need the base `Plugin` class provided by NeoAPI.
    ```javascript
    // In your plugin file (e.g., lib/plugins/myCustomPlugin.js)
    const { Plugin } = require('neoapi/plugins'); // Assuming 'neoapi' is your package name or correct relative path
    ```

2.  **Define Your Class:** Create a class that extends `Plugin`.
    ```javascript
    class MyCustomPlugin extends Plugin {
        // ... implementation ...
    }
    ```

3.  **Define `static name`:** Your plugin class **must** have a static `name` property. This is used for identification and logging.
    ```javascript
    class MyCustomPlugin extends Plugin {
        static name = 'MyCustom'; // Unique identifier
        name = 'MyCustom'; // Also set instance name for consistency
        // ...
    }
    ```

4.  **Implement `constructor(options = {})`:** Define a constructor to receive options passed during `app.plug`. Always call `super(options)`.
    ```javascript
    class MyCustomPlugin extends Plugin {
        static name = 'MyCustom';
        name = 'MyCustom';

        constructor(options = {}) {
            super(options); // Pass options to base class
            this.customSetting = options.customSetting || 'default value';
            // Avoid heavy logic or using this.app here, as it's not set yet.
        }
        // ...
    }
    ```

5.  **Implement `load(app)`:** This method is **required**. It's called by NeoAPI after the plugin is instantiated. This is where you integrate with the app:
    *   The `app` instance is passed as an argument.
    *   Store the `app` instance on `this.app` to enable `this.log`.
    *   Use `app.attach()` to add middleware.
    *   Use `app.get()`, `app.post()`, etc., to add routes.
    *   Access plugin options via `this.options`.
    *   Use the built-in logger `this.log`.

    ```javascript
    class MyCustomPlugin extends Plugin {
        // ... (static name, constructor) ...

        load(app) {
            this.app = app; // Store app instance - REQUIRED for this.log

            // Use the logger (logs will be formatted: [ Symbol ◦ MyCustom ] { message })
            this.log.info(`Loading with setting: ${this.customSetting}`);

            // Example: Attach middleware
            const myMiddleware = (req, res, next) => {
                req.customPluginData = { loaded: true, setting: this.customSetting };
                this.log.debug(`Middleware added data for request: ${req.url}`);
                next();
            };
            app.attach(myMiddleware);

            // Example: Add a route
            app.get('/custom-plugin-status', (req, res) => {
                this.log.info('Status route hit!');
                res.json({ plugin: MyCustomPlugin.name, loaded: true, setting: this.customSetting });
            });

            this.log.success('Plugin loaded and integrated.');
        }
    }
    ```

6.  **Use `this.log`:** The base `Plugin` class provides a standardized logger accessible via `this.log` (once `this.app` is set in `load`). It has methods like `info`, `warn`, `error`, `success`, `debug`. These logs are emitted as events and handled by NeoAPI's default log listener, ensuring consistent formatting.

7.  **(Optional) Implement `unload()`:** Define an `unload()` method for cleanup logic (e.g., closing database connections) if your plugin holds persistent resources. Note: NeoAPI's basic `plug` system doesn't automatically call `unload` currently, but it's good practice for potential future enhancements or manual management.

**Complete Custom Plugin Example:**

```javascript
// lib/plugins/databaseConnector.js
const { Plugin } = require('neoapi/plugins');
// const { connectToDatabase, disconnectDatabase } = require('../db/utils'); // Your DB connection logic

class DatabaseConnectorPlugin extends Plugin {
    static name = 'Database';
    name = 'Database';

    constructor(options = {}) {
        super(options);
        this.connectionString = options.connectionString || 'mongodb://localhost:27017/mydb';
        this.dbConnection = null; // To hold the connection/client
    }

    async load(app) {
        this.app = app;
        this.log.info(`Attempting to connect to database: ${this.connectionString}`);

        try {
            // this.dbConnection = await connectToDatabase(this.connectionString); // Your async connection function
             await new Promise(r => setTimeout(r, 100)); // Simulate connection
             this.dbConnection = { client: 'mockClient', db: 'mockDb' }; // Mock connection
            this.log.success('Database connection established successfully.');

            // Attach DB connection to app context or add helper method (example)
            // Note: Modifying app directly should be done cautiously.
            app.db = this.dbConnection;
            this.log.debug('Database connection attached to app instance as app.db');

            // Optionally add middleware to attach db connection per request
            // app.attach((req, res, next) => {
            //     req.db = this.dbConnection;
            //     next();
            // });

        } catch (error) {
            this.log.error(`Database connection failed: ${error.message}`);
            // Prevent app from starting if DB is critical? Throw error.
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async unload() {
        if (this.dbConnection) {
            this.log.info('Closing database connection...');
            try {
                // await disconnectDatabase(this.dbConnection); // Your disconnect function
                await new Promise(r => setTimeout(r, 50)); // Simulate disconnect
                this.log.success('Database connection closed.');
            } catch (error) {
                this.log.error(`Error closing database connection: ${error.message}`);
            } finally {
                this.dbConnection = null;
                this.app.db = null; // Clean up app reference if set
                this.app = null;
            }
        } else {
             this.log.info('Unloaded (no active connection to close).');
        }
    }
}

module.exports = { DatabaseConnectorPlugin }; // Export the class

// --- Usage in server.js ---
// const { DatabaseConnectorPlugin } = require('./lib/plugins/databaseConnector');
// app.plug(DatabaseConnectorPlugin, { connectionString: process.env.DB_URL });
```
# How to Create NeoAPI Plugins

NeoAPI's plugin system allows you to extend its core functionality in a structured and reusable way. You can encapsulate features like middleware, route handlers, helper functions, or integrations with external services into standalone plugins.

This guide covers the process of creating a class-based plugin for NeoAPI, including how to interact with the application's lifecycle hooks.

## Prerequisites

*   Understanding of Node.js, JavaScript classes, and asynchronous programming (`async`/`await`).
*   Familiarity with the core NeoAPI concepts (application instance, middleware, routing).
*   NeoAPI framework installed in your development environment or main project (`npm install neoapi`).

## Core Concepts

*   **Plugin Class:** Plugins are defined as JavaScript classes that extend the base `Plugin` class provided by NeoAPI.
*   **`BasePlugin`:** Imported via `require('neoapi/plugins')`. Provides essential structure, options handling, and a standardized logger.
*   **`static name`:** Each plugin class **must** define a unique `static name` property (string, PascalCase recommended) used for identification and logging.
*   **`load(app)` Method:** The **required** entry point for your plugin's logic. NeoAPI calls this method after instantiating your plugin, passing the `app` instance. Use this method to integrate your plugin (e.g., attach middleware, add routes, **register hooks**).
*   **`app.plug()`:** The method used in your main application (`server.js`) to register and load a plugin class.
*   **Standalone Packages:** Plugins are typically developed as separate npm packages (e.g., `@neoapi/my-plugin`) for better modularity and distribution. They declare `neoapi` as a `peerDependency`.
*   **Lifecycle Hooks (`app.addHook`):** NeoAPI provides hooks into various points of the application and request lifecycle. Plugins can register functions to run at these points using `app.addHook()`.

## 📚 Table of Contents
- [Prerequisites](#prerequisites)
- [Core Concepts](#core-concepts)
- [Steps to Create a Plugin](#steps-to-create-a-plugin)
- [Plugin API & Available Methods](#plugin-api--available-methods)
- [Using Application Lifecycle Hooks](#using-application-lifecycle-hooks) <!-- Added -->
- [Providing Plugin-Specific Hooks/Events](#providing-plugin-specific-hooksevents) <!-- Added -->
- [Structuring Plugins with Components](#structuring-plugins-with-components)
- [Plugin Best Practices](#plugin-best-practices)

## Steps to Create a Plugin

Let's enhance the simple request timing plugin example to use lifecycle hooks.

*(Keep the initial setup steps 1 (Setup Package) as before)*

**2. Define the Plugin Class (`lib/requestTimerPlugin.js`)**

```javascript
// neoapi-request-timer/lib/requestTimerPlugin.js
'use strict';

const { Plugin } = require('neoapi/plugins');
const { performance } = require('perf_hooks'); // Use performance hooks for high-res timing

class RequestTimerPlugin extends Plugin {
    static name = 'RequestTimer';
    name = 'RequestTimer';

    constructor(options = {}) {
        const defaultPluginOptions = {
            headerName: 'X-Response-Time',
            logLevel: 'debug', // Level for logging the duration
        };
        const mergedOptions = { ...defaultPluginOptions, ...options };
        super(mergedOptions);
        // Use Map for potentially better performance storing request start times
        this.requestStartTimes = new Map();
    }

    /**
     * REQUIRED: Load method. Integrates the plugin with the app.
     * @param {NeoAPI} app - The NeoAPI application instance.
     */
    load(app) {
        this.app = app; // REQUIRED for this.log and app methods
        this.log.info(`Initializing request timing...`);

        // --- Using Core Lifecycle Hooks ---
        // Hook into 'onRequest' to capture the start time accurately
        app.addHook('onRequest', this.captureStartTime.bind(this));

        // Hook into 'onResponse' which fires after the response is sent
        app.addHook('onResponse', this.logDuration.bind(this));
        // --- End Hook Usage ---

        this.log.success('Request timing hooks registered.');
    }

    /**
     * Hook handler for 'onRequest'. Stores the start time keyed by request ID.
     * @param {object} req - The request object.
     * @param {object} res - The response object.
     * @private
     * @async - Hooks can be async, even if this one isn't strictly.
     */
    async captureStartTime(req, res) {
        // req.id is automatically added by NeoAPI core (if using the updated core)
        if (req.id) {
            // Use performance.now() for monotonic clock
            this.requestStartTimes.set(req.id, performance.now());
            this.log.debug({ requestId: req.id }, `Captured start time for request.`);
        } else {
            this.log.warn('req.id not found, cannot time request accurately.');
        }
    }

    /**
     * Hook handler for 'onResponse'. Calculates and logs the duration.
     * Optionally adds the X-Response-Time header (though headers might be sent).
     * @param {object} req - The request object.
     * @param {object} res - The response object.
     * @private
     * @async
     */
    async logDuration(req, res) {
        if (req.id && this.requestStartTimes.has(req.id)) {
            const startTime = this.requestStartTimes.get(req.id);
            const endTime = performance.now();
            const duration = (endTime - startTime); // Duration in milliseconds

            // Clean up memory
            this.requestStartTimes.delete(req.id);

            const logData = {
                requestId: req.id,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                durationMs: parseFloat(duration.toFixed(2)), // Log as number
            };

            // Log duration using the configured level
            const logLevel = this.options.logLevel;
            if (this.log[logLevel]) {
                this.log[logLevel](logData, `Request finished in ${logData.durationMs} ms`);
            } else {
                this.log.debug(logData, `Request finished in ${logData.durationMs} ms (defaulted level)`);
            }

            // Attempt to set header - might be too late if already sent
            if (!res.headersSent && this.options.headerName) {
                try {
                   res.setHeader(this.options.headerName, `${logData.durationMs}ms`);
                } catch (e) {
                   this.log.warn({ requestId: req.id }, `Could not set ${this.options.headerName} header (already sent?).`);
                }
            }

        } else {
            this.log.debug('Could not find start time for request, skipping duration logging.');
        }
    }

     unload() {
        this.log.info('Unloading RequestTimerPlugin.');
        // No specific resource cleanup needed here, but good practice
        this.requestStartTimes.clear();
        this.app = null; // Dereference app
     }
}

module.exports = { RequestTimerPlugin };
```

**3. Export from Package Entry Point (`index.js`)** - *Remains the same*

**4. Using Your Plugin in a NeoAPI App** - *Remains the same*

## Plugin API & Available Methods

When extending `Plugin`, your class instance has access to:

*   `this.options`: Merged configuration object.
*   `this.app`: The main `NeoAPI` application instance (set *before* `load()` is called).
*   `this.log`: Standardized logger instance (use *after* `this.app` is set). Methods: `info`, `warn`, `error`, `success`, `debug`.
*   `this.name`: Instance name.

**Within the `load(app)` method (and other methods where `this.app` is available), you can use standard NeoAPI methods, including:**

*   **`app.addHook(hookName, handlerFn)`:** Register functions to run at specific application lifecycle points (see next section).
*   `app.attach(middlewareFn)`: Register global middleware.
*   `app.get/post/etc.(path, [...mw], handler)`: Register routes.
*   `app.group(prefix, callback)`: Create route groups.
*   `app.error(handlerFn)`: Register the global error handler (use with caution in plugins).
*   `app.decorate/Request/Response(prop, value)`: Safely add properties/methods to core objects (if implemented in core).
*   `app.getPlugin(pluginName)`: Get another loaded plugin instance.
*   `app.emit(eventName, ...args)`: Emit custom events.
*   `app.on(eventName, listener)`: Listen for events.

## Using Application Lifecycle Hooks

Plugins can integrate deeply by tapping into the core application's lifecycle using `app.addHook(hookName, handlerFn)`. Register these within your plugin's `load(app)` method.

**Available Core Hooks (Example List):**

*   `onRequest(req, res)`: Fires immediately when a request is received, before routing or parsing.
*   `preHandler(req, res)`: Fires just before the final route handler function is executed, after all middleware.
*   `onResponse(req, res)`: Fires after the response has been successfully sent to the client (`finish` event).
*   `onError(err, req, res)`: Fires within the central error handling logic, *before* the main `app.errorHandler` sends the response. Allows observing or potentially modifying errors.
*   `onListen(address)`: Fires once the server starts listening successfully.

**Registration:**

```javascript
// Inside plugin's load(app) method:
class MyPlugin extends Plugin {
    load(app) {
        this.app = app;
        // Register instance methods as hook handlers
        app.addHook('onRequest', this.myOnRequestHook.bind(this));
        app.addHook('onResponse', this.myOnResponseHook.bind(this));
        this.log.info('Registered application lifecycle hooks.');
    }

    async myOnRequestHook(req, res) {
        this.log.debug({ reqId: req.id }, `Hook: Request received for ${req.url}`);
        // Example: Add a custom header early
        // res.setHeader('X-Plugin-Processed', 'true'); // Careful not to interfere with other plugins
    }

    async myOnResponseHook(req, res) {
         this.log.debug({ reqId: req.id, status: res.statusCode }, `Hook: Response sent for ${req.url}`);
         // Example: Log metrics based on final status
    }
}
```

**Important:**

*   **Binding `this`:** If using class methods as handlers, use `.bind(this)` to ensure the correct context.
*   **`async`:** Hook handlers can be `async`. NeoAPI will `await` them.
*   **Error Handling:** Errors thrown *within* a hook handler will typically stop the execution of subsequent handlers for that hook and may propagate to the main error handler (depending on the hook). Handle errors gracefully within your hook if possible.
*   **Performance:** Keep hook handlers efficient, especially those on the request/response path (`onRequest`, `preHandler`, `onResponse`).

## Providing Plugin-Specific Hooks/Events

Sometimes, you want users of your plugin to be able to react to events or stages *within your plugin's own logic*. There are two common patterns:

**1. Accepting Callback Functions via Options**

This is suitable when you want to provide specific, well-defined extension points, often for actions the user *needs* to customize.

*   **Plugin Design:** Define options in your constructor to accept functions. Call these functions at the appropriate points in your plugin's logic.
*   **User Usage:** The user passes their custom functions when calling `app.plug()`.

**Example: Database Plugin with `onConnect` Callback**

```javascript
// --- Plugin Definition ---
const { Plugin } = require('neoapi/plugins');
// const { connectToDb } = require('./db-utils'); // Your DB logic

class DatabasePlugin extends Plugin {
    static name = 'Database';
    name = 'Database';

    constructor(options = {}) {
        super(options);
        this.onConnectCallback = options.onConnect; // Store user callback
        this.dbConnection = null;
    }

    async load(app) {
        this.app = app;
        this.log.info('Connecting to database...');
        try {
            // this.dbConnection = await connectToDb(this.options.url);
            this.dbConnection = { client: 'mockClient', db: 'mockDb' }; // Mock
            this.log.success('Database connection established.');

            // *** Call the user's hook if provided ***
            if (typeof this.onConnectCallback === 'function') {
                try {
                    // Pass relevant info (connection, app instance)
                    await this.onConnectCallback(this.dbConnection, app);
                } catch (userHookError) {
                     this.log.error(`Error in user-provided 'onConnect' hook: ${userHookError.message}`);
                     // Decide if this error should halt the app or just be logged
                }
            }
            // *** End callback invocation ***

        } catch (error) {
            this.log.error(`Database connection failed: ${error.message}`);
            throw error; // Fail fast if connection is critical
        }
    }
    // ... (optional unload, other methods)
}

// --- User Application (server.js) ---
// const { DatabasePlugin } = require('./plugins/database');
// const app = new NeoAPI();

// app.plug(DatabasePlugin, {
//     url: 'your_db_connection_string',
//     // User provides the callback function
//     onConnect: async (connection, appInstance) => {
//         console.log('*** Database connected! Attaching to app. ***');
//         // User decides how to use the connection
//         appInstance.decorate('db', connection); // Example: Use decorator API
//     }
// });
```

**2. Emitting Events on the App Instance**

This pattern is better for notifying users about events that have occurred, especially when multiple listeners might be interested or when the action is more informational.

*   **Plugin Design:** Use `this.app.emit('yourplugin:eventname', data1, data2, ...)` to signal events. Use clear, namespaced event names.
*   **User Usage:** The user uses `app.on('yourplugin:eventname', (data1, data2) => { ... })` to listen for these events.

**Example: Authentication Plugin Emitting Login Events**

```javascript
// --- Plugin Definition ---
const { Plugin } = require('neoapi/plugins');

class AuthPlugin extends Plugin {
    static name = 'Auth';
    name = 'Auth';

    load(app) {
        this.app = app;
        this.log.info('Auth plugin loaded.');

        app.post('/login', async (req, res) => {
            // Fake authentication logic
            const { username, password } = req.body;
            const user = (username === 'neo' && password === 'pass') ? { id: 1, name: 'Neo' } : null;

            if (user) {
                // *** Emit success event ***
                this.app.emit('auth:login:success', user, req);
                res.json({ message: 'Login successful' });
            } else {
                // *** Emit failure event ***
                this.app.emit('auth:login:failure', username, req);
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
    }
}

// --- User Application (server.js) ---
// const { AuthPlugin } = require('./plugins/auth');
// const app = new NeoAPI();
// app.plug(AuthPlugin);

// // User listens for events emitted by the plugin
// app.on('auth:login:success', (user, req) => {
//     req.log.info({ userId: user.id }, 'User login successful.');
//     // trackLoginMetric(user.id);
// });

// app.on('auth:login:failure', (usernameAttempt, req) => {
//      req.log.warn({ usernameAttempt }, 'Failed login attempt.');
//      // maybe implement rate limiting based on failures
// });
```

**Choosing Between Options and Events:**

*   Use **options callbacks** when the user *needs* to provide logic that integrates directly into the plugin's setup or primary workflow (like configuring the DB connection exposure).
*   Use **emitted events** for notifications, logging, metrics, or triggering decoupled actions in response to plugin activity.

## Structuring Plugins with Components

*(Keep the existing section on Components)*

## Plugin Best Practices

*   **Clear Purpose:** Design plugins with a specific, well-defined purpose.
*   **Use `peerDependencies`:** Declare `neoapi` as a peer dependency.
*   **Extend `Plugin`:** Always extend the base `Plugin` class.
*   **Implement `static name`:** Provide a unique, descriptive static name.
*   **Implement `load(app)`:** Perform integration logic within `load`.
*   **Use `this.log`:** Use the provided logger.
*   **Handle Options:** Define clear defaults and merge correctly.
*   **Isolation:** Prefer using provided `app` methods; avoid modifying core internals directly.
*   **Documentation:** Provide a clear `README.md`.
*   **(Optional) `unload()`:** Implement cleanup if needed.
*   **Lifecycle Hooks:**
    *   Use `app.addHook` within `load` to tap into the application lifecycle.
    *   Keep hook handlers efficient, especially for request/response path hooks.
    *   Handle errors within hook handlers appropriately.
*   **Plugin Hooks/Events:**
    *   Provide clear ways for users to interact (options callbacks or emitted events).
    *   Use clear, namespaced event names (e.g., `myplugin:event`).

By following these guidelines, you can create powerful, reusable, and well-integrated plugins for the NeoAPI ecosystem.

// Type definitions for ZyroAPI v0.0.1-preview
// Project: https://github.com/Darknessking13/ZyroAPI
// Definitions by: I._.become_a_devil

/// <reference types="node" />

import { EventEmitter } from 'events';
import { Server, IncomingMessage, ServerResponse } from 'http';

declare namespace ZyroAPITypes {
    // ============================================================
    // Core Types
    // ============================================================

    /**
     * ZyroAPI configuration options
     */
    interface ZyroAPIOptions {
        /** Enable verbose logging for debugging */
        verbose?: boolean;
        /** Host to bind the server to (default: '0.0.0.0') */
        host?: string;
        /** Ignore trailing slashes in routes (default: true) */
        ignoreTrailingSlash?: boolean;
        /** Allow unsafe regex in routes (default: false) */
        allowUnsafeRegex?: boolean;
    }

    /**
     * Route parameters extracted from URL path
     */
    interface RouteParams {
        [key: string]: string;
    }

    /**
     * Query parameters from URL query string
     */
    interface QueryParams {
        [key: string]: string | string[];
    }

    /**
     * Request body (parsed by JSON parser plugin)
     */
    type RequestBody = any;

    // ============================================================
    // Enhanced Request Interface
    // ============================================================

    /**
     * Enhanced HTTP Request with ZyroAPI decorations
     */
    interface ZyroRequest extends IncomingMessage {
        /** Unique request ID */
        id: string;
        /** Route parameters (e.g., :id from /users/:id) */
        params: RouteParams;
        /** Query string parameters */
        query: QueryParams;
        /** Parsed request body (requires JSON parser plugin) */
        body: RequestBody;
        /** Request protocol (http or https) */
        protocol: string;
        /** Whether the request is secure (https) */
        secure: boolean;
        /** Client IP address */
        ip: string;
        /** Request hostname */
        hostname: string;
        /** Full request path */
        path: string;
        /** Request pathname (without query string) */
        pathname: string;
        /** Logger instance for this request */
        log: Logger;
        /** Session data (if session middleware is used) */
        session?: any;
        /** Session ID (if session middleware is used) */
        sessionID?: string;
        /** CSRF token function (if CSRF plugin is used) */
        csrfToken?: () => string;
    }

    // ============================================================
    // Enhanced Response Interface
    // ============================================================

    /**
     * Enhanced HTTP Response with ZyroAPI utilities
     */
    interface ZyroResponse extends ServerResponse {
        /** Logger instance for this response */
        log: Logger;

        /**
         * Send JSON response
         * @param data - Data to send as JSON
         */
        json(data: any): void;

        /**
         * Send response (auto-detects content type)
         * @param data - Data to send (string, Buffer, or object)
         */
        send(data: string | Buffer | object): void;

        /**
         * Set HTTP status code (chainable)
         * @param code - HTTP status code
         */
        status(code: number): this;

        /**
         * Set Content-Type header (chainable)
         * @param type - MIME type or file extension
         */
        type(type: string): this;

        /**
         * Set response header (chainable)
         * @param name - Header name
         * @param value - Header value
         */
        setHeader(name: string, value: string | number | string[]): this;

        /**
         * Send redirect response
         * @param url - URL to redirect to
         * @param statusCode - HTTP status code (default: 302)
         */
        redirect(url: string, statusCode?: number): void;

        /**
         * Send file as response
         * @param filePath - Path to file
         */
        sendFile(filePath: string): void;

        /**
         * Set Content-Disposition header for file download
         * @param filename - Optional filename for download
         */
        attachment(filename?: string): this;

        /**
         * Send status code with empty body
         * @param code - HTTP status code
         */
        sendStatus(code: number): void;
    }

    // ============================================================
    // Handler Types
    // ============================================================

    /**
     * Next function to pass control to next middleware
     */
    type NextFunction = (err?: Error) => void;

    /**
     * Route handler function
     */
    type RouteHandler = (
        req: ZyroRequest,
        res: ZyroResponse,
        next?: NextFunction
    ) => void | Promise<void>;

    /**
     * Middleware function
     */
    type MiddlewareFunction = (
        req: ZyroRequest,
        res: ZyroResponse,
        next: NextFunction
    ) => void | Promise<void>;

    /**
     * Error handler function
     */
    type ErrorHandler = (
        err: Error,
        req: ZyroRequest,
        res: ZyroResponse
    ) => void | Promise<void>;

    /**
     * Hook handler function
     */
    type HookHandler = (
        req: ZyroRequest,
        res: ZyroResponse
    ) => void | Promise<void>;

    /**
     * Parallel handler function (returns data to be merged)
     */
    type ParallelHandler = (
        req: ZyroRequest,
        res: ZyroResponse
    ) => Promise<any>;

    // ============================================================
    // Logger Interface
    // ============================================================

    /**
     * Logger instance with multiple log levels
     */
    interface Logger {
        /** Log info message */
        info(message: string, ...args: any[]): void;
        /** Log warning message */
        warn(message: string, ...args: any[]): void;
        /** Log error message */
        error(message: string, ...args: any[]): void;
        /** Log success message */
        success(message: string, ...args: any[]): void;
        /** Log debug message (only in verbose mode) */
        debug(message: string, ...args: any[]): void;
    }

    // ============================================================
    // Plugin System
    // ============================================================

    /**
     * Base Plugin class for creating ZyroAPI plugins
     */
    class Plugin {
        /** Plugin name (must be defined as static property) */
        static name: string;
        /** Plugin options */
        options: any;
        /** ZyroAPI application instance */
        app?: ZyroAPIClass;
        /** Plugin logger */
        log: Logger;

        /**
         * Create a new plugin instance
         * @param options - Plugin configuration options
         */
        constructor(options?: any);

        /**
         * REQUIRED: Load method. Integrates the plugin with the app.
         * @param app - The ZyroAPI application instance.
         */
        load(app: ZyroAPIClass): void | Promise<void>;

        /**
         * Unload plugin (optional cleanup)
         */
        unload?(): void | Promise<void>;
    }

    /**
     * Plugin constructor type
     */
    interface PluginConstructor {
        new (options?: any): Plugin;
        name: string;
    }

    // ============================================================
    // Built-in Plugin Options
    // ============================================================

    /**
     * JSON Parser plugin options
     */
    interface JsonParserOptions {
        /** Maximum request body size (default: '1mb') */
        limit?: string | number;
        /** Parse only strict JSON (default: true) */
        strict?: boolean;
    }

    /**
     * CORS plugin options
     */
    interface CorsOptions {
        /** Allowed origin(s) - string, array, or boolean */
        origin?: string | string[] | boolean;
        /** Allowed HTTP methods */
        methods?: string | string[];
        /** Allowed headers */
        allowedHeaders?: string | string[];
        /** Exposed headers */
        exposedHeaders?: string | string[];
        /** Allow credentials (cookies) */
        credentials?: boolean;
        /** Max age for preflight cache */
        maxAge?: number;
        /** Success status for OPTIONS requests */
        optionsSuccessStatus?: number;
    }

    // ============================================================
    // Hook Names
    // ============================================================

    /**
     * Available lifecycle hook names
     */
    type HookName = 'onRequest' | 'preHandler' | 'onResponse' | 'onError' | 'onListen';

    // ============================================================
    // Main ZyroAPI Class
    // ============================================================

    /**
     * Main ZyroAPI application class
     */
    class ZyroAPIClass extends EventEmitter {
        /** Application configuration */
        config: ZyroAPIOptions;
        /** Application logger */
        log: Logger;
        /** HTTP server instance */
        server?: Server;

        /**
         * Create a new ZyroAPI application
         * @param options - Application configuration options
         */
        constructor(options?: ZyroAPIOptions);

        // ============================================================
        // Static Plugin Getters
        // ============================================================

        /** Get JSON Parser plugin class */
        static get jsonParser(): PluginConstructor;
        /** Get CORS plugin class */
        static get cors(): PluginConstructor;

        // ============================================================
        // Server Control
        // ============================================================

        /**
         * Start the HTTP server
         * @param port - Port number to listen on
         * @param callback - Optional callback when server starts
         */
        launch(port: number, callback?: () => void): Server;

        /**
         * Start the HTTP server with host
         * @param port - Port number to listen on
         * @param host - Host to bind to
         * @param callback - Optional callback when server starts
         */
        launch(port: number, host: string, callback?: () => void): Server;

        /**
         * Get the underlying HTTP server instance
         */
        instance(): (req: IncomingMessage, res: ServerResponse) => void;

        // ============================================================
        // HTTP Method Routing
        // ============================================================

        /**
         * Register GET route
         * @param path - Route path (supports :params and *)
         * @param handler - Route handler function
         */
        get(path: string, handler: RouteHandler): void;

        /**
         * Register POST route
         * @param path - Route path
         * @param handler - Route handler function
         */
        post(path: string, handler: RouteHandler): void;

        /**
         * Register PUT route
         * @param path - Route path
         * @param handler - Route handler function
         */
        put(path: string, handler: RouteHandler): void;

        /**
         * Register PATCH route
         * @param path - Route path
         * @param handler - Route handler function
         */
        patch(path: string, handler: RouteHandler): void;

        /**
         * Register DELETE route
         * @param path - Route path
         * @param handler - Route handler function
         */
        delete(path: string, handler: RouteHandler): void;

        /**
         * Register OPTIONS route
         * @param path - Route path
         * @param handler - Route handler function
         */
        options(path: string, handler: RouteHandler): void;

        /**
         * Register HEAD route
         * @param path - Route path
         * @param handler - Route handler function
         */
        head(path: string, handler: RouteHandler): void;

        // ============================================================
        // Middleware & Plugins
        // ============================================================

        /**
         * Attach global middleware
         * @param middleware - Middleware function
         */
        attach(middleware: MiddlewareFunction): void;

        /**
         * Register a plugin
         * @param PluginClass - Plugin class constructor
         * @param options - Plugin options
         */
        plug(PluginClass: PluginConstructor, options?: any): void;

        // ============================================================
        // Error Handling
        // ============================================================

        /**
         * Register global error handler
         * @param handler - Error handler function
         */
        error(handler: ErrorHandler): void;

        // ============================================================
        // Advanced Routing
        // ============================================================

        /**
         * Group routes under a common prefix
         * @param prefix - Path prefix for grouped routes
         * @param callback - Function to define routes within the group
         */
        group(prefix: string, callback: (app: ZyroAPIClass) => void): void;

        /**
         * Create parallel handler that runs multiple async functions concurrently
         * @param handlers - Array of async handler functions
         */
        parallel(handlers: ParallelHandler[]): RouteHandler;

        // ============================================================
        // Hooks
        // ============================================================

        /**
         * Add lifecycle hook
         * @param hookName - Name of the hook
         * @param handler - Hook handler function
         */
        addHook(hookName: HookName, handler: HookHandler): void;
    }
}

// ============================================================
// Module Exports
// ============================================================

declare class ZyroAPI extends ZyroAPITypes.ZyroAPIClass {}

export { ZyroAPI };

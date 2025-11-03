// lib/neoapi.js - Optimized Version

// --- Core Node Modules ---
const http = require('http');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');

// --- Dependencies ---
const FindMyWay = require('find-my-way');
const mime = require('mime-types');
const chalk = require('chalk');
const logSymbols = require('log-symbols');
const accepts = require('accepts');
const typeis = require('type-is');

// --- Internal Plugin Loaders ---
let JsonParserPlugin, CorsPlugin, BasePlugin;
try {
    JsonParserPlugin = require('./plugins/jsonParser').JsonParserPlugin;
    CorsPlugin = require('./plugins/cors').CorsPlugin;
    BasePlugin = require('./plugins/basePlugin').Plugin;
} catch (pluginLoadError) {
    console.error(chalk.redBright(`[NeoAPI Core] FATAL: Could not load essential internal plugins.`));
    console.error(pluginLoadError.stack || pluginLoadError);
    process.exit(1);
}

// --- Request ID Generator (Optimized) ---
let requestIdCounter = 0;
const generateRequestId = () => {
    if (++requestIdCounter >= Number.MAX_SAFE_INTEGER - 1) requestIdCounter = 0;
    return `req_${requestIdCounter.toString(36)}`;
};

// --- Add Request Methods to Prototype (Performance Optimization) ---
if (!http.IncomingMessage.prototype.get) {
    http.IncomingMessage.prototype.get = function(headerName) {
        if (!headerName) throw new TypeError('headerName argument is required to req.get');
        return this.headers[headerName.toLowerCase()];
    };
}

if (!http.IncomingMessage.prototype.accepts) {
    http.IncomingMessage.prototype.accepts = function(...types) {
        if (!this._acceptsCache) {
            this._acceptsCache = accepts(this);
        }
        return this._acceptsCache.types(...types);
    };
}

if (!http.IncomingMessage.prototype.is) {
    http.IncomingMessage.prototype.is = function(...types) {
        const typeList = types.flat();
        return typeis(this, typeList);
    };
}

// Lazy logger getter
if (!http.IncomingMessage.prototype.log) {
    Object.defineProperty(http.IncomingMessage.prototype, 'log', {
        get() {
            if (!this._log && this.app) {
                this._log = this.app.log.child({ requestId: this.id });
            }
            return this._log || console;
        },
        configurable: true
    });
}

// --- Response Guard Helper (Optimized) ---
const guardResponse = (res, methodName) => {
    if (res._neo_finished || res.headersSent) {
        if (!res._neo_finished) {
            res.app.log.warn(`${methodName} called after response sent`);
            res._neo_finished = true;
        }
        return true; // Already finished
    }
    return false; // Can proceed
};

// --- Parse Query Helper (Optimized) ---
const parseQuery = (searchParams) => {
    const query = Object.create(null);
    for (const [key, value] of searchParams) {
        query[key] = value;
    }
    return query;
};

// --- Route Path Normalizer (Optimized) ---
const normalizeRoutePath = (prefix, path) => {
    let result = prefix;
    if (!path.startsWith('/')) result += '/';
    result += path;
    
    let clean = '';
    let lastWasSlash = false;
    
    for (let i = 0; i < result.length; i++) {
        const char = result[i];
        if (char === '/') {
            if (!lastWasSlash) {
                clean += char;
                lastWasSlash = true;
            }
        } else {
            clean += char;
            lastWasSlash = false;
        }
    }
    
    if (clean.length > 1 && clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }
    
    return clean || '/';
};

// --- Response Helper (Optimized) ---
const finishResponse = (res, body, contentType) => {
    if (guardResponse(res, 'finishResponse')) return false;
    
    res._neo_finished = true;
    if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', contentType);
    }
    // Optimize: avoid Buffer.byteLength for buffers
    const length = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
    res.setHeader('Content-Length', length);
    res.writeHead(res.statusCode || 200);
    res.end(body);
    return true;
};

// --- Decorate Request (Optimized) ---
function decorateRequest(req, appInstance) {
    if (req._neo_decorated_req) return;
    req._neo_decorated_req = true;

    req.app = appInstance;
    req.secure = req.connection?.encrypted || req.headers['x-forwarded-proto'] === 'https';
    
    const xForwardedFor = req.headers['x-forwarded-for'];
    req.ip = xForwardedFor ? String(xForwardedFor).split(',')[0].trim() : req.socket?.remoteAddress;
    req.protocol = req.secure ? 'https' : 'http';
    
    // Methods are now on prototype - no binding needed
}

// --- Decorate Response (Optimized) ---
function decorateResponse(res, appInstance) {
    if (res._neo_decorated_res) return;
    res._neo_decorated_res = true;
    res._neo_finished = false;
    res.app = appInstance;

    res.status = function(code) {
        this.statusCode = code;
        return this;
    };

    const originalSetHeader = http.ServerResponse.prototype.setHeader;
    res.setHeader = function(key, val) {
        originalSetHeader.call(this, key, val);
        return this;
    };

    res.type = function(type) {
        const contentType = mime.contentType(type) || type;
        this.setHeader('Content-Type', contentType);
        return this;
    };

    res.send = function(data) {
        let body, contentType;
        
        if (Buffer.isBuffer(data)) {
            body = data;
            contentType = 'application/octet-stream';
        } else if (typeof data === 'object' && data !== null) {
            body = JSON.stringify(data);
            contentType = 'application/json; charset=utf-8';
        } else {
            body = data === undefined ? '' : String(data);
            contentType = 'text/plain; charset=utf-8';
        }
        
        finishResponse(this, body, contentType);
        return this;
    };

    res.json = function(data) {
        if (guardResponse(this, 'res.json')) return this;
        const body = JSON.stringify(data);
        finishResponse(this, body, 'application/json; charset=utf-8');
        return this;
    };

    res.sendStatus = function(statusCode) {
        if (guardResponse(this, 'res.sendStatus')) return this;
        this._neo_finished = true;
        this.status(statusCode);
        this.setHeader('Content-Length', '0');
        this.end();
        return this;
    };

    res.redirect = function(url, statusCode = 302) {
        if (guardResponse(this, 'res.redirect')) return this;
        this._neo_finished = true;
        this.status(statusCode)
            .setHeader('Location', url)
            .setHeader('Content-Length', '0')
            .end();
        return this;
    };

    const originalRemoveHeader = http.ServerResponse.prototype.removeHeader;
    res.clearHeader = function(name) {
        originalRemoveHeader.call(this, name);
        return this;
    };

    res.sendFile = function(filePath) {
        if (guardResponse(this, 'res.sendFile')) return this;

        const fullPath = path.resolve(filePath);

        fs.access(fullPath, fs.constants.R_OK).then(() => {
            const stream = require('fs').createReadStream(fullPath);
            const contentType = mime.contentType(path.extname(fullPath));

            stream.once('error', (err) => {
                const req = this.req;
                const reqLog = req?.log || this.app.log;
                if (!this.headersSent && !this._neo_finished) {
                    reqLog.error(`Error streaming file ${filePath}: ${err.message}`);
                    this._neo_finished = true;
                    const status = err.code === 'EACCES' ? 403 : 500;
                    const message = err.code === 'EACCES' ? 'Permission Denied' : 'Internal Server Error';
                    this.status(status).type('txt').send(message);
                } else if (!this._neo_finished) {
                    reqLog.error(`Error sending file ${filePath} after headers sent: ${err.message}`);
                    if (this.socket && !this.socket.destroyed) this.socket.destroy();
                    this._neo_finished = true;
                }
                if (stream.destroy) stream.destroy();
            });

            stream.once('open', () => {
                if (this._neo_finished || this.headersSent) {
                    if (stream.destroy) stream.destroy();
                    return;
                }
                if (contentType) this.setHeader('Content-Type', contentType);
                if (!this.statusCode) this.statusCode = 200;
                this.writeHead(this.statusCode);
                stream.pipe(this);
            });

            const cleanup = () => {
                this._neo_finished = true;
                if (stream.destroy) stream.destroy();
                this.removeListener('finish', cleanup);
                this.removeListener('close', cleanup);
            };
            this.once('finish', cleanup);
            this.once('close', cleanup);

        }).catch(err => {
            const req = this.req;
            const reqLog = req?.log || this.app.log;
            if (!this.headersSent && !this._neo_finished) {
                reqLog.error(`Error accessing file ${filePath}: ${err.message}`);
                this._neo_finished = true;
                const status = err.code === 'ENOENT' ? 404 : (err.code === 'EACCES' ? 403 : 500);
                const message = err.code === 'ENOENT' ? 'File Not Found' : (err.code === 'EACCES' ? 'Permission Denied' : 'Internal Server Error');
                this.status(status).type('txt').send(message);
            } else if (!this._neo_finished) {
                reqLog.error(`File access error for ${filePath} after headers sent: ${err.message}`);
                if (this.socket && !this.socket.destroyed) this.socket.destroy();
                this._neo_finished = true;
            }
        });
        return this;
    };

    res.attachment = function(filename) {
        const disposition = filename ? `attachment; filename="${path.basename(filename)}"` : 'attachment';
        this.setHeader('Content-Disposition', disposition);
        return this;
    };
}

// --- Logger Method Factory (Optimized) ---
const createLogMethod = (emitter, level) => {
    return function(message, ...args) {
        emitter.emit('log', level, this.sourceName, message, this.bindings, ...args);
    };
};

// --- NeoAPI Class ---
class NeoAPI extends EventEmitter {
    constructor(options = {}) {
        super();
        this.config = options;
        this.router = FindMyWay({
            defaultRoute: (req, res) => {
                const err = new Error(`Cannot ${req.method} ${req.pathname || req.url}`);
                err.statusCode = 404;
                err.code = 'NOT_FOUND';
                this._handleError(err, req, res);
            },
            ignoreTrailingSlash: options.ignoreTrailingSlash ?? true,
            allowUnsafeRegex: options.allowUnsafeRegex ?? false,
        });
        this.middleware = [];
        this.errorHandler = this._defaultErrorHandler;
        this._currentGroupPrefix = '';
        this.plugins = new Map();
        this.hooks = new Map();
        this._setupDefaultLogListener();
        this.log = this._createLogger('NeoAPI Core');
        this._boundHandleRequest = this._handleRequest.bind(this);
    }

    static get jsonParser() { return JsonParserPlugin; }
    static get cors() { return CorsPlugin; }

    instance() {
        return this._boundHandleRequest;
    }

    launch(port, hostOrCb, callback) {
        // Validate port
        if (typeof port !== 'number' || port < 0 || port > 65535 || !Number.isInteger(port)) {
            throw new Error('Port must be an integer between 0 and 65535');
        }
        
        let host = this.config.host || '0.0.0.0';
        let cb = callback;

        if (typeof hostOrCb === 'string') {
            host = hostOrCb;
        } else if (typeof hostOrCb === 'function') {
            cb = hostOrCb;
        }

        const server = http.createServer(this.instance());

        server.on('error', (err) => {
            this.emit('server:error', err);
            this.log.error(`Failed to start server: ${err.message}`);
            if (err.code === 'EADDRINUSE') {
                console.error(chalk.red(`   Address ${host}:${port} is already in use.`));
            }
            process.exit(1);
        });

        server.listen(port, host, async () => {
            const address = server.address();
            const effectivePort = address ? address.port : port;
            const effectiveHost = address ? address.address : host;

            try {
                await this._runHooks('onListen', server, address);
            } catch (hookError) {
                this.log.error(`Error during 'onListen' hook: ${hookError.message}`);
            }

            this.emit('server:listening', effectivePort, address);
            this.log.success(`Listening on ${effectiveHost}:${effectivePort}`);

            if (cb && typeof cb === 'function') {
                try { cb(); }
                catch (cbErr) { this.log.error(`Error in launch callback: ${cbErr.message}`); }
            }
        });
        return server;
    }

    // --- Optimized Logger Creation ---
    _createLogger(sourceName, bindings = {}) {
        const context = { sourceName, bindings };
        
        return {
            success: createLogMethod(this, 'success').bind(context),
            info: createLogMethod(this, 'info').bind(context),
            warn: createLogMethod(this, 'warn').bind(context),
            error: createLogMethod(this, 'error').bind(context),
            debug: createLogMethod(this, 'debug').bind(context),
            fatal: function(message, ...args) {
                this.emit('log', 'error', context.sourceName, `FATAL: ${message}`, context.bindings, ...args);
                process.exit(1);
            }.bind(this),
            trace: createLogMethod(this, 'debug').bind(context),
            child: (childBindings) => this._createLogger(sourceName, { ...bindings, ...childBindings })
        };
    }

    _setupDefaultLogListener() {
        const symbols = { info: logSymbols.info, success: logSymbols.success, warn: logSymbols.warning, error: logSymbols.error, debug: '›' };
        const colors = { error: chalk.redBright, warn: chalk.yellowBright, success: chalk.green, debug: chalk.gray, info: chalk.white };

        this.on('log', (level, sourceName, message, bindings, ...args) => {
            // Early return for debug logs when not in verbose mode
            if (level === 'debug' && !(this.config.verbose || process.env.NODE_ENV === 'development')) {
                return;
            }
            
            const symbol = symbols[level] || '?';
            const colorize = colors[level] || chalk.white;
            
            // Build log line only when needed
            let logLine = `${chalk.dim(new Date().toLocaleTimeString())} ${symbol} ${chalk.magentaBright(`[${sourceName}]`)}`;
            
            if (bindings && Object.keys(bindings).length > 0) {
                logLine += chalk.dim(` {${Object.entries(bindings).map(([k, v]) => `${k}:${v}`).join(',')}}`);
            }
            
            logLine += ` ${message}`;
            const formattedMessage = colorize(logLine);
            
            if (level === 'error') console.error(formattedMessage, ...args);
            else if (level === 'warn') console.warn(formattedMessage, ...args);
            else console.log(formattedMessage, ...args);
        });
    }

    addHook(hookName, handlerFn) {
        if (typeof handlerFn !== 'function') {
            throw new Error(`Handler for hook '${hookName}' must be a function.`);
        }
        const handlers = this.hooks.get(hookName) || [];
        handlers.push(handlerFn);
        this.hooks.set(hookName, handlers);
        if (this.config.verbose) this.log.debug(`Added hook for '${hookName}' (${handlerFn.name || 'anonymous'})`);
        return this;
    }

    async _runHooks(hookName, ...args) {
        const handlers = this.hooks.get(hookName);
        if (!handlers || handlers.length === 0) return;
        
        const req = args[0];
        const reqLog = req?.log || this.log;

        if (this.config.verbose) reqLog.debug(`Running ${handlers.length} hook(s) for '${hookName}'`);

        for (const handler of handlers) {
            try {
                await handler(...args);
            } catch (hookError) {
                reqLog.error(`Error in hook '${hookName}' (${handler.name || 'anonymous'}): ${hookError.message}`);
                console.error(hookError.stack);
                throw hookError;
            }
        }
    }
    
    _hasHook(hookName) {
        const handlers = this.hooks.get(hookName);
        return handlers && handlers.length > 0;
    }

    attach(...middlewareFns) {
        const flattenedFns = middlewareFns.flat();
        for (const middlewareFn of flattenedFns) {
            if (typeof middlewareFn !== 'function') {
                throw new Error('Middleware provided to attach() must be a function!');
            }
            if (this.config.verbose) {
                this.log.debug(`Attaching middleware "${middlewareFn.name || 'anonymous'}"`);
            }
            this.middleware.push({ fn: middlewareFn });
        }
        return this;
    }

    plug(PluginClass, options = {}) {
        let pluginName = 'UnknownPlugin';
        try {
            if (!(typeof PluginClass === 'function' && (PluginClass.prototype instanceof BasePlugin || PluginClass === JsonParserPlugin || PluginClass === CorsPlugin))) {
                throw new Error('Invalid plugin definition. Expected class extending BasePlugin or known static getter.');
            }
            pluginName = PluginClass.name;
            if (!pluginName || typeof pluginName !== 'string') {
                throw new Error('Plugin class needs static string "name" property.');
            }
            if (this.plugins.has(pluginName)) {
                this.log.warn(`Plugin "${pluginName}" already loaded. Skipping.`);
                return this;
            }

            this.log.debug(`Loading plugin "${pluginName}"...`);
            const pluginInstance = new PluginClass(options);
            pluginInstance.app = this;

            if (typeof pluginInstance.load !== 'function') {
                throw new Error(`Plugin "${pluginName}" missing required "load(app)" method.`);
            }

            pluginInstance.load(this);
            this.plugins.set(pluginName, pluginInstance);
            this.log.success(`Plugin "${pluginName}" loaded.`);
            this.emit('plugin:loaded', pluginName, pluginInstance);

        } catch (err) {
            const message = `Failed to load plugin "${pluginName}": ${err.message}`;
            this.log.error(message);
            console.error(err.stack);
            this.emit('plugin:error', pluginName, err);
        }
        return this;
    }

    getPlugin(pluginName) {
        return this.plugins.get(pluginName);
    }

    error(handlerFn) {
        if (typeof handlerFn !== 'function') {
            throw new Error('Error handler must be a function accepting (err, req, res)!');
        }
        if (handlerFn.length !== 3) {
            this.log.warn('Error handler should accept 3 parameters (err, req, res)');
        }
        this.errorHandler = handlerFn;
        return this;
    }

    _defaultErrorHandler(err, req, res) {
        const reqLog = req?.log || this.log;
        const isNotFoundError = err.statusCode === 404;

        if (!isNotFoundError || this.config.verbose) {
            reqLog.error({ err }, err.stack || err.message || 'Unknown Error');
        }

        if (!res.writableEnded && !res.headersSent && !res._neo_finished) {
            const statusCode = typeof err.statusCode === 'number' && err.statusCode >= 400 ? err.statusCode : 500;
            res.status(statusCode).type('json').send({
                error: {
                    message: err.message || (statusCode === 500 ? 'Internal Server Error' : 'An error occurred'),
                    code: err.code,
                    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
                }
            });
        } else if (!res._neo_finished) {
            reqLog.warn("Error occurred after response headers were sent. Attempting to close connection.");
            if (res.socket && !res.socket.destroyed) res.socket.destroy();
            res._neo_finished = true;
        }
    }

    async _handleError(err, req, res) {
        if (!(err instanceof Error)) {
            err = new Error(String(err) || 'Unknown error occurred');
            err.statusCode = 500;
        }
        const reqLog = req?.log || this.log;

        try {
            await this._runHooks('onError', err, req, res);
        } catch (hookError) {
            reqLog.error(`CRITICAL: Error within 'onError' hook itself: ${hookError.message}`);
        }

        if ((!res.statusCode || res.statusCode < 400) && !res.headersSent && !res._neo_finished) {
            res.statusCode = (err.statusCode >= 400 ? err.statusCode : 500);
        }
        
        try {
            this.errorHandler(err, req, res);
            this.emit('error:handled', err, req, res);
        } catch (errorHandlerError) {
            reqLog.error(`CRITICAL: Error within registered error handler: ${errorHandlerError.message}`);
            console.error("Error Handler Stack:", errorHandlerError.stack);
            this.emit('error:handler_failed', errorHandlerError, err);
            
            if (!res.writableEnded && !res.headersSent && !res._neo_finished) {
                try {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: 'Fatal error: Error handler failed.', code: 'ERROR_HANDLER_FAILED' } }));
                } catch (fallbackError) {
                    reqLog.error(`Failed to send fallback error response: ${fallbackError.message}`);
                    if (res.socket && !res.socket.destroyed) res.socket.destroy();
                } finally {
                    res._neo_finished = true;
                }
            } else if (!res._neo_finished && res.socket && !res.socket.destroyed) {
                res.socket.destroy();
                res._neo_finished = true;
            }
        }
    }

    _addRoute(method, path, ...args) {
        // Validate path
        if (typeof path !== 'string') {
            throw new Error(`Route path must be a string, got ${typeof path}`);
        }
        if (path.length === 0) {
            throw new Error('Route path cannot be empty');
        }
        
        let routeMiddlewares = [];
        let handler;

        if (args.length === 0) {
            throw new Error(`Handler missing for route ${method} ${path}`);
        } else if (args.length === 1) {
            handler = args[0];
        } else {
            const potentialHandler = args[args.length - 1];
            const potentialMiddlewares = args.slice(0, -1);
            if (typeof potentialHandler !== 'function') {
                throw new Error(`Final argument for route ${method} ${path} must be handler function.`);
            }
            handler = potentialHandler;
            const flattenedMiddlewares = potentialMiddlewares.flat();
            for (const mw of flattenedMiddlewares) {
                if (typeof mw !== 'function') {
                    throw new Error(`Invalid route-level middleware for ${method} ${path}.`);
                }
            }
            routeMiddlewares = flattenedMiddlewares;
        }
        if (typeof handler !== 'function') {
            throw new Error(`Handler for route ${method} ${path} must be a function!`);
        }

        const routePath = normalizeRoutePath(this._currentGroupPrefix, path);

        if (this.config.verbose) {
            this.log.debug(`Registering route: ${method} ${routePath}${routeMiddlewares.length > 0 ? ` (${routeMiddlewares.length} middleware)` : ''}`);
        }
        
        const store = { middlewares: routeMiddlewares };
        try {
            this.router.on(method, routePath, handler, store);
        } catch (routerErr) {
            this.log.error(`Error registering route ${method} ${routePath}: ${routerErr.message}`);
            throw routerErr;
        }
        return this;
    }

    get(path, ...args) { return this._addRoute('GET', path, ...args); }
    post(path, ...args) { return this._addRoute('POST', path, ...args); }
    put(path, ...args) { return this._addRoute('PUT', path, ...args); }
    patch(path, ...args) { return this._addRoute('PATCH', path, ...args); }
    delete(path, ...args) { return this._addRoute('DELETE', path, ...args); }
    options(path, ...args) { return this._addRoute('OPTIONS', path, ...args); }
    head(path, ...args) { return this._addRoute('HEAD', path, ...args); }

    group(prefix, callback) {
        if (typeof prefix !== 'string') {
            throw new Error('Group prefix must be a string');
        }
        if (typeof callback !== 'function') {
            throw new Error('Group callback must be a function');
        }
        
        const originalPrefix = this._currentGroupPrefix;
        const newPrefixSegment = (prefix.startsWith('/') ? prefix : `/${prefix}`).replace(/\/+/g, '/').replace(/\/$/, '');
        this._currentGroupPrefix = (originalPrefix + newPrefixSegment).replace(/\/+/g, '/');
        
        if (this.config.verbose) {
            this.log.debug(`Entering group: ${this._currentGroupPrefix || '/'}`);
        }
        
        try {
            callback(this);
        } catch (groupErr) {
            this.log.error(`Error in route group "${prefix}": ${groupErr.message}`);
            this._currentGroupPrefix = originalPrefix;
            throw groupErr;
        } finally {
            this._currentGroupPrefix = originalPrefix;
            if (this.config.verbose) {
                this.log.debug(`Exiting group, restored prefix: ${this._currentGroupPrefix || "''"}`);
            }
        }
        return this;
    }

    parallel(handlerList) {
        if (!Array.isArray(handlerList) || handlerList.some(h => typeof h !== 'function')) {
            throw new Error('parallel() expects an array of handler functions.');
        }
        
        return async (req, res, next) => {
            try {
                const promises = handlerList.map((handler, index) => {
                    return Promise.resolve()
                        .then(() => handler(req))
                        .catch(err => {
                            req.log.error(`Parallel handler #${index + 1} (${handler.name || 'anon'}) error: ${err.message}`);
                            return { _neo_parallel_error: true };
                        });
                });
                
                const results = await Promise.all(promises);
                const aggregatedData = results.reduce((acc, data) => {
                    if (data && typeof data === 'object' && !data._neo_parallel_error) {
                        return { ...acc, ...data };
                    }
                    return acc;
                }, {});
                
                if (results.some(r => r?._neo_parallel_error)) {
                    req.log.warn(`Parallel route finished with sub-handler errors.`);
                }
                
                res.json(aggregatedData);
            } catch (err) {
                req.log.error(`Critical error during parallel execution: ${err.message}`);
                next(err);
            }
        };
    }

    async _handleRequest(req, res) {
        // --- Initial Setup (Optimized) ---
        req.id = generateRequestId();
        decorateRequest.call(this, req, this);
        decorateResponse.call(this, res, this);
        res.req = req;
        this.emit('request:start', req, res);

        // --- onRequest Hook (skip if no handlers) ---
        if (this._hasHook('onRequest')) {
            try {
                await this._runHooks('onRequest', req, res);
            } catch (hookError) {
                return this._handleError(hookError, req, res);
            }
        }

        // Setup cleanup
        const cleanup = () => {
            if (!res.writableEnded) {
                this.emit('request:close', req, res);
                res._neo_finished = true;
            }
        };
        
        res.once('finish', () => {
            this._runHooks('onResponse', req, res).catch(hookError => {
                req.log.error(`Error during 'onResponse' hook: ${hookError.message}`);
            });
            this.emit('request:finish', req, res);
            res._neo_finished = true;
            res.removeListener('close', cleanup);
        });
        res.once('close', cleanup);

        // --- Parse URL (Optimized - Fast Path) ---
        try {
            if (typeof req.url !== 'string') {
                throw new Error('Invalid request URL type');
            }
            
            // Fast path: split pathname and query
            const questionMarkIndex = req.url.indexOf('?');
            if (questionMarkIndex === -1) {
                req.pathname = req.url;
                req.query = {};
            } else {
                req.pathname = req.url.slice(0, questionMarkIndex);
                const queryString = req.url.slice(questionMarkIndex + 1);
                req.query = parseQuery(new URLSearchParams(queryString));
            }
            
            req.hostname = req.headers.host || 'localhost';
            req.href = `${req.protocol}://${req.hostname}${req.url}`;
        } catch (urlError) {
            req.log.error(`Invalid URL: ${req.url} - ${urlError.message}`);
            const err = new Error(`Invalid URL: ${urlError.message}`);
            err.statusCode = 400;
            err.code = 'INVALID_URL';
            return this._handleError(err, req, res);
        }

        // --- Route Matching ---
        const route = this.router.find(req.method, req.pathname);
        let finalRouteHandler = null;
        let routeMiddlewares = [];
        
        if (route) {
            finalRouteHandler = route.handler;
            req.params = route.params;
            routeMiddlewares = route.store?.middlewares || [];
        }

        // --- Optimized Middleware Chain Execution ---
        const totalGlobalMiddleware = this.middleware.length;
        const totalRouteMiddleware = routeMiddlewares.length;
        let globalMiddlewareIndex = 0;
        let routeMiddlewareIndex = 0;
        let handlerExecuted = false;

        const next = async (err) => {
            // Fast path: check if response is finished
            if (res._neo_finished || res.writableEnded) {
                if (err && !res._neo_finished) {
                    req.log.error(`next(err) called after response ended: ${err.message}`);
                }
                return;
            }

            // Handle errors immediately
            if (err) return this._handleError(err, req, res);

            // Determine next function to execute
            let middlewareToExecute = null;
            let isHandler = false;
            
            if (globalMiddlewareIndex < totalGlobalMiddleware) {
                middlewareToExecute = this.middleware[globalMiddlewareIndex++].fn;
            } else if (finalRouteHandler && routeMiddlewareIndex < totalRouteMiddleware) {
                middlewareToExecute = routeMiddlewares[routeMiddlewareIndex++];
            } else if (finalRouteHandler && !handlerExecuted) {
                middlewareToExecute = finalRouteHandler;
                isHandler = true;
                handlerExecuted = true;
            }

            // Execute middleware or handler
            if (middlewareToExecute) {
                try {
                    if (isHandler && this._hasHook('preHandler')) {
                        await this._runHooks('preHandler', req, res);
                    }
                    
                    let nextCalled = false;
                    const nextWrapper = (errWrapper) => {
                        if (nextCalled) return;
                        nextCalled = true;
                        setImmediate(() => next(errWrapper));
                    };
                    
                    const result = middlewareToExecute(req, res, nextWrapper);
                    if (result && typeof result.then === 'function') {
                        await result;
                    }

                    // Warn if sync middleware didn't call next or send response
                    if (!nextCalled && !res._neo_finished && !res.writableEnded && !isHandler) {
                        const isAsync = middlewareToExecute.constructor.name === 'AsyncFunction';
                        if (!isAsync) {
                            req.log.warn(`Sync middleware "${middlewareToExecute.name || 'anon'}" finished without next() or response.`);
                        }
                    }
                    
                    if (isHandler && !res._neo_finished && !res.writableEnded) {
                        req.log.warn(`Handler "${middlewareToExecute.name || 'anon'}" finished without ending response.`);
                    }
                } catch (err) {
                    return next(err);
                }
            } else if (!res._neo_finished && !res.writableEnded) {
                // No more middleware and no handler - 404
                req.log.error(`Request chain ended unexpectedly for ${req.method} ${req.pathname}. Forcing 404.`);
                const err404 = new Error(`Not Found - Chain Fallback`);
                err404.statusCode = 404;
                err404.code = 'CHAIN_FALLBACK';
                this._handleError(err404, req, res);
            }
        };

        // Start the chain
        try {
            await next();
        } catch (topLevelError) {
            this._handleError(topLevelError, req, res);
        }
    }
}

module.exports = { NeoAPI };
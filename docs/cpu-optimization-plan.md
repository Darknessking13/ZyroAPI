# CPU Optimization Plan

Based on benchmark results showing 95% avg CPU vs Fastify's 68%, here are optimization opportunities:

## High Impact Optimizations

### 1. Logger Optimization (Estimated: -10-15% CPU)
**Current Issue:** Logger creates child loggers and bindings on every request
```javascript
req.log = this.log.child({ requestId: req.id });
```

**Solution:** Use object pooling or simpler logger binding
```javascript
// Option 1: Reuse logger with context
req.log = this.log;
req.requestId = req.id;

// Option 2: Lazy logger creation
Object.defineProperty(req, 'log', {
    get() {
        if (!this._log) {
            this._log = app.log.child({ requestId: this.id });
        }
        return this._log;
    }
});
```

### 2. URL Parsing Optimization (Estimated: -5-8% CPU)
**Current Issue:** Creating new URL object on every request
```javascript
parsedUrl = new URL(req.url, `${proto}://${hostHeader}`);
```

**Solution:** Use faster URL parsing
```javascript
// Use querystring module for query parsing
const [pathname, search] = req.url.split('?', 2);
req.pathname = pathname;
req.query = search ? querystring.parse(search) : {};
```

### 3. Request/Response Decoration (Estimated: -3-5% CPU)
**Current Issue:** Binding methods on every request
```javascript
req.get = getHeader.bind(req);
req.accepts = requestAccepts.bind(req);
req.is = requestIs.bind(req);
```

**Solution:** Use prototype methods instead
```javascript
// Add to IncomingMessage.prototype once
http.IncomingMessage.prototype.get = getHeader;
http.IncomingMessage.prototype.accepts = requestAccepts;
http.IncomingMessage.prototype.is = requestIs;
```

### 4. Remove Unnecessary Checks (Estimated: -2-3% CPU)
**Current Issue:** Multiple response state checks
```javascript
if (res._neo_finished || res.writableEnded || res.socket?.destroyed)
```

**Solution:** Single flag check
```javascript
if (res._neo_finished) // Trust our own flag
```

### 5. Optimize Hook Execution (Estimated: -3-5% CPU)
**Current Issue:** Hook lookup and iteration on every request
```javascript
const handlers = this.hooks.get(hookName);
if (!handlers || handlers.length === 0) return;
```

**Solution:** Pre-compute hook presence
```javascript
// In constructor
this._hasOnRequestHook = false;
this._hasPreHandlerHook = false;

// Only run hooks if they exist
if (this._hasOnRequestHook) {
    await this._runHooks('onRequest', req, res);
}
```

## Medium Impact Optimizations

### 6. String Concatenation (Estimated: -1-2% CPU)
Replace template literals in hot paths with string concatenation:
```javascript
// Before
return `req_${requestIdCounter.toString(36)}`;

// After
return 'req_' + requestIdCounter.toString(36);
```

### 7. Object Creation (Estimated: -2-3% CPU)
Reduce object allocations:
```javascript
// Before
const query = Object.create(null);

// After - reuse objects from pool
const query = getQueryObjectFromPool();
```

### 8. Middleware Store (Estimated: -1-2% CPU)
Cache middleware functions:
```javascript
// Before
this.middleware[globalMiddlewareIndex++].fn

// After - flatten on registration
this._flatMiddleware = this.middleware.map(m => m.fn);
this._flatMiddleware[globalMiddlewareIndex++]
```

## Low Impact Optimizations

### 9. Remove Chalk in Production (Estimated: -1% CPU)
Disable colored logging in production:
```javascript
if (process.env.NODE_ENV === 'production') {
    // Use plain console.log without chalk
}
```

### 10. Optimize Route Normalization (Estimated: -0.5-1% CPU)
Cache normalized paths:
```javascript
const pathCache = new Map();
const normalizeRoutePath = (prefix, path) => {
    const key = prefix + path;
    if (pathCache.has(key)) return pathCache.get(key);
    // ... normalization logic
    pathCache.set(key, result);
    return result;
};
```

## Implementation Priority

1. **Phase 1 (Quick Wins):** #3, #4, #5 - Prototype methods, remove checks, optimize hooks
2. **Phase 2 (Medium Effort):** #1, #2 - Logger and URL parsing
3. **Phase 3 (Polish):** #6, #7, #8, #9, #10 - String ops, object pooling, caching

## Expected Results

Implementing all optimizations:
- **Target CPU reduction:** 25-35%
- **New avg CPU:** ~60-70% (comparable to Fastify)
- **Requests/sec improvement:** +10-15%
- **Latency improvement:** -5-10%

## Benchmarking

After each phase, run:
```bash
node benchmark/benchmark.js
```

Compare:
- CPU usage (should decrease)
- Requests/sec (should increase)
- Memory (should stay similar or decrease)
- Latency (should decrease)

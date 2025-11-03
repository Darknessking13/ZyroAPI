# NeoAPI Test Suite

Comprehensive test suite for NeoAPI v0.0.1-preview.

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run with verbose logging
npm run test:verbose
```

### What Gets Tested

The test suite validates **27 core features** across 12 categories:

#### 1. Basic Routing (7 tests)
- ✅ GET requests
- ✅ POST requests
- ✅ PUT requests
- ✅ PATCH requests
- ✅ DELETE requests
- ✅ OPTIONS requests
- ✅ HEAD requests

#### 2. Route Parameters (2 tests)
- ✅ Single parameter (`:id`)
- ✅ Multiple parameters (`:postId/:commentId`)

#### 3. Query Parameters (1 test)
- ✅ Query string parsing (`?q=test&limit=10`)

#### 4. Request Body (1 test)
- ✅ JSON body parsing

#### 5. Response Methods (5 tests)
- ✅ `res.json()`
- ✅ `res.send()`
- ✅ `res.status()`
- ✅ `res.redirect()`
- ✅ `res.sendStatus()`

#### 6. Middleware (2 tests)
- ✅ Global middleware
- ✅ Route-level middleware

#### 7. Route Grouping (2 tests)
- ✅ Single-level grouping (`/api`)
- ✅ Nested grouping (`/api/v1`)

#### 8. Error Handling (2 tests)
- ✅ Synchronous errors
- ✅ Asynchronous errors

#### 9. CORS Plugin (1 test)
- ✅ CORS headers

#### 10. Parallel Handlers (1 test)
- ✅ Concurrent data fetching

#### 11. Request Properties (1 test)
- ✅ `req.protocol`, `req.ip`, `req.hostname`

#### 12. Wildcard Routes (1 test)
- ✅ Wildcard matching (`/files/*`)

#### 13. 404 Handling (1 test)
- ✅ Non-existent routes

## Test Output

### Success Output
```
╔════════════════════════════════════════════════════════╗
║         NeoAPI v0.0.1-preview Test Suite              ║
╚════════════════════════════════════════════════════════╝

📍 Testing Basic Routing...
📍 Testing Route Parameters...
📍 Testing Query Parameters...
...

═══════════════════════════════════════════════════════
                    TEST RESULTS
═══════════════════════════════════════════════════════

✅ GET /test returns 200
✅ GET /test returns correct body
✅ POST /test returns 200
...

═══════════════════════════════════════════════════════

✅ Passed: 27
❌ Failed: 0
📊 Total:  27
🎯 Success Rate: 100.00%

🎉 ALL TESTS PASSED! Ready to ship v0.0.1-preview! 🚀
```

### Failure Output
```
❌ GET /test returns 200
✅ POST /test returns 200
...

⚠️  Some tests failed. Please review before shipping.
```

## Test Architecture

### Test Utilities

```javascript
// Assert helper
assert(condition, message)

// HTTP request helper
makeRequest(options)
```

### Adding New Tests

1. Add route to the test server
2. Add test case in the appropriate category
3. Use `assert()` to validate behavior
4. Update test count in this README

Example:
```javascript
// Add route
app.get('/new-feature', (req, res) => {
    res.json({ feature: 'works' });
});

// Add test
const testN = await makeRequest({
    hostname: 'localhost',
    port: PORT,
    path: '/new-feature',
    method: 'GET'
});
assert(testN.statusCode === 200, 'New feature works');
```

## Continuous Integration

### GitHub Actions (example)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [14.x, 16.x, 18.x, 20.x]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm install
      - run: npm test
```

## Pre-Release Testing

Before releasing, run:

```bash
# 1. Validate package
npm run validate

# 2. Run tests
npm test

# 3. Run benchmarks
npm run benchmark

# 4. Full pre-release check
npm run prerelease
```

## Troubleshooting

### Port Already in Use

If port 9876 is in use:
```bash
# Find and kill the process
lsof -ti:9876 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :9876   # Windows
```

### Tests Timeout

Increase timeout in test file:
```javascript
// Add timeout to makeRequest
setTimeout(() => reject(new Error('Timeout')), 5000);
```

### Module Not Found

Ensure dependencies are installed:
```bash
npm install
```

## Coverage (Future)

To add coverage reporting:

```bash
npm install --save-dev nyc
```

Update package.json:
```json
{
  "scripts": {
    "test:coverage": "nyc npm test"
  }
}
```

## Performance Testing

For performance regression testing:

```bash
npm run benchmark
```

Compare results with previous versions to ensure no performance degradation.

---

**Last Updated:** 2025-11-03  
**Test Count:** 27  
**Success Rate Target:** 100%

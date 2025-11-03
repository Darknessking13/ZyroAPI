// test/test-suite.js - Comprehensive NeoAPI Test Suite
const { NeoAPI } = require('../lib/neoapi');
const http = require('http');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;
const results = [];

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        results.push({ status: '✅', message });
        return true;
    } else {
        testsFailed++;
        results.push({ status: '❌', message });
        return false;
    }
}

async function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         NeoAPI v0.0.1-preview Test Suite              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const app = new NeoAPI({ verbose: false });
    const PORT = 9876;
    
    // Validate app instance
    if (!app || typeof app.get !== 'function') {
        throw new Error('Failed to create NeoAPI instance');
    }
    if (typeof app.options !== 'function') {
        throw new Error('app.options method is not defined. Check NeoAPI class definition.');
    }

    // ============================================================
    // TEST CATEGORY 1: Basic Routing
    // ============================================================
    console.log('📍 Testing Basic Routing...');

    app.get('/test', (req, res) => {
        res.json({ message: 'GET works' });
    });

    app.post('/test', (req, res) => {
        res.json({ message: 'POST works' });
    });

    app.put('/test', (req, res) => {
        res.json({ message: 'PUT works' });
    });

    app.patch('/test', (req, res) => {
        res.json({ message: 'PATCH works' });
    });

    app.delete('/test', (req, res) => {
        res.json({ message: 'DELETE works' });
    });

    app.options('/test', (req, res) => {
        res.json({ message: 'OPTIONS works' });
    });

    app.head('/test', (req, res) => {
        res.sendStatus(200);
    });

    // ============================================================
    // TEST CATEGORY 2: Route Parameters
    // ============================================================
    console.log('📍 Testing Route Parameters...');

    app.get('/users/:id', (req, res) => {
        res.json({ userId: req.params.id });
    });

    app.get('/posts/:postId/comments/:commentId', (req, res) => {
        res.json({
            postId: req.params.postId,
            commentId: req.params.commentId
        });
    });

    // ============================================================
    // TEST CATEGORY 3: Query Parameters
    // ============================================================
    console.log('📍 Testing Query Parameters...');

    app.get('/search', (req, res) => {
        res.json({ query: req.query });
    });

    // ============================================================
    // TEST CATEGORY 4: Request Body (JSON)
    // ============================================================
    console.log('📍 Testing Request Body Parsing...');

    app.plug(NeoAPI.jsonParser);

    app.post('/data', (req, res) => {
        res.json({ received: req.body });
    });

    // ============================================================
    // TEST CATEGORY 5: Response Methods
    // ============================================================
    console.log('📍 Testing Response Methods...');

    app.get('/response/json', (req, res) => {
        res.json({ type: 'json' });
    });

    app.get('/response/send', (req, res) => {
        res.send('plain text');
    });

    app.get('/response/status', (req, res) => {
        res.status(201).json({ created: true });
    });

    app.get('/response/redirect', (req, res) => {
        res.redirect('/test');
    });

    app.get('/response/sendStatus', (req, res) => {
        res.sendStatus(204);
    });

    // ============================================================
    // TEST CATEGORY 6: Middleware
    // ============================================================
    console.log('📍 Testing Middleware...');

    let middlewareExecuted = false;
    app.attach((req, res, next) => {
        req.customProp = 'middleware-value';
        middlewareExecuted = true;
        next();
    });

    app.get('/middleware-test', (req, res) => {
        res.json({ customProp: req.customProp });
    });

    // Route-level middleware
    const routeMiddleware = (req, res, next) => {
        req.routeMiddleware = true;
        next();
    };

    app.get('/route-middleware', routeMiddleware, (req, res) => {
        res.json({ routeMiddleware: req.routeMiddleware });
    });

    // ============================================================
    // TEST CATEGORY 7: Route Grouping
    // ============================================================
    console.log('📍 Testing Route Grouping...');

    app.group('/api', (api) => {
        api.get('/users', (req, res) => {
            res.json({ route: '/api/users' });
        });

        api.group('/v1', (v1) => {
            v1.get('/posts', (req, res) => {
                res.json({ route: '/api/v1/posts' });
            });
        });
    });

    // ============================================================
    // TEST CATEGORY 8: Error Handling
    // ============================================================
    console.log('📍 Testing Error Handling...');

    app.get('/error-sync', (req, res) => {
        throw new Error('Sync error');
    });

    app.get('/error-async', async (req, res) => {
        throw new Error('Async error');
    });

    app.error((err, req, res) => {
        res.status(err.statusCode || 500).json({
            error: err.message,
            code: err.code
        });
    });

    // ============================================================
    // TEST CATEGORY 9: CORS Plugin
    // ============================================================
    console.log('📍 Testing CORS Plugin...');

    app.plug(NeoAPI.cors, { origin: 'http://localhost:3000' });

    app.get('/cors-test', (req, res) => {
        res.json({ cors: 'enabled' });
    });

    // ============================================================
    // TEST CATEGORY 10: Parallel Handlers
    // ============================================================
    console.log('📍 Testing Parallel Handlers...');

    async function fetchUser(req) {
        return { user: { id: 1, name: 'John' } };
    }

    async function fetchPosts(req) {
        return { posts: [{ id: 1, title: 'Post 1' }] };
    }

    app.get('/parallel', app.parallel([fetchUser, fetchPosts]));

    // ============================================================
    // TEST CATEGORY 11: Request Properties
    // ============================================================
    console.log('📍 Testing Request Properties...');

    app.get('/request-props', (req, res) => {
        res.json({
            protocol: req.protocol,
            secure: req.secure,
            ip: req.ip,
            hostname: req.hostname
        });
    });

    // ============================================================
    // TEST CATEGORY 12: Wildcard Routes
    // ============================================================
    console.log('📍 Testing Wildcard Routes...');

    app.get('/files/*', (req, res) => {
        res.json({ path: req.params['*'] });
    });

    // ============================================================
    // Start Server and Run Tests
    // ============================================================
    const server = app.launch(PORT, async () => {
        console.log(`\n🚀 Test server started on port ${PORT}\n`);
        console.log('═══════════════════════════════════════════════════════\n');

        try {
            // Test 1: GET request
            const test1 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'GET'
            });
            assert(test1.statusCode === 200, 'GET /test returns 200');
            assert(JSON.parse(test1.body).message === 'GET works', 'GET /test returns correct body');

            // Test 2: POST request
            const test2 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'POST'
            });
            assert(test2.statusCode === 200, 'POST /test returns 200');
            assert(JSON.parse(test2.body).message === 'POST works', 'POST /test returns correct body');

            // Test 3: PUT request
            const test3 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'PUT'
            });
            assert(test3.statusCode === 200, 'PUT /test returns 200');

            // Test 4: PATCH request
            const test4 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'PATCH'
            });
            assert(test4.statusCode === 200, 'PATCH /test returns 200');

            // Test 5: DELETE request
            const test5 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'DELETE'
            });
            assert(test5.statusCode === 200, 'DELETE /test returns 200');

            // Test 6: OPTIONS request
            const test6 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'OPTIONS'
            });
            assert(test6.statusCode === 200, 'OPTIONS /test returns 200');

            // Test 7: HEAD request
            const test7 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/test',
                method: 'HEAD'
            });
            assert(test7.statusCode === 200, 'HEAD /test returns 200');

            // Test 8: Route parameters
            const test8 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/users/123',
                method: 'GET'
            });
            assert(JSON.parse(test8.body).userId === '123', 'Route parameter :id works');

            // Test 9: Multiple route parameters
            const test9 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/posts/456/comments/789',
                method: 'GET'
            });
            const test9Body = JSON.parse(test9.body);
            assert(test9Body.postId === '456' && test9Body.commentId === '789', 'Multiple route parameters work');

            // Test 10: Query parameters
            const test10 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/search?q=test&limit=10',
                method: 'GET'
            });
            const test10Body = JSON.parse(test10.body);
            assert(test10Body.query.q === 'test' && test10Body.query.limit === '10', 'Query parameters work');

            // Test 11: JSON body parsing
            const test11 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/data',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'John', age: 30 })
            });
            const test11Body = JSON.parse(test11.body);
            assert(test11Body.received.name === 'John', 'JSON body parsing works');

            // Test 12: res.json()
            const test12 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/response/json',
                method: 'GET'
            });
            assert(test12.headers['content-type'].includes('application/json'), 'res.json() sets correct content-type');

            // Test 13: res.send()
            const test13 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/response/send',
                method: 'GET'
            });
            assert(test13.body === 'plain text', 'res.send() works with plain text');

            // Test 14: res.status()
            const test14 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/response/status',
                method: 'GET'
            });
            assert(test14.statusCode === 201, 'res.status() sets correct status code');

            // Test 15: res.redirect()
            const test15 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/response/redirect',
                method: 'GET'
            });
            assert(test15.statusCode === 302, 'res.redirect() returns 302');
            assert(test15.headers.location === '/test', 'res.redirect() sets Location header');

            // Test 16: res.sendStatus()
            const test16 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/response/sendStatus',
                method: 'GET'
            });
            assert(test16.statusCode === 204, 'res.sendStatus() works');

            // Test 17: Global middleware
            const test17 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/middleware-test',
                method: 'GET'
            });
            assert(JSON.parse(test17.body).customProp === 'middleware-value', 'Global middleware works');

            // Test 18: Route-level middleware
            const test18 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/route-middleware',
                method: 'GET'
            });
            assert(JSON.parse(test18.body).routeMiddleware === true, 'Route-level middleware works');

            // Test 19: Route grouping
            const test19 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/api/users',
                method: 'GET'
            });
            assert(JSON.parse(test19.body).route === '/api/users', 'Route grouping works');

            // Test 20: Nested route grouping
            const test20 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/api/v1/posts',
                method: 'GET'
            });
            assert(JSON.parse(test20.body).route === '/api/v1/posts', 'Nested route grouping works');

            // Test 21: Sync error handling
            const test21 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/error-sync',
                method: 'GET'
            });
            assert(test21.statusCode === 500, 'Sync error handling returns 500');
            assert(JSON.parse(test21.body).error === 'Sync error', 'Sync error message is correct');

            // Test 22: Async error handling
            const test22 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/error-async',
                method: 'GET'
            });
            assert(test22.statusCode === 500, 'Async error handling returns 500');
            assert(JSON.parse(test22.body).error === 'Async error', 'Async error message is correct');

            // Test 23: CORS headers
            const test23 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/cors-test',
                method: 'GET',
                headers: { 'Origin': 'http://localhost:3000' }
            });
            assert(test23.headers['access-control-allow-origin'] === 'http://localhost:3000', 'CORS plugin sets correct headers');

            // Test 24: Parallel handlers
            const test24 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/parallel',
                method: 'GET'
            });
            const test24Body = JSON.parse(test24.body);
            assert(test24Body.user && test24Body.posts, 'Parallel handlers merge results');

            // Test 25: Request properties
            const test25 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/request-props',
                method: 'GET'
            });
            const test25Body = JSON.parse(test25.body);
            assert(test25Body.protocol === 'http', 'req.protocol works');
            assert(test25Body.ip !== undefined, 'req.ip works');

            // Test 26: Wildcard routes
            const test26 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/files/documents/report.pdf',
                method: 'GET'
            });
            assert(JSON.parse(test26.body).path === 'documents/report.pdf', 'Wildcard routes work');

            // Test 27: 404 handling
            const test27 = await makeRequest({
                hostname: 'localhost',
                port: PORT,
                path: '/nonexistent',
                method: 'GET'
            });
            assert(test27.statusCode === 404, '404 handling works');

        } catch (error) {
            console.error('❌ Test execution error:', error);
            testsFailed++;
        }

        // ============================================================
        // Print Results
        // ============================================================
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('                    TEST RESULTS');
        console.log('═══════════════════════════════════════════════════════\n');

        results.forEach(result => {
            console.log(`${result.status} ${result.message}`);
        });

        console.log('\n═══════════════════════════════════════════════════════');
        console.log(`\n✅ Passed: ${testsPassed}`);
        console.log(`❌ Failed: ${testsFailed}`);
        console.log(`📊 Total:  ${testsPassed + testsFailed}`);
        console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%\n`);

        if (testsFailed === 0) {
            console.log('🎉 ALL TESTS PASSED! \n');
        } else {
            console.log('⚠️  Some tests failed. Please review before shipping.\n');
        }

        console.log('═══════════════════════════════════════════════════════\n');

        server.close();
        process.exit(testsFailed > 0 ? 1 : 0);
    });
}

// Run the test suite
runTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});

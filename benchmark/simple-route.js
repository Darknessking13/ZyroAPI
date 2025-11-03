// benchmark/simple-route.js - Performance benchmark for NeoAPI
const autocannon = require('autocannon');
const { NeoAPI } = require('../lib/neoapi');

// Create test server
const app = new NeoAPI({ verbose: false });

app.get('/', (req, res) => {
    res.json({ message: 'Benchmark server running' });
});

app.get('/test', (req, res) => {
    res.json({ message: 'Hello, World!', timestamp: Date.now() });
});

app.get('/params/:id', (req, res) => {
    res.json({ id: req.params.id, query: req.query });
});

const PORT = 3001;
const server = app.launch(PORT, () => {
    console.log(`\n🚀 Benchmark server running on port ${PORT}\n`);
    runBenchmarks();
});

async function runBenchmarks() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  NeoAPI Performance Benchmark');
    console.log('═══════════════════════════════════════════════════════\n');

    // Benchmark 1: Simple JSON response
    console.log('📊 Test 1: Simple JSON Response (/test)');
    console.log('───────────────────────────────────────────────────────');
    const result1 = await autocannon({
        url: `http://localhost:${PORT}/test`,
        connections: 100,
        duration: 10,
        pipelining: 1
    });
    printResults(result1);

    // Benchmark 2: Route with parameters
    console.log('\n📊 Test 2: Route with Parameters (/params/:id)');
    console.log('───────────────────────────────────────────────────────');
    const result2 = await autocannon({
        url: `http://localhost:${PORT}/params/12345?foo=bar&baz=qux`,
        connections: 100,
        duration: 10,
        pipelining: 1
    });
    printResults(result2);

    // Benchmark 3: High concurrency
    console.log('\n📊 Test 3: High Concurrency (500 connections)');
    console.log('───────────────────────────────────────────────────────');
    const result3 = await autocannon({
        url: `http://localhost:${PORT}/test`,
        connections: 500,
        duration: 10,
        pipelining: 1
    });
    printResults(result3);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Benchmark Complete!');
    console.log('═══════════════════════════════════════════════════════\n');

    server.close();
    process.exit(0);
}

function printResults(result) {
    console.log(`  Requests:      ${result.requests.total.toLocaleString()} total`);
    console.log(`  Throughput:    ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`  Req/sec:       ${result.requests.mean.toFixed(2)}`);
    console.log(`  Latency:       ${result.latency.mean.toFixed(2)} ms (avg)`);
    console.log(`                 ${result.latency.p50.toFixed(2)} ms (p50)`);
    console.log(`                 ${result.latency.p99.toFixed(2)} ms (p99)`);
    console.log(`  Errors:        ${result.errors}`);
}

// benchmark.js (Adds startup time logging and uses provided printResults)

const spawn = require('cross-spawn');
const path = require('path');
const autocannon = require('autocannon');
const pidusage = require('pidusage');
const chalk = require('chalk');
const fs = require('fs');

// --- Configuration ---
const servers = [
    {
        name: 'NeoAPI',
        // *** Ensure paths are correct relative to where benchmark.js is run ***
        file: './benchmark/neoapi-server.js', // Example: If benchmark.js is in root
        // file: '../server.js', // Example: If benchmark.js is in benchmark/ subdir
        port: 7863,
        readySignal: 'NEOAPI_READY',
    },
    {
        name: 'Fastify',
        file: './benchmark/fastify-server.js',
        port: 7861,
        readySignal: 'FASTIFY_READY',
    },
    {
        name: 'Express',
        file: './benchmark/express-server.js',
        port: 7862,
        readySignal: 'EXPRESS_READY',
    },
];

const autocannonOptions = {
    url: '', // Will be set per server
    connections: 100,
    pipelining: 10,
    duration: 40, // seconds
};

const MONITORING_INTERVAL = 500; // ms

// --- Helper Functions ---

/**
 * Formats bytes into MB.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0.00 MB'; // Handle null/undefined/zero
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * Prints benchmark results and resource usage in a custom format.
 * @param {string} serverName
 * @param {object} benchmarkResults - Results from autocannon.
 * @param {object} resourceResults - Object containing { cpuReadings: number[], memReadings: number[] }.
 */
function printResults(serverName, benchmarkResults, resourceResults) {
    const { cpuReadings = [], memReadings = [] } = resourceResults || {}; // Default to empty arrays if undefined

    // Calculate average and peak usage, handling empty arrays
    const avgCpu = cpuReadings.length > 0 ? (cpuReadings.reduce((a, b) => a + b, 0) / cpuReadings.length) : 0;
    const peakCpu = cpuReadings.length > 0 ? Math.max(...cpuReadings) : 0;
    const avgMem = memReadings.length > 0 ? (memReadings.reduce((a, b) => a + b, 0) / memReadings.length) : 0;
    const peakMem = memReadings.length > 0 ? Math.max(...memReadings) : 0;

    console.log(chalk.magentaBright(`\n📋 Results for ${chalk.bold(serverName)}:`));
    if (benchmarkResults) {
        console.log(`→ Requests/sec:     ${chalk.green(benchmarkResults.requests.average.toFixed(2))}`);
        console.log(`→ Latency (avg):    ${chalk.yellow(benchmarkResults.latency.average.toFixed(2))} ms`);
        console.log(`→ Throughput (avg): ${chalk.cyan(formatBytes(benchmarkResults.throughput.average))}/s`);
        if (benchmarkResults.errors > 0 || benchmarkResults.timeouts > 0) {
            console.log(chalk.red(`→ Errors:           ${benchmarkResults.errors}`));
            console.log(chalk.red(`→ Timeouts:         ${benchmarkResults.timeouts}`));
        }
    } else {
        console.log(chalk.red('→ Benchmark data unavailable (error occurred).'));
    }

    console.log(chalk.magentaBright('\n🧠 Resource Usage During Benchmark:'));
    if (cpuReadings.length > 0 || memReadings.length > 0) {
        console.log(`→ Avg CPU Usage:    ${chalk.yellow(avgCpu.toFixed(2))}%`);
        console.log(`→ Peak CPU Usage:   ${chalk.red(peakCpu.toFixed(2))}%`);
        console.log(`→ Avg Memory Usage: ${chalk.yellow(formatBytes(avgMem))}`);
        console.log(`→ Peak Memory Usage:${chalk.red(formatBytes(peakMem))}`);
        console.log(chalk.dim(`  (Based on ${cpuReadings.length} samples taken every ${MONITORING_INTERVAL}ms)`));
    } else {
        console.log(chalk.yellow('  Could not collect resource usage data.'));
    }
    console.log(chalk.magentaBright(`--- End Results ---\n`));
}


/**
 * Starts a server process and waits for its ready signal. Logs startup time.
 * @param {object} serverConfig
 * @returns {Promise<ChildProcess>}
 */
function startServer(serverConfig) {
    return new Promise((resolve, reject) => {
        const startTime = process.hrtime.bigint(); // Record start time
        console.log(chalk.blue(`\n🚀 Starting ${serverConfig.name} server... (File: ${path.resolve(serverConfig.file)})`));

        if (!fs.existsSync(serverConfig.file)) { /* ... file check ... */ return reject(new Error(`Server file not found: ${path.resolve(serverConfig.file)}`)); }

        const serverProcess = spawn('node', [serverConfig.file], { stdio: ['ignore', 'pipe', 'pipe'] });
        let output = ''; let errorOutput = ''; let resolved = false; let pid = serverProcess.pid;

        if (pid) { console.log(chalk.dim(`   Spawned ${serverConfig.name} with PID: ${pid}`)); }
        else { /* ... handle missing initial PID ... */ }

        serverProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
            // Uncomment below to see ALL server output (can be noisy)
            // process.stdout.write(chalk.gray(`[${serverConfig.name} OUT] ${chunk.trim()}\n`));
            output += chunk;
            if (!resolved && output.includes(serverConfig.readySignal)) {
                resolved = true;
                const endTime = process.hrtime.bigint();
                const startupTimeMs = Number((endTime - startTime) / 1000000n); // Convert nanoseconds to ms
                if (!pid && serverProcess.pid) pid = serverProcess.pid;
                 console.log(chalk.green(`✅ ${serverConfig.name} server ready signal received. PID: ${pid || 'N/A'}. `) + chalk.dim(`(Startup Time: ${startupTimeMs.toFixed(0)} ms)`)); // Log startup time
                setTimeout(() => resolve(serverProcess), 300);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            const chunk = data.toString(); // Convert buffer to string and assign to 'chunk'
            console.error(chalk.red(`[${serverConfig.name} ERR] ${chunk.trim()}`)); // Use the defined 'chunk'
            errorOutput += chunk; // Use the defined 'chunk'
        });
        
        serverProcess.on('error', (err) => { /* ... spawn error handling ... */ });
        serverProcess.on('exit', (code, signal) => { /* ... exit handling ... */ });

        const startupTimeout = setTimeout(() => { /* ... timeout handling ... */ }, 15000);
        const cleanup = () => clearTimeout(startupTimeout);
        serverProcess.on('exit', cleanup); serverProcess.on('error', cleanup);
    });
}

/**
 * Runs autocannon benchmark.
 * @param {string} url
 * @param {string} serverName
 * @returns {Promise<object>} Resolves with autocannon results. Rejects on error.
 */
function runAutocannon(url, serverName) {
    console.log(chalk.blue(`🔥 Running benchmark on ${chalk.bold(serverName)} (${url})... (Duration: ${autocannonOptions.duration}s)`));
    const options = { ...autocannonOptions, url };
    return new Promise((resolve, reject) => { // Reject on error now
        const instance = autocannon(options, (err, result) => {
            if (err) {
                console.error(chalk.red(`❌ Autocannon error for ${serverName}:`), err);
                reject(err); // REJECT here
            } else {
                console.log(chalk.blue(`📊 Benchmark finished for ${serverName}.`));
                resolve(result);
            }
        });
        autocannon.track(instance, { renderProgressBar: true });
        process.once('SIGINT', () => instance.stop());
    });
}

/**
 * Monitors CPU and Memory usage.
 * @param {number | null | undefined} pid
 * @param {number} durationSeconds
 * @returns {Promise<object>}
 */
function monitorResources(pid, durationSeconds) {
     if (!pid) { /* ... handle invalid PID ... */ return Promise.resolve({ cpuReadings: [], memReadings: [] }); }
     console.log(chalk.blue(`🔬 Starting resource monitoring for PID ${pid}...`));
     const cpuReadings = []; const memReadings = []; let intervalId;
     const monitorPromise = new Promise((resolve) => {
         intervalId = setInterval(async () => {
             try { const stats = await pidusage(pid); cpuReadings.push(stats.cpu); memReadings.push(stats.memory); }
             catch (err) { if (!err.message.toLowerCase().includes("process doesn't exist")) console.warn(chalk.yellow(`Pidusage warning: ${err.message}`)); }
         }, MONITORING_INTERVAL);
         setTimeout(() => { clearInterval(intervalId); console.log(chalk.blue(`🔬 Resource monitoring stopped for PID ${pid}.`)); resolve({ cpuReadings, memReadings }); }, (durationSeconds * 1000) + MONITORING_INTERVAL);
     });
     return monitorPromise;
}

// --- Main Execution Logic ---
async function runBenchmarks() {
    console.log(chalk.yellow('Starting Benchmark Suite (Will Manage Servers)...'));
    const allResults = {}; // Store results for final summary? (Optional)

    for (const serverConfig of servers) {
        let serverProcess = null;
        let pid = null;
        let benchmarkResults = null; // Store results here
        let resourceResults = { cpuReadings: [], memReadings: [] }; // Default structure

        try {
            serverProcess = await startServer(serverConfig);
            if (!serverProcess || !serverProcess.pid) { throw new Error(`Failed to get PID for ${serverConfig.name} after start.`); }
            pid = serverProcess.pid;

            const url = `http://localhost:${serverConfig.port}`;
            const monitorPromise = monitorResources(pid, autocannonOptions.duration);
            // IMPORTANT: Run benchmark AFTER monitoring starts but don't await monitor yet
            benchmarkResults = await runAutocannon(url, serverConfig.name);
            // Now wait for monitoring to complete
            resourceResults = await monitorPromise;

        } catch (error) {
            console.error(chalk.red(`\n❌ Benchmark run failed for ${serverConfig.name}: ${error.message}`));
            // benchmarkResults will remain null if autocannon failed
        } finally {
            // --- Print results regardless of benchmark success/failure ---
            // Pass null for benchmarkResults if it failed
            printResults(serverConfig.name, benchmarkResults, resourceResults);

            // --- Cleanup ---
            if (serverProcess && !serverProcess.killed) {
                console.log(chalk.blue(`🔪 Stopping ${serverConfig.name} server (PID: ${pid})...`));
                const killed = serverProcess.kill('SIGTERM');
                if (!killed) { console.warn(chalk.yellow(`⚠️ Failed SIGTERM for ${serverConfig.name}. Sending SIGKILL...`)); serverProcess.kill('SIGKILL'); }
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (pid) {
                 console.log(chalk.dim(`   Server process ${pid} already exited for ${serverConfig.name}.`))
            }
        }
         // Optional delay between different servers
         await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(chalk.greenBright('\n🏁 Benchmark Suite Finished!'));
}

// Run the main function
runBenchmarks().catch(err => {
    console.error(chalk.red('\n❌❌❌ Benchmark suite failed unexpectedly:'), err);
    process.exit(1);
});
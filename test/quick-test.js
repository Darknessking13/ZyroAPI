// Quick test to verify NeoAPI loads correctly
const { NeoAPI } = require('../lib/neoapi');

console.log('Testing NeoAPI instantiation...\n');

try {
    const app = new NeoAPI({ verbose: false });
    
    console.log('✅ NeoAPI instance created');
    console.log('✅ app.get exists:', typeof app.get === 'function');
    console.log('✅ app.post exists:', typeof app.post === 'function');
    console.log('✅ app.put exists:', typeof app.put === 'function');
    console.log('✅ app.patch exists:', typeof app.patch === 'function');
    console.log('✅ app.delete exists:', typeof app.delete === 'function');
    console.log('✅ app.options exists:', typeof app.options === 'function');
    console.log('✅ app.head exists:', typeof app.head === 'function');
    console.log('✅ app.group exists:', typeof app.group === 'function');
    console.log('✅ app.parallel exists:', typeof app.parallel === 'function');
    console.log('✅ app.plug exists:', typeof app.plug === 'function');
    console.log('✅ app.attach exists:', typeof app.attach === 'function');
    console.log('✅ app.error exists:', typeof app.error === 'function');
    console.log('✅ app.launch exists:', typeof app.launch === 'function');
    
    // Try defining a route
    app.get('/test', (req, res) => {
        res.json({ test: 'works' });
    });
    console.log('✅ Route definition works');
    
    app.options('/test', (req, res) => {
        res.json({ options: 'works' });
    });
    console.log('✅ OPTIONS route definition works');
    
    console.log('\n🎉 All basic checks passed!');
    process.exit(0);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
}

// neoapi-server.js
const { NeoAPI } = require('neoapi');
const { MultipartParserPlugin } = require("../plugins/@neoapi-multipart-parse")
const { serve } = require("../plugins/@neoapi-serve")

const app = new NeoAPI({ verbose: false });

const PORT = process.env.PORT || 7863;

app.get('/', (req, res) => {
  // Minimal work: set header and send small JSON
  res.setHeader('Content-Type', 'application/json');
  res.end('{"message":"pong"}'); // Use res.end for minimal overhead vs res.json
});

app.launch(PORT);

console.log('NEOAPI_READY'); 
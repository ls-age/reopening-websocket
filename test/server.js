const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 9000 });

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  ws.on('message', function incoming(message) {
    ws.send(message);
    console.log('received: %s', message);
  });
});

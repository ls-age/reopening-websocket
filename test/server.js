import { Server as WebSocketServer } from 'uws';

function startServer() {
  console.log('starting server...');
  const wss = new WebSocketServer({ port: 9000 });

  wss.on('connection', ws => {
    console.log('Client connected');

    // Restarts the server when receiving "close" after a delay
    // Otherwise the incoming message is sent back
    ws.on('message', message => {
      if (message === 'close') {
        wss.close();
        setTimeout(startServer, 500);
      } else {
        ws.send(message);
        console.log('received: %s', message);
      }
    });
  });
}

startServer();

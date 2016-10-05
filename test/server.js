import { Server as WebSocketServer } from 'uws';

const wss = new WebSocketServer({ port: 9000 });

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    ws.send(message);
    console.log('received: %s', message);
  });
});

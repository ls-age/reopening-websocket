/* global ReopeningWebSocket, sinon */
/* eslint-env mocha */

const TestUrl = 'ws://localhost:9000';

/** @test {ReopeningWebSocket} */
describe('ReopeningWebSocket', function() {
  after(function(done) {
    const ws = new WebSocket(TestUrl);
    ws.addEventListener('open', function() {
      ws.send('shutdown');
      done();
    });
  });

  it('must be used as class', function() {
    expect(function() {
      ReopeningWebSocket();
    }, 'to throw', TypeError);
  });

  describe('extends Standard WebSocket API', function() {
    context('should inherit', function() {
      let ws = new ReopeningWebSocket(TestUrl);

      it('methods', function() {
        expect(ws.close, 'to be defined');
        expect(ws.send, 'to be defined');
      });

      it('attributes', function() {
        expect(ws.binaryType, 'to be defined');
        expect(ws.bufferedAmount, 'to be defined');
        expect(ws.extensions, 'to be defined');
        expect(ws.onerror, 'to be defined');
        expect(ws.onmessage, 'to be defined');
        expect(ws.onopen, 'to be defined');
        expect(ws.protocol, 'to be defined');
        expect(ws.readyState, 'to be defined');
        expect(ws.url, 'to be defined');
      });

      it('constants', function() {
        expect(ReopeningWebSocket.CONNECTING, 'to be defined');
        expect(ReopeningWebSocket.OPEN, 'to be defined');
        expect(ReopeningWebSocket.CLOSING, 'to be defined');
        expect(ReopeningWebSocket.CLOSED, 'to be defined');
      });
    });

    context('should forward native events', function() {
      let ws;

      beforeEach(function() {
        ws = new ReopeningWebSocket(TestUrl);
      });

      afterEach(function() {
        ws.close();
      });

      it('open', function(done) {
        ws.addEventListener('open', function() {
          done();
        });
      });

      it('close', function(done) {
        let closed = false;
        ws.addEventListener('close', function() {
          if (!closed) {
            done();
            closed = true;
          }
        });
        ws.addEventListener('open', function() {
          ws._webSocket.close();
        });
      });

      it('message', function(done) {
        const message = 'Test';
        ws.addEventListener('message', function(e) {
          expect(e.data, 'to equal', message);
          done();
        });
        ws.addEventListener('open', function() {
          ws.send(message);
        });
      });
    });

    /** @test {ReopeningWebSocket#close} */
    describe('#close', function() {
      it('should pass arguments', function(done) {
        const ws = new ReopeningWebSocket(TestUrl);
        const listener = sinon.spy(ws._webSocket, 'close');
        const code = 4000;
        const reason = 'Unit testing';

        ws.addEventListener('close', function() {
          expect(listener.callCount, 'to equal', 1);
          expect(listener.calledWith(code, reason), 'to be true');
          done();
        });

        ws.close(code, reason);
      });
    });
  });

  describe('automatic reopening', function() {
    let ws;
    beforeEach(function(done) {
      ws = new ReopeningWebSocket(TestUrl);
      ws._webSocket.addEventListener('open', function() { done(); });
    });

    afterEach(function() {
      ws.close();
    });

    it('should dispatch reopenattempt event before trying to reopen', function(done) {
      ws.addEventListener('reopenattempt', function(e) {
        expect(e.detail, 'to be a number');
        expect(e.detail, 'to equal', ws.reopenAttempt);

        done();
      });
      ws.reopen();
    });

    it('should dispatch reopen event on reopen', function(done) {
      ws.addEventListener('reopen', function(e) {
        expect(e.detail, 'to be a number');
        expect(e.detail, 'to equal', ws.reopenAttempt);
        done();
      });

      ws._webSocket.close();
    });

    it('should try again if reopen is not possible', function(done) {
      ws.send('close');

      ws.addEventListener('reopen', function(e) {
        expect(e.detail, 'to be greater than', 1);
        expect(ws.reopenAttempt, 'to be greater than', 1);
        done();
      });
    });

    it('should not be enabled if #close was called before', function(done) {
      ws.addEventListener('reopenattempt', function() {
        throw new Error('fail');
      });
      ws.close();

      setTimeout(done, 50);
    });

    it('should be re-enabled when calling #reopen', function(done) {
      let closed = true;
      ws.addEventListener('reopenattempt', function() {
        expect(closed, 'to be false');
        expect(ws._reopeningEnabled, 'to be true');
        done();
      });

      ws.close();
      setTimeout(function() {
        closed = false;
        ws.reopen();
      }, 50);
    });
  });

  describe('EventTarget', function() {
    /** @test {ReopeningWebSocket#addEventListener} */
    describe('#addEventListener', function() {
      it('should accept option "once"', function(done) {
        const ws = new ReopeningWebSocket(TestUrl);
        const reopenListener = sinon.spy();
        const attemptListener = sinon.spy();

        ws.addEventListener('reopen', reopenListener, { once: true });
        ws.addEventListener('reopenattempt', attemptListener, { once: true });

        // Force multiple reopens
        ws.addEventListener('open', function() {
          ws._webSocket.close();
        });

        setTimeout(function() {
          expect(reopenListener.callCount, 'to equal', 1);
          expect(attemptListener.callCount, 'to equal', 1);
          ws.close();
          done();
        }, 200);
      });
    });

    /** @test {ReopeningWebSocket#removeEventListener} */
    describe('#removeEventListener', function() {
      it('should work with WebSocket listeners', function(done) {
        const listener = sinon.spy();
        const ws = new ReopeningWebSocket(TestUrl);
        ws.addEventListener('open', listener);
        ws.removeEventListener('open', listener);

        ws.addEventListener('open', function() {
          expect(listener.callCount, 'to equal', 0);
          ws.close();
          done();
        });
      });

      context('should ignore', function() {
        const ws = new ReopeningWebSocket(TestUrl);

        // Clone listeners
        const old = { reopen: [], reopenattempt: [] };
        Object.assign(old.reopen, ws._listeners.reopen.map(l => Object.assign({}, l)));
        Object.assign(old.reopenattempt, ws._listeners.reopenattempt.map(l => Object.assign({}, l)));

        it('unknown event types', function() {
          ws.removeEventListener('unknown', function() {});
          expect(old, 'to equal', ws._listeners);
        });

        it('unknown listeners', function() {
          ws.removeEventListener('reopen', function() {});
          expect(old, 'to equal', ws._listeners);
        });
      });
    });

    /** @test {ReopeningWebSocket#dispatchEvent} */
    describe('#dispatchEvent', function() {
      it('should ignore unknown events', function() {
        const ws = new ReopeningWebSocket(TestUrl);
        function shallNotThrow() {
          ws.dispatchEvent(new CustomEvent('unknown'));
        }

        expect(shallNotThrow, 'not to throw');
      });
    });

    /** @test {ReopeningWebSocket#onreopen} */
    describe('on[event] properties', function() {
      it('should be called', function(done) {
        const ws = new ReopeningWebSocket(TestUrl);
        const openListener = sinon.spy();
        const attemptListener = sinon.spy();

        ws.onreopen = openListener;
        ws.onreopenattempt = attemptListener;

        ws.addEventListener('reopen', function() {
          expect(openListener.callCount, 'to equal', 1);
          expect(attemptListener.callCount, 'to equal', 1);
          ws.close();
          done();
        });

        ws._webSocket.addEventListener('open', function() {
          ws.reopen();
        });
      });

      context('of WebSocket API', function() {
        it('should be forwarded on reopen', function(done) {
          const ws = new ReopeningWebSocket(TestUrl);
          const oldWs = Object.assign({}, ws._webSocket);
          const listener = sinon.spy();
          ws.onopen = listener;

          ws.addEventListener('reopen', function() {
            expect(oldWs, 'not to equal', ws._webSocket);
            expect(ws.onopen, 'to equal', listener);
            ws.close();
            done();
          });

          ws._webSocket.addEventListener('open', function() {
            ws.reopen();
          });
        });
      });
    });
  });
});

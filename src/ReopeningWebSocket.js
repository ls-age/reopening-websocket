/** @external {WebSocket} https://developer.mozilla.org/en-US/docs/Web/API/WebSocket */
/** @external {EventTarget} https://developer.mozilla.org/en-US/docs/Web/API/EventTarget */
/** @external {EventListener} https://developer.mozilla.org/en-US/docs/Web/API/EventListener */

/**
 * @extends {WebSocket}
 * @implements {EventTarget}
 */
export default class ReopeningWebSocket {
  /**
   * Creates a new ReopeningWebSocket
   * @param {String} url The URL to connect to.
   * @param {String|String[]} [protocols] The protocol(s) to use.
   */
  constructor(url, protocols) {
    /**
     * How many times a reopen happened without success.
     * Reset to 0 the first time a reopen succeeds.
     * @type {Number}
     */
    this.reopenAttempt = 0;
    this._reopeningEnabled = true;

    this._webSocket = new WebSocket(url, protocols);
    this._wsListeners = {};
    this._listeners = {
      reopen: [],
      reopenattempt: [],
    };

    // Internal listeners

    this.addEventListener('open', () => this._opened());
    this.addEventListener('close', () => this._closed());

    // Listener shortcuts

    /**
     * An event listener to be called on reopen.
     * @type {EventListener}
     */
    this.onreopen = null;

    /**
     * An event listener to be called on each reopen attempt.
     * @type {EventListener}
     */
    this.onreopenattempt = null;
    this.addEventListener('reopen', e => {
      if (this.onreopen) { this.onreopen(e); }
    });
    this.addEventListener('reopenattempt', e => {
      if (this.onreopenattempt) { this.onreopenattempt(e); }
    });
  }

  // Reopening

  _opened() {
    if (this.reopenAttempt > 0) {
      this.dispatchEvent(new CustomEvent('reopen', { detail: this.reopenAttempt }));
      this.reopenAttempt = 0;
    }
  }

  _closed() {
    if (this._reopeningEnabled) {
      if (this.reopenAttempt === 0) {
        this.reopen();
      } else {
        setTimeout(() => this.reopen(), 100);
      }
    }
  }

  /**
   * Reopens the WebSocket connection.
   */
  reopen() {
    this.reopenAttempt++;
    this.dispatchEvent(new CustomEvent('reopenattempt', { detail: this.reopenAttempt }));

    const oldWs = this._webSocket;
    this._webSocket = new WebSocket(this._webSocket.url, this._webSocket.protocol || undefined);

    // Reattach listeners
    this._webSocket.onerror = oldWs.onerror;
    this._webSocket.onmessage = oldWs.onmessage;
    this._webSocket.onopen = oldWs.onopen;

    for (const type in this._wsListeners) {
      const listeners = this._wsListeners[type];

      for (let i = 0; i < listeners.length; i++) {
        const l = listeners[i];
        this._webSocket.addEventListener(type, l.listener, l.options);
      }
    }
  }

  // Implement EventTarget

  /**
   * Register an event handler of a specific type.
   * @param {String} type The event to listen for.
   * @param {EventListener} listener The function to call when the event occures.
   * @param {Boolean|Object} [options] Specifies characteristics of the listener.
   * @param {Boolean} [options.once] Only call the listener once.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   */
  addEventListener(type, listener, options) {
    let target;

    if (type in this._listeners) {
      target = this._listeners;
    } else {
      if (!this._wsListeners[type]) {
        this._wsListeners[type] = [];
      }
      target = this._wsListeners;
      this._webSocket.addEventListener(type, listener, options);
    }

    target[type].push({ listener, options });
  }

  /**
   * Removes an event listener registed with {@link ReopeningWebSocket#addEventListener}.
   * @param {String} type The event to listen for.
   * @param {EventListener} listener The function to call when the event occures.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
   */
  removeEventListener(type, listener) {
    let target;

    if (type in this._listeners) {
      target = this._listeners;
    } else if (this._wsListeners[type]) {
      target = this._wsListeners;
      this._webSocket.removeEventListener(type, listener);
    } else {
      return;
    }

    for (let i = 0; i < target[type].length; i++) {
      if (target[type][i].listener === listener) {
        target[type].splice(i, 1);
        return;
      }
    }

    // No listener found
  }

  /**
   * Dispatches an Event.
   * @param {Event} event The event to dispatch.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
   */
  dispatchEvent(event) {
    if (event.type in this._listeners) {
      const listeners = this._listeners[event.type];
      for (let i = 0; i < listeners.length; i++) {
        const l = listeners[i];
        l.listener.call(this, event);

        const options = l.options;
        if (options && options.once) {
          this.removeEventListener(event.type, l.listener);
        }
      }
    }
  }

  // Forward methods

  /**
   * Closes the WebSocket connection or connection attempt, if any.
   * @param {Number} [code=1000] A numeric value indicating why the connection is being closed.
   * @param {String} reason The human-readable reason why the connection is being closed.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket#close()
   */
  close(code, reason) {
    this._reopeningEnabled = false;
    return this._webSocket.close(code, reason);
  }

  /**
   * Transmits data to the server
   * @param {String|ArrayBuffer|Blob} data The data to transmit.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket#send()
   */
  send(data) {
    return this._webSocket.send(data);
  }
}

// Forward attributes

const forward = [
  'binaryType',
  'bufferedAmount',
  'extensions',
  'onerror',
  'onmessage',
  'onopen',
  'protocol',
  'readyState',
  'url',
];
for (let i = 0; i < forward.length; i++) {
  const key = forward[i];
  Object.defineProperty(ReopeningWebSocket.prototype, key, {
    get: function() { return this._webSocket[key]; },
    set: function(val) { this._webSocket[key] = val; },
  });
}

// Forward constants

ReopeningWebSocket.CONNECTING = WebSocket.CONNECTING;
ReopeningWebSocket.OPEN = WebSocket.OPEN;
ReopeningWebSocket.CLOSING = WebSocket.CLOSING;
ReopeningWebSocket.CLOSED = WebSocket.CLOSED;

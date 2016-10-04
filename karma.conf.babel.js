export default config => {
  config.set({
    frameworks: ['mocha', 'unexpected', 'sinon'],
    preprocessors: {
      'test/**/*.js': ['babel'],
      'out/ReopeningWebSocket.js': ['coverage'],
    },
    files: [
      'out/ReopeningWebSocket.js',
      'test/**/*.spec.*',
    ],
    browsers: ['Chrome'],
    reporters: ['dots', 'coverage'],
    client: {
      mocha: {
        reporter: 'html',
      },
    },
    coverageReporter: {
      type: 'html',
      dir: 'out/coverage/',
    },
  });
};

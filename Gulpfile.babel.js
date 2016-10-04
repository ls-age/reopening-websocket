import { watch as watchFiles } from 'gulp';
import { rollup } from 'rollup';
import buble from 'rollup-plugin-buble';

export function bundle() {
  return rollup({
    entry: 'src/ReopeningWebSocket.js',
    plugins: [buble()],
  }).then(result => {
    return result.write({
      format: 'iife',
      moduleName: 'ReopeningWebSocket',
      dest: 'out/ReopeningWebSocket.js',
      indent: true,
      sourceMap: true,
    });
  });
}

export function watch() {
  watchFiles('src/**/*.js', bundle);
}

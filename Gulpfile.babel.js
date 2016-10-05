import { src, dest, watch as watchFiles, series, parallel } from 'gulp';
import rollup from 'gulp-rollup-stream';
import babel from 'gulp-babel';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';

function createBundle(format, es5 = true) {
  const stream = src('src/ReopeningWebSocket.js')
    .pipe(rollup({ format, moduleName: 'ReopeningWebSocket' }));

  if (es5) {
    stream.pipe(babel({
      presets: [
        ['es2015', { loose: true }],
      ],
    }));
  }

  return stream;
}

function bundleTest() {
  return createBundle('iife')
    .pipe(dest('out/test'));
}

function bundleUMD() {
  return createBundle('umd')
    .pipe(dest('out/debug'));
}

function bundleAMD() {
  return createBundle('amd')
    .pipe(rename({ suffix: '.amd' }))
    .pipe(dest('out/debug'));
}

function bundleCJS() {
  return createBundle('cjs')
    .pipe(rename({ suffix: '.cjs' }))
    .pipe(dest('out/debug'));
}

export const build = parallel(bundleTest, bundleUMD, bundleAMD, bundleCJS);

function minify() {
  return src('out/debug/**/*.js')
    .pipe(uglify({
      mangle: true,
      compress: {
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
      },
    }))
    .pipe(dest('out/dist'));
}

export const dist = series(build, minify);

export const watch = series(bundleTest, function watch() {
  watchFiles('src/**/*.js', bundleTest);
});

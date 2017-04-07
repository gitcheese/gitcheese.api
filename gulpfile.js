const gulp = require('gulp');
const gulpif = require('gulp-if');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const install = require('gulp-install');
const uglify = require('gulp-uglify');
const replace = require('gulp-token-replace');

gulp.task('default', () => {
  gulp.src([
    './api/**/*',
    './async-handlers/**/*',
    './local-packages/**/*',
    './cloudformation/**/*'
  ], {base: './'})
    .pipe(gulpif(/\.js$/, eslint()))
    .pipe(gulpif(/\.js$/, eslint.format()))
    .pipe(gulpif(/\.js$/, babel({presets: ['es2015']})))
    .pipe(gulpif(/\.js$/, uglify()))
    .pipe(gulpif(/\.js$/, uglify()))
    .pipe(gulpif(/^cloudformation\//, replace({ global: process.env })))
    .pipe(gulp.dest('./dist'))
    .pipe(gulpif(/package\.json$/, install()));
});

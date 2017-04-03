const gulp = require('gulp');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const install = require('gulp-install');
const uglify = require('gulp-uglify');
const replace = require('gulp-token-replace');
gulp.task('default', ['build-local-packages', 'build-async-handlers'], () => {
  gulp.src('api/**/package.json')
    .pipe(gulp.dest('dist/api'))
    .pipe(install());
  gulp.src(['api/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/api/'));
  gulp.src('cloudformation/**/*')
    .pipe(replace({ global: process.env }))
    .pipe(gulp.dest('dist/cloudformation'));
});
gulp.task('build-local-packages', () => {
  gulp.src('local-packages/**/package.json')
    .pipe(gulp.dest('dist/local-packages'))
    .pipe(install());
  gulp.src(['local-packages/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/local-packages/'));
  gulp.src(['local-packages/**/*.hbs', '!node_modules/**'])
    .pipe(gulp.dest('dist/local-packages/'));
});
gulp.task('build-async-handlers', () => {
  gulp.src('async-handlers/**/package.json')
    .pipe(gulp.dest('dist/async-handlers'))
    .pipe(install());
  gulp.src(['async-handlers/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/async-handlers/'));
});

const gulp = require('gulp');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const install = require('gulp-install');
const uglify = require('gulp-uglify');
const replace = require('gulp-token-replace');
gulp.task('default', () => {
  gulp.src('./api/**/package.json')
    .pipe(gulp.dest('dist/api'))
    .pipe(install());
  gulp.src(['./api/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/api'));
  gulp.src('cloudformation/**/*')
    .pipe(replace({ global: process.env }))
    .pipe(gulp.dest('dist/cloudformation'));
});

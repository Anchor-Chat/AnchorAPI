const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');

const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const babel = require('gulp-babel');

gulp.task('browserify', () => {
	return browserify({
		entries: ['./src/index.js'],
		debug: true
	}).transform([
		babelify
	]).bundle()
		.pipe(source('bundle.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(babel())
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('./dist'));
});
var gulp = require('gulp');
var babel = require('gulp-babel');
var nodemon = require('nodemon');
var Cache = require('gulp-file-cache');
var sourcemaps = require('gulp-sourcemaps');
var path = require('path');
var exec = require('child_process').exec;

// Configuration
var files = {
	cache: 		path.join(__dirname, '.gulp-cache'),
	src: {
		dir: 	path.join(__dirname, 'src'),
		js: 	path.join(__dirname, 'src/**/*.js')
	},
	build: {
		dir: 	path.join(__dirname, 'build'),
		js: 	path.join(__dirname, 'build/**/*.js'),
		entry: 	path.join(__dirname, 'build/main.js')
	}
};
var cache = new Cache();

// Taches Gulp
gulp.task('clean', () => {
	if(files.cache || files.build.dir) { exec('rm -fr '+files.cache+' '+files.build.dir); }
	else { throw new Error('Can not execute rm -fr with empty arguments'); }
});
gulp.task('build', () =>
  gulp.src(files.src.js)
	.pipe(sourcemaps.init())
	.pipe(cache.filter())
	.pipe(babel({ 
		presets: [
            ['env', {
                'targets': {
                    'node': 'current'
                }
            }]
        ], 
		plugins: [
            ['transform-class-properties', { 'spec': true }],
            'transform-decorators-legacy',
            'transform-do-expressions',
            'transform-function-bind',
            'transform-object-rest-spread',
            'transform-flow-strip-types',
            /*['transform-runtime', {
                'polyfill': true,
                'regenerator': true
            }],
            'transform-regenerator',
            'transform-decorators-legacy',
            'syntax-async-functions',
            'transform-async-to-generator'*/
		]
	}))
	.pipe(cache.cache())
	.pipe(sourcemaps.write('.', { sourceRoot: files.src.dir }))
	.pipe(gulp.dest(files.build.dir))
);
gulp.task('rebuild', ['clean', 'build']);
gulp.task('watch', () => gulp.watch(files.src.js, ['build']) );

gulp.task('run', ['build', 'watch']);/*, function() {
	nodemon({
		script: files.build.entry,
		watch: [files.build.js],
        ext: 'js',
        delay: 1000
	})
	.on('restart', () => console.log('Restarted!') )
	.on('start', () => console.log('Started!') )
	.on('change', () => console.log('Changed!') )
});*/

gulp.task('default', ['rebuild']);
 

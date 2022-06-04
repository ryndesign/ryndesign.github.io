"use strict";

var gulp = require('gulp');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var gutil = require('gulp-util');
var pump = require('pump');
var cssnano = require('cssnano');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var del = require('del');
var runSequence = require('run-sequence');
var pngquant = require('imagemin-pngquant');
var imageminJpegoptim = require('imagemin-jpegoptim');
var htmlmin = require('gulp-htmlmin');
var imageminJpegRecompress = require('imagemin-jpeg-recompress');
var sass = require("gulp-sass");
var hash_src = require("gulp-hash-src");
var browserSync = require('browser-sync').create();
var os = require('os');
var pump = require('pump');
var checkPages = require("check-pages");


//--------------------------- LOCATE USER -----------------------//

var whosThis;
var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
            whosThis = addresses[0];
        }
    }
}


//--------------------------- EXAMPLE GULP TASK -----------------------//

//** BASIC **//
// gulp.task('hello',function(){
//   console.log('Hello Beau');
// })


//** COMMON **//
//gulp.task('task-name', function () {
//  return gulp.src('source-files') // Get source files with gulp.src
//    .pipe(aGulpPlugin()) // Sends it through a gulp plugin
//    .pipe(gulp.dest('destination')) // Outputs the file in the destination folder
//})


//** CONCATENATION **//
gulp.task('concat', function(){
  var processors = [
    autoprefixer({browsers:['last 2 versions']}),
    cssnano({reduceIdents: false}),
  ];
  return gulp.src(['app/**/*.php','!app/inc/**'])

   .pipe(useref())
   .pipe(gulpIf('*.js', uglify()))
   .pipe(gulpIf('*.css', postcss(processors)))
   .pipe(gulp.dest('dist'))
});


//** MINIFY AND CACHE BUST **//
gulp.task('minify', function() {
  return gulp.src(['dist/**/*.php','!dist/inc/**'])
  .pipe(htmlmin({collapseWhitespace: true}))
  .pipe(hash_src({build_dir: "dist", src_path: "app"}))
  .pipe(gulp.dest('dist/'))
})


//** FIND MY LAN IP **//
gulp.task('lan',function(){
  var interfaces = os.networkInterfaces();
  var addresses = [];
  for (var k in interfaces) {
      for (var k2 in interfaces[k]) {
          var address = interfaces[k][k2];
          if (address.family === 'IPv4' && !address.internal) {
              addresses.push(address.address);
              whosThis = addresses[0];
          }
      }
  }
  console.log(whosThis);
});


//** MOVE AND COMPILE SASS FILES **//
gulp.task('sass', function() {
    return gulp.src('app/scss/**/*.scss')
        .pipe(sass({includePaths: ['app/scss/base','app/scss/components']}).on('error', sass.logError))
        .pipe(gulp.dest('app/css/'))
        .pipe(browserSync.stream());
});


//** WATCH SASS FILES **//
gulp.task('sass:watch',function() {
  gulp.watch('app/scss/**/*.scss',['sass']);
});


//** MOVE FONTS **//
gulp.task('fonts', function() {
  return gulp.src('app/fonts/**/*')
  .pipe(gulp.dest('dist/fonts'))
})


//** MOVE HTML **//
gulp.task('html', function() {
  return gulp.src('app/**/*.html')
  .pipe(htmlmin({collapseWhitespace: true}))
  .pipe(gulp.dest('dist/'))
})


//** MOVE PHP INCLUDES **//
gulp.task('phpincludes', function() {
  return gulp.src('app/inc/**/*.php')
  .pipe(gulp.dest('dist/inc'))
})


//** MOVE IMAGES **//
gulp.task('images', function() {
  return gulp.src('app/images/**/*.+(png|jpg|gif|svg|ico)')
  .pipe(gulp.dest('dist/images'))
})


//** OPTIMIZE IMAGES **//
gulp.task('optImages', function(){
	return gulp.src('app/images/**/*.+(png|jpg|gif|svg|ico)')
	.pipe(imagemin([
        imagemin.gifsicle(),
        imageminJpegRecompress({ quality: 'low' }),
        pngquant({quality: '25-35', speed: 4}),
        imagemin.svgo()
  ]))
	.pipe(gulp.dest('dist/images'))
})

//** CACHE BUSTER **//
gulp.task('cacheBuster', function (){
  return gulp.src("app/**/*.html")
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(hash_src({build_dir: "dist", src_path: "app"}))
    .pipe(gulp.dest("dist"))
});


//** CLEAR DIST FOLDER **//
gulp.task('clean:dist', function(){
	return del.sync('dist');
})


//** CLEAR IMAGES FOLDER **//
gulp.task('clean:images', function(){
  return del.sync('dist/images');
})


//** GERNERATE SERVICE WORKER **//
gulp.task('generate-service-worker', function(callback) {
  var path = require('path');
  var swPrecache = require('sw-precache');
  var rootDir = 'app';

  swPrecache.write(path.join(rootDir, 'sw.js'), {
    staticFileGlobs: [rootDir + '/**/*.{js,html,css,png,jpg,gif}'],
    stripPrefix: rootDir
  }, callback);
});


//** BUILD DISTRIBUTION FILES **//
gulp.task('build', function(callback){
  runSequence('clean:dist', 'html', ['fonts','concat'],'phpincludes','images',['minify'] , callback)
})

//** BROWSER SYNC **//
gulp.task('sync', function() {
  var whosThis;
  var interfaces = os.networkInterfaces();
  var addresses = [];
  for (var k in interfaces) {
      for (var k2 in interfaces[k]) {
          var address = interfaces[k][k2];
          if (address.family === 'IPv4' && !address.internal) {
              addresses.push(address.address);
              whosThis = addresses[0];
          }
      }
  }

  var files = ["app/**/*.php","app/**/*.js"];
  var ignore = ["app/inc/**","app/admin/**","app/admin1/**","app/class_generator/**"];
  var proxy = "default.local";

  if(whosThis == '192.168.10.124'){
    //BEAU'S COMPUTER
    browserSync.init({
      proxy: proxy,
      files: files,
      ignore: ignore
    });
  } else if(whosThis == '192.168.10.118'){
    //RYAN'S COMPUTER
    browserSync.init({
      proxy: proxy,
      files: files,
      ignore: ignore
    });
  } else if(whosThis == '192.168.10.129'){
    //HUBERT'S COMPUTER
    browserSync.init({
      proxy: proxy,
      files: files,
      ignore: ignore
    });
  } else if(whosThis == '192.168.10.120'){
    //JUSTIN'S COMPUTER
    browserSync.init({
      proxy: proxy,
      files: files,
      ignore: ignore
    });
  }
  gulp.watch('app/scss/**/*.scss',['sass']);
  
});

//** RUN ALL TASKS **//
gulp.task('all', function(callback){
  runSequence('build', 'optImages', callback)
})







//------------------------- DEBUGGING TASKS -----------------------//


gulp.task('uglify-error-debugging', function (cb) {
  pump([
    gulp.src('app/js/**/*'),
    uglify(),
    gulp.dest('./dist/')
  ], cb);
});


gulp.task("checkDev", function(callback) {
  var options = {
    pageUrls: [
      'http://project.localhost/'
    ],
    checkLinks: true,
    summary: true
  };
  checkPages(console, options, callback);
});


gulp.task("checkProd", function(callback) {
  var options = {
    pageUrls: [
      'http://www.example.ca/'
    ],
    checkLinks: true,
    summary: true,
    linksToIgnore: [
      'https://www.example.ca/xmlrpc.php',
      'http://www.example.ca/xmlrpc.php',
      'https://example.ca/xmlrpc.php',
    ],
    // noEmptyFragments: true,
    // noLocalLinks: true,
    // noRedirects: true,
    // onlySameDomain: true,
    // preferSecure: true,
    // queryHashes: true,gulp
    // checkCaching: true,
    // checkCompression: true,
    // checkXhtml: true,
    // terse: true,
    // maxResponseTime: 200,
    // userAgent: 'custom-user-agent/1.2.3'
  };
  checkPages(console, options, callback);
});



//--------------------------- ADDITIONAL TASKS NOT BEING USED -----------------------//


//** NOT USING ** WATCH FILES **//
//gulp.task('watch', function(){
//  gulp.watch('app/css/*.css', ['css']);
  // Other watchers
//})


//** BUILD DISTRIBUTION FILES **//
// gulp.task('build', function(callback){
//   runSequence('clean:dist', 'html', ['css','fonts','js','php'],'phpincludes','images',['cacheBuster'], callback)
// })


//** NOT USING ** MOVE PHP **//
// gulp.task('php', function() {
//   return gulp.src(['app/**/*.php','!app/inc/**'])
//   .pipe(htmlmin({collapseWhitespace: true}))
//   .pipe(gulp.dest('dist/'))
// })


//** MINIFY AND MOVE JS **//
// gulp.task('js', function() {
//   return gulp.src('app/js/**/*')
//   .pipe(uglify())
//   .pipe(gulp.dest('dist/js'))
// })


// gulp.task('js', function(cb) {
//   pump([
//         gulp.src('app/js/**/*'),
//         uglify(),
//         gulp.dest('dist/js')
//     ],
//     cb
//   );
// })


//** NOT USING ** MINIFY, ADD VENDOR PREFIXES AND MOVE CSS **//
// gulp.task('css',function(){
// 	var processors = [
//         autoprefixer({browsers:['last 2 versions']}),
//         cssnano({reduceIdents: false}),
//     ];
// 	return gulp.src('app/css/*.css')
//     .pipe(postcss(processors))
// 		.pipe(gulp.dest('dist/css/'));
// })
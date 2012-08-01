/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
        '*/'
    },
    lint: {
      files: ['grunt.js', 'filestream.js']
    },
    qunit: {
      files: ['test/**/*.html']
    },
    concatWrap: {
      dist: {
        src: ['bundle.js', 'filestream.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    min: {
      dist: {
        src: ['<banner:meta.banner>', '<config:concatWrap.dist.dest>'],
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint qunit'
    },
    jshint: {
      options: {
        node: true,
        eqeqeq: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {
        exports: true,
        File: true,
        FileList: true,
        Blob: true
      }
    },
    uglify: {}
  });

  grunt.registerMultiTask('concatWrap', 'Concatenate files.', function() {
    var files = grunt.file.expandFiles(this.file.src);
    // Concat specified files.
    var src = grunt.helper('concat', files, {separator: this.data.separator});
    grunt.file.write( this.file.dest, '(function(){\n'+ src +'\n})();');

    // Fail task if errors were logged.
    if (this.errorCount) { return false; }

    // Otherwise, print a success message.
    grunt.log.writeln('File "' + this.file.dest + '" created.');
  });

  // Default task.
  grunt.registerTask('default', 'lint concatWrap min');

};

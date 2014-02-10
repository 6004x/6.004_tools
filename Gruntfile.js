module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';{}' // hack that 'works' for both JavaScript and CSS.
            }
        },
        clean: ['xblocks'],
        copy: {
            bsim: {src: 'bsim/bsim.html', dest: 'xblocks/bsim.html'},
            jsim: {src: ['jsim/jsim.html', 'jsim/*.png'], dest: 'xblocks/', flatten: true, expand: true},
            tmsim: {src: 'tmsim/tmsim.html', dest: 'xblocks/tmsim.html'},
            resources: {src: 'libs/*.png', dest: 'xblocks/', flatten: true, expand: true}
        },
        uglify: {
            options: {
                beautify: {
                    ascii_only: true, // This prevents us screwing up on servers that don't sent correct content headers.
                    beautify: false
                }
            }
        },
        useminPrepare: {
            bsim: 'bsim/bsim.html',
            jsim: 'jsim/jsim.html',
            tmsim: 'tmsim/tmsim.html',
            options: {
                dest: 'xblocks'
            }
        },
        usemin: {
            bsim: {
                src: 'xblocks/bsim.html',
                options: {type: 'html'}
            },
            jsim: {
                src: 'xblocks/jsim.html',
                options: {type: 'html'}
            },
            tmsim: {
                src: 'xblocks/tmsim.html',
                options: {type: 'html'}
            },
            options: {
                dirs: ['xblocks']
            }
        },
        connect: {
            server: {
                options: {
                    port: '?',
                    base: '.'
                }
            }
        },
        qunit: {
            all: {
                options: {
                    urls: [
                        'http://<%= connect.server.options.host %>:<%= connect.server.options.port %>/test/all.html'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('bsim', ['copy:resources', 'copy:bsim', 'useminPrepare:bsim', 'concat', 'uglify', 'cssmin', 'usemin:bsim'])
    grunt.registerTask('jsim', ['copy:resources', 'copy:jsim', 'useminPrepare:jsim', 'concat', 'uglify', 'cssmin', 'usemin:jsim'])
    grunt.registerTask('tmsim', ['copy:resources', 'copy:tmsim', 'useminPrepare:tmsim', 'concat', 'uglify', 'cssmin', 'usemin:tmsim'])
    grunt.registerTask('test', ['connect', 'qunit:all'])

    // Builds everything if just called as 'grunt'
    grunt.registerTask('default', ['copy', 'useminPrepare', 'concat', 'uglify', 'cssmin', 'usemin'])
}
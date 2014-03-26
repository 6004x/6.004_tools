module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';{}' // hack that 'works' for both JavaScript and CSS.
            }
        },
        copy: {
            bsim: {src: 'bsim/bsim.html', dest: 'build/bsim.html'},
            jsim: {src: ['jsim/jsim.html', 'jsim/*.png'], dest: 'build/', flatten: true, expand: true},
            tmsim: {src: 'tmsim/tmsim.html', dest: 'build/tmsim.html'},
            resources: {src: 'libs/*.png', dest: 'build/', flatten: true, expand: true},
            deploy: {src: 'build/*', dest: '../', flatten: true, expand: true },
            xblock: {src: 'build/*', dest: '../xblocks-6004x/mit6004/mit6004/public/', flatten: true, expand: true }
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
                dest: 'build'
            }
        },
        usemin: {
            bsim: {
                src: 'build/bsim.html',
                options: {type: 'html'}
            },
            jsim: {
                src: 'build/jsim.html',
                options: {type: 'html'}
            },
            tmsim: {
                src: 'build/tmsim.html',
                options: {type: 'html'}
            },
            options: {
                dirs: ['build']
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
    grunt.registerTask('deploy', ['copy:deploy'])
    grunt.registerTask('xblock', ['copy:xblock'])

    //grunt.registerTask('test', ['connect', 'qunit:all'])

    // Builds everything if just called as 'grunt'
    grunt.registerTask('default', ['bsim','jsim','tmsim'])
}

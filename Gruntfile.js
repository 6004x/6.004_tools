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

            bsim_edx: {src: 'bsim/bsim_edx.html', dest: 'build/bsim_edx.html'},
            bsim_edx_deploy: {src: 'build/bsim_edx*', dest: '../6.004_mitx/static/labs/', flatten: true, expand: true },

            bsim_6004: {src: 'bsim/bsim_6004.html', dest: 'build/bsim_6004.html'},
            bsim_6004_deploy: {src: ['build/bsim_6004*','build/glyphicons*'], dest: '../6.004_labs/ssldocs/coursewarex/', flatten: true, expand: true },

            bsim_workbook: {src: 'bsim/bsim_workbook.html', dest: 'build/bsim_workbook.html'},
            bsim_workbook_deploy: {src: ['build/bsim_workbook*','build/glyphicons*'], dest: '../6004x.github.io/tools/', flatten: true, expand: true },

            tmsim: {src: 'tmsim/tmsim.html', dest: 'build/tmsim.html'},

            tmsim_edx: {src: 'tmsim/tmsim_edx.html', dest: 'build/tmsim_edx.html'},
            tmsim_edx_deploy: {src: ['build/tmsim_edx*','build/glyphicons*'], dest: '../6.004_mitx/static/', flatten: true, expand: true },

            tmsim_6004: {src: 'tmsim/tmsim_6004.html', dest: 'build/tmsim_6004.html'},
            tmsim_6004_deploy: {src: ['build/tmsim_6004*','build/glyphicons*'], dest: '../6.004_labs/ssldocs/coursewarex/', flatten: true, expand: true },

            tmsim_workbook: {src: 'tmsim/tmsim_workbook.html', dest: 'build/tmsim_workbook.html'},
            tmsim_workbook_deploy: {src: ['build/tmsim_workbook*','build/glyphicons*'], dest: '../6004x.github.io/tools/', flatten: true, expand: true },

            jsim: {src: ['jsim/jsim.html', 'jsim/*.png'], dest: 'build/', flatten: true, expand: true},
            resources: {src: 'libs/*.png', dest: 'build/', flatten: true, expand: true}
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
            bsim_edx: 'bsim/bsim_edx.html',
            bsim_6004: 'bsim/bsim_6004.html',
            bsim_workbook: 'bsim/bsim_workbook.html',
            jsim: 'jsim/jsim.html',
            tmsim: 'tmsim/tmsim.html',
            tmsim_edx: 'tmsim/tmsim_edx.html',
            tmsim_6004: 'tmsim/tmsim_6004.html',
            tmsim_workbook: 'tmsim/tmsim_workbook.html',
            options: {
                dest: 'build'
            }
        },
        usemin: {
            bsim: {
                src: 'build/bsim.html',
                options: {type: 'html'}
            },
            bsim_edx: {
                src: 'build/bsim_edx.html',
                options: {type: 'html'}
            },
            bsim_6004: {
                src: 'build/bsim_6004.html',
                options: {type: 'html'}
            },
            bsim_workbook: {
                src: 'build/bsim_workbook.html',
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
            tmsim_edx: {
                src: 'build/tmsim_edx.html',
                options: {type: 'html'}
            },
            tmsim_6004: {
                src: 'build/tmsim_6004.html',
                options: {type: 'html'}
            },
            tmsim_workbook: {
                src: 'build/tmsim_workbook.html',
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

    grunt.registerTask('bsim', ['copy:resources', 'copy:bsim', 'useminPrepare:bsim', 'concat', 'uglify', 'cssmin', 'usemin:bsim']);
    grunt.registerTask('bsim_edx', ['copy:resources', 'copy:bsim_edx', 'useminPrepare:bsim_edx', 'concat', 'uglify', 'cssmin', 'usemin:bsim_edx', 'uglify', 'copy:bsim_edx_deploy']);
    grunt.registerTask('bsim_6004', ['copy:resources', 'copy:bsim_6004', 'useminPrepare:bsim_6004', 'concat', 'uglify', 'cssmin', 'usemin:bsim_6004', 'copy:bsim_6004_deploy']);
    grunt.registerTask('bsim_workbook', ['copy:resources', 'copy:bsim_workbook', 'useminPrepare:bsim_workbook', 'concat', 'uglify', 'cssmin', 'usemin:bsim_workbook', 'uglify', 'copy:bsim_workbook_deploy']);

    grunt.registerTask('tmsim', ['copy:resources', 'copy:tmsim', 'useminPrepare:tmsim', 'concat', 'uglify', 'cssmin', 'usemin:tmsim']);
    grunt.registerTask('tmsim_edx', ['copy:resources', 'copy:tmsim_edx', 'useminPrepare:tmsim_edx', 'concat', 'uglify', 'cssmin', 'usemin:tmsim_edx', 'copy:tmsim_edx_deploy']);
    grunt.registerTask('tmsim_6004', ['copy:resources', 'copy:tmsim_6004', 'useminPrepare:tmsim_6004', 'concat', 'uglify', 'cssmin', 'usemin:tmsim_6004', 'copy:tmsim_6004_deploy']);
    grunt.registerTask('tmsim_workbook', ['copy:resources', 'copy:tmsim_workbook', 'useminPrepare:tmsim_workbook', 'concat', 'cssmin', 'usemin:tmsim_workbook', 'copy:tmsim_workbook_deploy']);

    grunt.registerTask('jsim', ['copy:resources', 'copy:jsim', 'useminPrepare:jsim', 'concat', 'uglify', 'cssmin', 'usemin:jsim']);
    grunt.registerTask('deploy', ['copy:deploy']);
    grunt.registerTask('xblock', ['copy:xblock']);
    grunt.registerTask('cs', ['copy:cs']);

    grunt.registerTask('6.004', ['bsim_6004','tmsim_6004']);
    grunt.registerTask('workbook', ['bsim_workbook','tmsim_workbook']);
    grunt.registerTask('edx', ['bsim_edx','tmsim_edx']);

    //grunt.registerTask('test', ['connect', 'qunit:all'])

    // Builds everything if just called as 'grunt'
    grunt.registerTask('default', ['bsim','jsim','tmsim']);
}

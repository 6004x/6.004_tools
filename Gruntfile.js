module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';{}' // hack that 'works' for both JavaScript and CSS.
            }
        },
        clean: ['built'],
        copy: {
            bsim: {src: 'bsim/bsim.html', dest: 'built/bsim.html'},
            jsim: {src: ['jsim/jsim.html', 'jsim/*.png'], dest: 'built/', flatten: true, expand: true}
        },
        uglify: {
            options: {
                beautify: {
                    ascii_only: true,
                    beautify: false
                }
            }
        },
        useminPrepare: {
            bsim: 'bsim/bsim.html',
            jsim: 'jsim/jsim.html',
            options: {
                dest: 'built'
            }
        },
        usemin: {
            bsim: {
                src: 'built/bsim.html',
                options: {type: 'html'}
            },
            jsim: {
                src: 'built/jsim.html',
                options: {type: 'html'}
            },
            options: {
                dirs: ['built']
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

    grunt.registerTask('default', ['copy', 'useminPrepare', 'concat', 'uglify', 'cssmin', 'usemin'])
    grunt.registerTask('test', ['connect', 'qunit:all'])
}
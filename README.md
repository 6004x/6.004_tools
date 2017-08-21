6.004x
======

6.004x Browser-based Courseware for 6.004

Building
--------

The tools use a [Grunt](http://gruntjs.com/)-based build system to produce more compact
results.

To get this set up, perform the following:

1. Install `grunt-cli` globally: `npm install -g grunt-cli`
2. Install the required modules locally: `npm install` in the root directory of this repo.

Once you're set up, you can run any of the following commands:

- `grunt bsim` to generate bsim
- `grunt jsim` to generate jsim
- `grunt tmsim` to generate tmsim
- `grunt` to generate all of the above.

In any of the above cases, they will appear in a folder called `build`.

Additionally, if you have [PhantomJS](http://phantomjs.org) installed, you can run
`grunt test` to run all tests (which currently only test BSim).

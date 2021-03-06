var expect = require('chai').expect;
var jjv = require('..');
var fs = require('fs');
var path = require('path');

var tests = [];
var TEST_DIR = path.resolve(__dirname, 'fixtures');
var SKIP_TEST = [ 'change resolution scope' ];
var files = fs.readdirSync(TEST_DIR).filter(function (x) { return x.indexOf('.json') !== -1; });

var env = jjv();
env.addSchema('http://json-schema.org/draft-04/schema', require('./draft-04-schema.json'));
env.addSchema('http://localhost:1234/integer.json', { type: 'integer' });
env.addSchema('http://localhost:1234/subSchemas.json', {
  'integer': { 'type': 'integer' },
  'refToInteger': { '$ref': '#/integer' }
});

function runTest (i, j, k) {
  var schema = tests[ i ][ j ].schema;
  var test = tests[ i ][ j ].tests[ k ];
  it(test.description, function () {
    if (test.valid) { expect(env.validate(schema, test.data)).to.be.equal(null); } else { expect(env.validate(schema, test.data)).not.to.be.equal(null); }
  });
}

function runSuite (i, j) {
  var suite = tests[ i ][ j ];
  if (SKIP_TEST.indexOf(suite.description) !== -1) { return; }
  describe(suite.description, function () {
    for (var k = 0, len = suite.tests.length; k < len; k++) { runTest(i, j, k); }
  });
}

function runGroup (i) {
  return function () {
    for (var j = 0, len = tests[ i ].length; j < len; j++) { runSuite(i, j); }
  };
}

describe('fixtures', function () {
  files.forEach(function (file, idx) {
    tests.push(require(TEST_DIR + '/' + file));
    describe(file, runGroup(idx));
  });
});

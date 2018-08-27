var expect = require('chai').expect;
var jjv = require('..');

describe('addCheck', function () {
  var env;

  before(function () {
    env = jjv();
    env.defaultOptions.checkRequired = true;
  });

  it('addCheck success', function () {
    env.addCheck('checkTest', function () {
      return true;
    });

    var errors = env.validate({
      type: 'object',
      properties: {},
      checkTest: true
    }, {
    });

    expect(errors).to.be.null;
  });

  it('addCheck fail', function () {
    env.addCheck('checkTest', function () {
      return false;
    });

    var errors = env.validate({
      type: 'object',
      properties: {},
      checkTest: true
    }, {
    });

    expect(errors).to.have.deep.nested.property('validation.checkTest', true);
  });

  it('required failure and addCheck failure are both returned in validation errors', function () {
    env.addCheck('checkTest', function () {
      return false;
    });

    var errors = env.validate({
      type: 'object',
      properties: {},
      required: [
        'test'
      ],
      checkTest: true
    }, {
    });

    expect(errors).to.have.deep.nested.property('validation.test.required', true);
    expect(errors).to.have.deep.nested.property('validation.checkTest', true);
  });
});

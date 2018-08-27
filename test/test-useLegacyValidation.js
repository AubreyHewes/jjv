var jjv = require('..')();
var expect = require('chai').expect;
var draft04Schema = require('./draft-04-schema.json');

jjv.defaultOptions.useLegacyValidation = true;

describe('legacy validation', function () {
  describe('basic functional test', function () {
    var userSchema = {
      type: 'object',
      properties: {
        firstname: {
          type: 'string'
        },
        lastname: {
          type: 'string'
        }
      },
      additionalProperties: false,
      required: [ 'firstname', 'lastname' ]
    };
    var userObject = { 'firstname': 'first', 'lastname': 'last' };

    before(function () {
      jjv.addSchema('user', userSchema);
    });

    it('required', function () {
      delete userObject.lastname;
      expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.lastname', { 'required': true });
      userObject.lastname = 'last';
      expect(jjv.validate('user', userObject)).to.be.null;
    });

    it('additional', function () {
      userObject.nonexistentfield = 'hello there!';
      expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.nonexistentfield.additional');
      delete userObject.nonexistentfield;
      expect(jjv.validate('user', userObject)).to.be.null;
    });

    it('optional', function () {
      userSchema.properties.gender = { type: 'string' };
      delete userObject.gender;
      expect(jjv.validate('user', userObject)).to.be.null;
      userObject.gender = 'vampire';
      expect(jjv.validate('user', userObject)).to.be.null;
    });

    describe('type', function () {
      it('string', function () {
        userSchema.properties.gender = { type: 'string' };
        userObject.gender = 42;
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.type', 'string');
        userObject.gender = 'whale';
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('number', function () {
        userSchema.properties.gender = { type: 'number' };
        userObject.gender = 'whale';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.type', 'number');
        userObject.gender = 42.5;
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('integer', function () {
        userSchema.properties.gender = { type: 'integer' };
        userObject.gender = 42.5;
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.type', 'integer');
        userObject.gender = 1;
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('boolean', function () {
        userSchema.properties.verified = { type: 'boolean' };
        userObject.verified = 33;
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.verified.type', 'boolean');
        userObject.verified = false;
        expect(jjv.validate('user', userObject)).to.be.null;
      });
    });

    describe('format', function () {
      it('alpha', function () {
        userSchema.properties.gender = { type: 'string', format: 'alpha' };
        userObject.gender = 'a42';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.format', true);
        userObject.gender = 'undisclosed';
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('numeric', function () {
        userSchema.properties.gender = { type: 'string', format: 'numeric' };
        userObject.gender = 'a42';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.format', true);
        userObject.gender = '42';
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('alphanumeric', function () {
        userSchema.properties.gender = { type: 'string', format: 'alphanumeric' };
        userObject.gender = 'test%-';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.format', true);
        userObject.gender = 'a42';
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('hexadecimal', function () {
        userSchema.properties.gender = { type: 'string', format: 'hexadecimal' };
        userObject.gender = 'x44';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.format', true);
        userObject.gender = 'deadbeef';
        expect(jjv.validate('user', userObject)).to.be.null;
      });
    });

    describe('generic validators', function () {
      it('pattern', function () {
        userSchema.properties.gender = { type: 'string', pattern: 'ale$' };
        userObject.gender = 'girl';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.pattern', true);
        userObject.gender = 'male';
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('enum', function () {
        userSchema.properties.gender = { type: 'string', 'enum': [ 'male', 'female' ] };
        userObject.gender = 'girl';
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.gender.enum', true);
        userObject.gender = 'male';
        expect(jjv.validate('user', userObject)).to.be.null;
      });
    });

    describe('number validators', function () {
      it('multipleOf', function () {
        userSchema.properties.age = { type: 'number', multipleOf: 10 };
        userObject.age = 21;
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.age.multipleOf', true);
        userObject.age = 20;
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('minimum', function () {
        userSchema.properties.age = { type: 'number', minimum: 18 };
        userObject.age = 17;
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.age.minimum', true);
        userObject.age = 18;
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('maximum', function () {
        userSchema.properties.age = { type: 'number', maximum: 100 };
        userObject.age = 101;
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.age.maximum', true);
        userObject.age = 28;
        expect(jjv.validate('user', userObject)).to.be.null;
      });
    });

    describe('oneof', function () {
      beforeEach(function () {
        userSchema.properties.role = {
          oneOf: [
            {
              type: 'object',
              properties: {
                role_name: {
                  type: 'string',
                  'enum': [ 'admin' ]
                },
                owner_of: {
                  type: 'array'
                },
                super_admin: {
                  type: 'boolean'
                }
              },
              required: [ 'role_name', 'owner_of', 'super_admin' ]
            },
            {
              type: 'object',
              properties: {
                role_name: {
                  type: 'string',
                  'enum': [ 'user' ]
                },
                member_of: {
                  type: 'array'
                }
              },
              required: [ 'role_name', 'member_of' ]
            }
          ]
        };
      });

      it('invalid', function () {
        userObject.role = { role_name: 'guest' };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role');
        userObject.role = { role_name: 'user' };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role');
        userObject.role = { role_name: 'admin' };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role');
        userObject.role = { role_name: 'admin', member_of: [] };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role');
        userObject.role = { role_name: 'user', owner_of: [] };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role');

        userObject.role = { role_name: 'admin', member_of: [], super_admin: false };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role.schema.owner_of');
        jjv.defaultOptions.useCoerce = true;
        userObject.role = { role_name: 'admin', member_of: [], super_admin: false };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.role.schema.owner_of');
        jjv.defaultOptions.useCoerce = false;
      });

      it('valid', function () {
        userObject.role = { role_name: 'admin', owner_of: [], super_admin: true };
        expect(jjv.validate('user', userObject)).to.be.null;
        userObject.role = { role_name: 'user', member_of: [] };
        expect(jjv.validate('user', userObject)).to.be.null;
      });
    });

    describe('nested objects', function () {
      userSchema.definitions = {
        location: {
          type: 'object',
          properties: {
            address: {
              type: 'string'
            },
            latlng: {
              type: 'object',
              properties: {
                lat: {
                  type: 'number'
                },
                lon: {
                  type: 'number'
                }
              },
              required: [ 'lat', 'lon' ]
            }
          },
          required: [ 'address', 'latlng' ]
        }
      };
      userSchema.properties.loc = { $ref: '#/definitions/location' };

      it('optional', function () {
        expect(jjv.validate('user', userObject)).to.be.null;
      });

      it('required', function () {
        userObject.loc = {};
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.loc.schema').that.deep.equals({
          address: { required: true },
          latlng: { required: true }
        });
      });

      it('type', function () {
        userObject.loc = { latlng: { lat: 44, lon: 23 } };
        expect(jjv.validate('user', userObject)).to.have.deep.nested.property('validation.loc.schema.address.required');
        userObject.loc = { address: 'some street address', latlng: { lat: 44, lon: 23 } };
        expect(jjv.validate('user', userObject)).to.be.null;
      });
    });

    it('registers a schema URI without a trailing #', function () {
      jjv.addSchema(draft04Schema);
      expect(jjv.validate(draft04Schema.id, userSchema, { useDefault: false })).to.be.null;
    });

    it('should resolve self-referential absolute URIs with anonymous schemas', function () {
      var selfReferentialSchema = {
        '$schema': 'http://json-schema.org/draft-04/schema',
        'id': 'lib://manifest.json',
        'title': 'Self-referential absolute URI schema',
        'description': 'JSON Schema for node/npm package.json',
        '$ref': 'lib://manifest.json#/definitions/basic',
        'definitions': {
          'basic': {
            'type': 'object',
            'properties': {
              'name': {
                '$ref': 'lib://manifest.json#/definitions/name'
              },
              'version': {
                '$ref': 'lib://manifest.json#/definitions/semver'
              }
            }
          },
          'name': {
            'type': 'string',
            'pattern': '^[A-Za-z](?:[_\\.-]?[A-Za-z0-9]+)*$'
          },
          'semver': {
            'type': 'string',
            'pattern': '^\\d+\\.\\d+\\.\\d+(?:-[a-z]+(?:[_\\.-]*[a-z0-9]+)*)*$'
          }
        }
      };
      var manifest = {
        'name': 'some-module',
        'version': '0.1.0'
      };
      expect(jjv.validate(selfReferentialSchema, manifest)).to.be.null;
    });

    describe('useDefault', function () {
      it('should clone default values', function () {
        var defaultsSchema = {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'apples': {
                'type': 'array',
                'default': []
              }
            }
          }
        };
        var defaultsObject = [
          {},
          {}
        ];
        expect(jjv.validate(defaultsSchema, defaultsObject, { useDefault: true })).to.be.null;
        expect(defaultsObject[ 0 ].apples).to.deep.equal([]);
        expect(defaultsObject[ 1 ].apples).to.deep.equal([]);
        defaultsObject[ 0 ].apples.push(5);
        expect(defaultsObject[ 0 ].apples).to.deep.equal([ 5 ]);
        expect(defaultsObject[ 1 ].apples).to.deep.equal([]);
      });

      userSchema.definitions.path = {
        'type': 'object',
        'properties': {
          'device': {
            'type': 'string'
          },
          'readings': {
            'type': 'array',
            'default': [],
            'items': {
              'type': 'object',
              'default': { lat: 45, lon: 45 },
              'properties': {
                'lat': {
                  'type': 'number'
                },
                'lon': {
                  'type': 'number'
                }
              },
              'required': [ 'lat', 'lon' ]
            }
          }
        },
        'required': [ 'device', 'readings' ]
      };
      userSchema.properties.path = { $ref: '#/definitions/path' };

      jjv.coerceType = {
        array: function (x) {
          if (x === null || x === undefined) return [];
          if (!Array.isArray(x)) return [ x ];
          return x;
        }
      };

      it('should not overwrite with a default', function () {
        userObject.path = { device: 'some gps device', readings: { lat: 44, lon: 23 } };
        var err = jjv.validate('user', userObject, { useDefault: true });
        expect(err).to.have.deep.nested.property('validation.path.schema.readings.type');

        userObject.path = { device: 'some gps device', readings: 0 };
        err = jjv.validate('user', userObject, { useDefault: true });
        expect(err).to.have.deep.nested.property('validation.path.schema.readings.type');

        userObject.path = { device: 'some gps device', readings: false };
        err = jjv.validate('user', userObject, { useDefault: true });
        expect(err).to.have.deep.nested.property('validation.path.schema.readings.type');
      });

      it('should validate array items', function () {
        userObject.path = { device: 'some gps device', readings: [ { lat: 44, long: 23 } ] };
        var err = jjv.validate('user', userObject, { useCoerce: true, useDefault: true });
        expect(err).to.have.deep.nested.property('validation.path.schema.readings.schema[0].schema.lon.required');
      });

      it('should coerce and clone default', function () {
        userObject.path = { device: 'some gps device', readings: [ {} ] };
        var err = jjv.validate('user', userObject, { useCoerce: true, useDefault: true });
        expect(err).to.be.null;
        expect(userObject.path.readings[ 0 ].lat).to.equal(45);
        expect(userObject.path.readings[ 0 ].lon).to.equal(45);

        userObject.path = { device: 'some gps device', readings: [ '' ] };
        err = jjv.validate('user', userObject, { useCoerce: true, useDefault: true });
        expect(err).to.be.null;
        expect(userObject.path.readings[ 0 ].lat).to.equal(45);
        expect(userObject.path.readings[ 0 ].lon).to.equal(45);

        userObject.path = { device: 'some gps device', readings: '' };
        err = jjv.validate('user', userObject, { useCoerce: true, useDefault: true });
        expect(err).to.be.null;
        expect(userObject.path.readings[ 0 ].lat).to.equal(45);
        expect(userObject.path.readings[ 0 ].lon).to.equal(45);
      });

      it('should not overwrite valid data', function () {
        userObject.path = { device: 'some gps device', readings: [ { lat: 44, lon: 23 } ] };
        expect(jjv.validate('user', userObject, { useCoerce: true, useDefault: true })).to.be.null;
      });
    });

    describe('clone function', function () {
      it('should handle objects with a hasOwnProperty property', function () {
        // suppress JSHint warning "'hasOwnProperty' is a really bad name" - we're purposely using really bad names here!
        var defaultsSchema = {
          'type': 'object',
          'properties': {
            'prop': {
              'type': 'object',
              'default': { 'hasOwnProperty': 'yes' }
            }
          }
        };
        var defaultsObject = {};
        expect(jjv.validate(defaultsSchema, defaultsObject, { useDefault: true })).to.be.null;
        expect(defaultsObject.prop).to.deep.equal({ 'hasOwnProperty': 'yes' });
      });
    });
  });
});

/**
 * jjv.js -- A javascript library to validate json input through a json-schema.
 *
 * Copyright (c) 2013 Alex Cornejo.
 *
 * Redistributable under a MIT-style open source license.
 */

(function () {
  var MAX_SAFE_INTEGER = 9007199254740991;
  var isLength = function (value) {
    return typeof value === 'number' && value > -1 && value % 1 === 0 && value <= MAX_SAFE_INTEGER;
  };

  var isObjectLike = function (value) {
    return !!value && typeof value === 'object';
  };

  var isObject = function (value) {
    var type = typeof value;
    return !!value && (type === 'object' || type === 'function');
  };

  var objProtoToString = Object.prototype.toString;

  var is = {
    object: isObject,
    array: Array.isArray || function (value) {
      return isObjectLike(value) &&
              isLength(value.length) &&
              objProtoToString.call(value) === '[object Array]';
    },
    regExp: function (value) {
      return isObject(value) && objProtoToString.call(value) === '[object RegExp]';
    },
    date: function (value) {
      return isObjectLike(value) && objProtoToString.call(value) === '[object Date]';
    }
  };

  var clone = function (obj) {
    // Handle the 3 simple types (string, number, function), and null or undefined
    if (obj === null || typeof obj !== 'object') return obj;
    var copy;

    // Handle Date
    if (is.date(obj)) {
      copy = new Date();
      copy.setTime(obj.getTime());
      return copy;
    }

    // handle RegExp
    if (is.regExp(obj)) {
      copy = new RegExp(obj);
      return copy;
    }

    // Handle Array
    if (is.array(obj)) {
      copy = [];
      for (var i = 0, len = obj.length; i < len; i++) { copy[i] = clone(obj[i]); }
      return copy;
    }

    // Handle Object
    if (is.object(obj)) {
      copy = {};
      var hasOwnProperty = copy.hasOwnProperty;
      //           copy = Object.create(Object.getPrototypeOf(obj));
      for (var attr in obj) {
        if (hasOwnProperty.call(obj, attr)) { copy[attr] = clone(obj[attr]); }
      }
      return copy;
    }

    throw new Error('Unable to clone object!');
  };

  var cloneStack = function (stack) {
    var newStack = [ clone(stack[0]) ]; var key = newStack[0].key; var obj = newStack[0].object;
    for (var i = 1, len = stack.length; i < len; i++) {
      obj = obj[key];
      key = stack[i].key;
      newStack.push({ object: obj, key: key });
    }
    return newStack;
  };

  var copyStack = function (newStack, oldStack) {
    var stackLast = newStack.length - 1; var key = newStack[stackLast].key;
    oldStack[stackLast].object[key] = newStack[stackLast].object[key];
  };

  var handled = {
    'type': true,
    'not': true,
    'anyOf': true,
    'allOf': true,
    'oneOf': true,
    '$ref': true,
    '$schema': true,
    'id': true,
    'exclusiveMaximum': true,
    'exclusiveMininum': true,
    'properties': true,
    'patternProperties': true,
    'additionalProperties': true,
    'items': true,
    'additionalItems': true,
    'required': true,
    'default': true,
    'title': true,
    'description': true,
    'definitions': true,
    'dependencies': true
  };

  var fieldType = {
    'null': function (x) {
      return x === null;
    },
    'string': function (x) {
      return typeof x === 'string';
    },
    'boolean': function (x) {
      return typeof x === 'boolean';
    },
    'number': function (x) {
      // Use x === x instead of !isNaN(x) for speed
      // eslint-disable-next-line no-self-compare
      return typeof x === 'number' && x === x;
    },
    'integer': function (x) {
      return typeof x === 'number' && x % 1 === 0;
    },
    'object': function (x) {
      return x && typeof x === 'object' && !Array.isArray(x);
    },
    'array': function (x) {
      return Array.isArray(x);
    },
    'date': function (x) {
      return is.date(x);
    }
  };

  // missing: uri, date-time, ipv4, ipv6
  var fieldFormat = {
    'alpha': function (v) {
      return (/^[a-zA-Z]+$/).test(v);
    },
    'alphanumeric': function (v) {
      return (/^[a-zA-Z0-9]+$/).test(v);
    },
    'identifier': function (v) {
      return (/^[-_a-zA-Z0-9]+$/).test(v);
    },
    'hexadecimal': function (v) {
      return (/^[a-fA-F0-9]+$/).test(v);
    },
    'numeric': function (v) {
      return (/^[0-9]+$/).test(v);
    },
    'date-time': function (v) {
      return !isNaN(Date.parse(v)) && v.indexOf('/') === -1;
    },
    'uppercase': function (v) {
      return v === v.toUpperCase();
    },
    'lowercase': function (v) {
      return v === v.toLowerCase();
    },
    'hostname': function (v) {
      // eslint-disable-next-line no-useless-escape
      return v.length < 256 && (/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]))*$/).test(v);
    },
    'uri': function (v) {
      // eslint-disable-next-line no-useless-escape
      return (/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/).test(v);
    },
    'email': function (v) { // email, ipv4 and ipv6 adapted from node-validator
      // eslint-disable-next-line no-useless-escape
      return (/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/).test(v);
    },
    'phone': function (v) { // matches most European and US representations like +49 123 999 or 0001 123.456 or +31 (0) 8123
      // eslint-disable-next-line no-useless-escape
      return (/^(?:\+\d{1,3}|0\d{1,3}|00\d{1,2})?(?:\s?\(\d+\))?(?:[-\/\s.]|\d)+$/).test(v);
    },
    'ipv4': function (v) {
      if ((/^(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)$/).test(v)) {
        var parts = v.split('.').sort();
        if (parts[3] <= 255) { return true; }
      }
      return false;
    },
    'ipv6': function (v) {
      return (/^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/).test(v);
      /*  return (/^::|^::1|^([a-fA-F0-9]{1,4}::?){1,7}([a-fA-F0-9]{1,4})$/).test(v); */
    }
  };

  var fieldValidate = {
    'readOnly': function (v, p) {
      return false;
    },
    // ****** numeric validation ********
    'minimum': function (v, p, schema) {
      return !(v < p || (schema.exclusiveMinimum && v <= p));
    },
    'maximum': function (v, p, schema) {
      return !(v > p || (schema.exclusiveMaximum && v >= p));
    },
    'multipleOf': function (v, p) {
      return (v / p) % 1 === 0 || typeof v !== 'number';
    },
    // ****** string validation ******
    'pattern': function (v, p) {
      if (typeof v !== 'string') { return true; }
      var pattern, modifiers;
      if (typeof p === 'string') { pattern = p; } else {
        pattern = p[0];
        modifiers = p[1];
      }
      var regex = new RegExp(pattern, modifiers);
      return regex.test(v);
    },
    'minLength': function (v, p) {
      return v.length >= p || typeof v !== 'string';
    },
    'maxLength': function (v, p) {
      return v.length <= p || typeof v !== 'string';
    },
    // ***** array validation *****
    'minItems': function (v, p) {
      return v.length >= p || !Array.isArray(v);
    },
    'maxItems': function (v, p) {
      return v.length <= p || !Array.isArray(v);
    },
    'uniqueItems': function (v, p) {
      var hash = {}; var key;
      for (var i = 0, len = v.length; i < len; i++) {
        key = JSON.stringify(v[i]);
        if (hash.hasOwnProperty(key)) { return false; } else { hash[key] = true; }
      }
      return true;
    },
    // ***** object validation ****
    'minProperties': function (v, p) {
      if (typeof v !== 'object') { return true; }
      var count = 0;
      for (var attr in v) if (v.hasOwnProperty(attr)) count = count + 1;
      return count >= p;
    },
    'maxProperties': function (v, p) {
      if (typeof v !== 'object') { return true; }
      var count = 0;
      for (var attr in v) if (v.hasOwnProperty(attr)) count = count + 1;
      return count <= p;
    },
    // ****** all *****
    'constant': function (v, p) {
      return JSON.stringify(v) === JSON.stringify(p);
    },
    'enum': function (v, p) {
      var i, len, vs;
      if (typeof v === 'object') {
        vs = JSON.stringify(v);
        for (i = 0, len = p.length; i < len; i++) {
          if (vs === JSON.stringify(p[i])) { return true; }
        }
      } else {
        for (i = 0, len = p.length; i < len; i++) {
          if (v === p[i]) { return true; }
        }
      }
      return false;
    }
  };

  var normalizeID = function (id) {
    return id.indexOf('://') === -1 ? id : id.split('#')[0];
  };

  var resolveURI = function (env, schemaStack, uri) {
    var curschema, components, hashIdx, name;

    hashIdx = uri.indexOf('#');

    if (hashIdx === -1) {
      if (!env.schema.hasOwnProperty(uri)) { return null; }
      return [env.schema[uri]];
    }

    if (hashIdx > 0) {
      name = uri.substr(0, hashIdx);
      uri = uri.substr(hashIdx + 1);
      if (!env.schema.hasOwnProperty(name)) {
        if (schemaStack && schemaStack[0].id === name) { schemaStack = [schemaStack[0]]; } else { return null; }
      } else { schemaStack = [env.schema[name]]; }
    } else {
      if (!schemaStack) { return null; }
      uri = uri.substr(1);
    }

    if (uri === '') { return [schemaStack[0]]; }

    if (uri.charAt(0) === '/') {
      uri = uri.substr(1);
      curschema = schemaStack[0];
      components = uri.split('/');
      while (components.length > 0) {
        if (!curschema.hasOwnProperty(components[0])) { return null; }
        curschema = curschema[components[0]];
        schemaStack.push(curschema);
        components.shift();
      }
      return schemaStack;
    } else { // FIX: should look for subschemas whose id matches uri
      return null;
    }
  };

  var resolveObjectRef = function (objectStack, uri) {
    var components; var object; var lastFrame = objectStack.length - 1; var skipFrames; var frame; var m = /^(\d+)/.exec(uri);

    if (m) {
      uri = uri.substr(m[0].length);
      skipFrames = parseInt(m[1], 10);
      if (skipFrames < 0 || skipFrames > lastFrame) { return; }
      frame = objectStack[lastFrame - skipFrames];
      if (uri === '#') { return frame.key; }
    } else { frame = objectStack[0]; }

    object = frame.object[frame.key];

    if (uri === '') { return object; }

    if (uri.charAt(0) === '/') {
      uri = uri.substr(1);
      components = uri.split('/');
      while (components.length > 0) {
        components[0] = components[0].replace(/~1/g, '/').replace(/~0/g, '~');
        if (!object.hasOwnProperty(components[0])) { return; }
        object = object[components[0]];
        components.shift();
      }
      return object;
    } else {}
  };

  var checkValidity = function (env, schemaStack, objectStack, options) {
    var i, len, count, hasProp, hasPattern;
    var p; var v; var malformed = false; var objerrs = {}; var objerr; var props; var matched;
    var sl = schemaStack.length - 1; var schema = schemaStack[sl]; var newStack;
    var ol = objectStack.length - 1; var object = objectStack[ol].object; var name = objectStack[ol].key; var prop = object[name];
    var errCount, minErrCount;

    if (schema.hasOwnProperty('$ref')) {
      schemaStack = resolveURI(env, schemaStack, schema.$ref);
      if (!schemaStack) { return {'$ref': schema.$ref}; } else { return env.checkValidity(env, schemaStack, objectStack, options); }
    }

    if (schema.hasOwnProperty('type')) {
      if (typeof schema.type === 'string') {
        if (options.useCoerce && env.coerceType.hasOwnProperty(schema.type)) { prop = object[name] = env.coerceType[schema.type](prop); }
        if (options.useDefault && schema.default) {
          if ((prop === undefined || prop === null || prop === '') ||
            (schema.type === 'array' && !prop.length && Array.isArray(prop)) ||
            (schema.type === 'object' && JSON.stringify(prop) === JSON.stringify({}))) {
            prop = object[name] = clone(schema.default);
          }
        }
        if (!env.fieldType[schema.type](prop)) { return {'type': schema.type}; }
      } else {
        malformed = true;
        for (i = 0, len = schema.type.length; i < len && malformed; i++) {
          if (env.fieldType[schema.type[i]](prop)) { malformed = false; }
        }
        if (malformed) { return {'type': schema.type}; }
      }
    }

    if (schema.hasOwnProperty('allOf')) {
      for (i = 0, len = schema.allOf.length; i < len; i++) {
        objerr = env.checkValidity(env, schemaStack.concat(schema.allOf[i]), objectStack, options);
        if (objerr) { return objerr; }
      }
    }

    if (!options.useCoerce && !options.useDefault && !options.removeAdditional) {
      if (schema.hasOwnProperty('oneOf')) {
        minErrCount = Infinity;
        for (i = 0, len = schema.oneOf.length, count = 0; i < len; i++) {
          objerr = env.checkValidity(env, schemaStack.concat(schema.oneOf[i]), objectStack, options);
          if (!objerr) {
            count = count + 1;
            if (count > 1) { break; }
          } else {
            errCount = objerr.schema ? Object.keys(objerr.schema).length : 1;
            if (errCount < minErrCount) {
              minErrCount = errCount;
              objerrs = objerr;
            }
          }
        }
        if (count > 1) { return {'oneOf': true}; } else if (count < 1) { return objerrs; }
        objerrs = {};
      }

      if (schema.hasOwnProperty('anyOf')) {
        objerrs = null;
        minErrCount = Infinity;
        for (i = 0, len = schema.anyOf.length; i < len; i++) {
          objerr = env.checkValidity(env, schemaStack.concat(schema.anyOf[i]), objectStack, options);
          if (!objerr) {
            objerrs = null;
            break;
          } else {
            errCount = objerr.schema ? Object.keys(objerr.schema).length : 1;
            if (errCount < minErrCount) {
              minErrCount = errCount;
              objerrs = objerr;
            }
          }
        }
        if (objerrs) { return objerrs; }
      }

      if (schema.hasOwnProperty('not')) {
        objerr = env.checkValidity(env, schemaStack.concat(schema.not), objectStack, options);
        if (!objerr) { return {'not': true}; }
      }
    } else {
      if (schema.hasOwnProperty('oneOf')) {
        minErrCount = Infinity;
        for (i = 0, len = schema.oneOf.length, count = 0; i < len; i++) {
          newStack = cloneStack(objectStack);
          objerr = env.checkValidity(env, schemaStack.concat(schema.oneOf[i]), newStack, options);
          if (!objerr) {
            count = count + 1;
            if (count > 1) { break; } else { copyStack(newStack, objectStack); }
          } else {
            errCount = objerr.schema ? Object.keys(objerr.schema).length : 1;
            if (errCount < minErrCount) {
              minErrCount = errCount;
              objerrs = objerr;
            }
          }
        }
        if (count > 1) { return {'oneOf': true}; } else if (count < 1) { return objerrs; }
        objerrs = {};
      }

      if (schema.hasOwnProperty('anyOf')) {
        objerrs = null;
        minErrCount = Infinity;
        for (i = 0, len = schema.anyOf.length; i < len; i++) {
          newStack = cloneStack(objectStack);
          objerr = env.checkValidity(env, schemaStack.concat(schema.anyOf[i]), newStack, options);
          if (!objerr) {
            copyStack(newStack, objectStack);
            objerrs = null;
            break;
          } else {
            errCount = objerr.schema ? Object.keys(objerr.schema).length : 1;
            if (errCount < minErrCount) {
              minErrCount = errCount;
              objerrs = objerr;
            }
          }
        }
        if (objerrs) { return objerrs; }
      }

      if (schema.hasOwnProperty('not')) {
        newStack = cloneStack(objectStack);
        objerr = env.checkValidity(env, schemaStack.concat(schema.not), newStack, options);
        if (!objerr) { return {'not': true}; }
      }
    }

    if (schema.hasOwnProperty('dependencies')) {
      for (p in schema.dependencies) {
        if (schema.dependencies.hasOwnProperty(p) && prop.hasOwnProperty(p)) {
          if (Array.isArray(schema.dependencies[p])) {
            for (i = 0, len = schema.dependencies[p].length; i < len; i++) {
              if (!prop.hasOwnProperty(schema.dependencies[p][i])) {
                return {'dependencies': true};
              }
            }
          } else {
            objerr = env.checkValidity(env, schemaStack.concat(schema.dependencies[p]), objectStack, options);
            if (objerr) { return objerr; }
          }
        }
      }
    }

    if (!Array.isArray(prop)) {
      props = [];
      objerrs = {};
      for (p in prop) {
        if (prop.hasOwnProperty(p)) { props.push(p); }
      }

      if (options.checkRequired && schema.required) {
        for (i = 0, len = schema.required.length; i < len; i++) {
          if (!prop.hasOwnProperty(schema.required[i])) {
            objerrs[schema.required[i]] = {'required': true};
            malformed = true;
          }
        }
      }

      hasProp = schema.hasOwnProperty('properties');
      hasPattern = schema.hasOwnProperty('patternProperties');
      if (hasProp || hasPattern) {
        i = props.length;
        while (i--) {
          matched = false;
          if (hasProp && schema.properties.hasOwnProperty(props[i])) {
            matched = true;
            objerr = env.checkValidity(env, schemaStack.concat(schema.properties[props[i]]), objectStack.concat({object: prop, key: props[i]}), options);
            if (objerr !== null) {
              objerrs[props[i]] = objerr;
              malformed = true;
            }
          }
          if (hasPattern) {
            for (p in schema.patternProperties) {
              if (schema.patternProperties.hasOwnProperty(p) && props[i].match(p)) {
                matched = true;
                objerr = env.checkValidity(env, schemaStack.concat(schema.patternProperties[p]), objectStack.concat({object: prop, key: props[i]}), options);
                if (objerr !== null) {
                  objerrs[props[i]] = objerr;
                  malformed = true;
                }
              }
            }
          }
          if (matched) { props.splice(i, 1); }
        }
      }

      if (options.useDefault && hasProp && !malformed) {
        for (p in schema.properties) {
          if (schema.properties.hasOwnProperty(p) && !prop.hasOwnProperty(p) && schema.properties[p].hasOwnProperty('default')) { prop[p] = clone(schema.properties[p]['default']); } else if (schema.properties[p] && schema.properties[p].items && !prop.hasOwnProperty(p) && schema.properties[p].items.hasOwnProperty('default')) { prop[p] = clone(schema.properties[p].items['default']); }
        }
      }

      if (options.removeAdditional && hasProp && schema.additionalProperties !== true && typeof schema.additionalProperties !== 'object') {
        for (i = 0, len = props.length; i < len; i++) { delete prop[props[i]]; }
      } else {
        if (schema.hasOwnProperty('additionalProperties')) {
          if (typeof schema.additionalProperties === 'boolean') {
            if (!schema.additionalProperties) {
              for (i = 0, len = props.length; i < len; i++) {
                objerrs[props[i]] = {'additional': true};
                malformed = true;
              }
            }
          } else {
            for (i = 0, len = props.length; i < len; i++) {
              objerr = env.checkValidity(env, schemaStack.concat(schema.additionalProperties), objectStack.concat({object: prop, key: props[i]}), options);
              if (objerr !== null) {
                objerrs[props[i]] = objerr;
                malformed = true;
              }
            }
          }
        }
      }
      if (malformed && env.defaultOptions.useLegacyValidation) {
        return {'schema': objerrs};
      }
    } else {
      if (schema.hasOwnProperty('items')) {
        if (Array.isArray(schema.items)) {
          for (i = 0, len = schema.items.length; i < len; i++) {
            objerr = env.checkValidity(env, schemaStack.concat(schema.items[i]), objectStack.concat({object: prop, key: i}), options);
            if (objerr !== null) {
              objerrs[i] = objerr;
              malformed = true;
            }
          }
          if (prop.length > len && schema.hasOwnProperty('additionalItems')) {
            if (typeof schema.additionalItems === 'boolean') {
              if (!schema.additionalItems) { return {'additionalItems': true}; }
            } else {
              for (i = len, len = prop.length; i < len; i++) {
                objerr = env.checkValidity(env, schemaStack.concat(schema.additionalItems), objectStack.concat({object: prop, key: i}), options);
                if (objerr !== null) {
                  objerrs[i] = objerr;
                  malformed = true;
                }
              }
            }
          }
        } else {
          for (i = 0, len = prop.length; i < len; i++) {
            objerr = env.checkValidity(env, schemaStack.concat(schema.items), objectStack.concat({object: prop, key: i}), options);
            if (objerr !== null) {
              objerrs[i] = objerr;
              malformed = true;
            }
          }
        }
      } else if (schema.hasOwnProperty('additionalItems')) {
        if (typeof schema.additionalItems !== 'boolean') {
          for (i = 0, len = prop.length; i < len; i++) {
            objerr = env.checkValidity(env, schemaStack.concat(schema.additionalItems), objectStack.concat({object: prop, key: i}), options);
            if (objerr !== null) {
              objerrs[i] = objerr;
              malformed = true;
            }
          }
        }
      }
      if (malformed && env.defaultOptions.useLegacyValidation) {
        return {'schema': objerrs};
      }
    }

    for (v in schema) {
      if (schema.hasOwnProperty(v) && !handled.hasOwnProperty(v)) {
        if (v === 'format') {
          if (env.fieldFormat.hasOwnProperty(schema[v]) && !env.fieldFormat[schema[v]](prop, schema, objectStack, options)) {
            objerrs[v] = true;
            malformed = true;
          }
        } else {
          if (env.fieldValidate.hasOwnProperty(v) && !env.fieldValidate[v](prop, schema[v].hasOwnProperty('$data') ? resolveObjectRef(objectStack, schema[v].$data) : schema[v], schema, objectStack, options)) {
            objerrs[v] = true;
            malformed = true;
          }
        }
      }
    }

    if (malformed) { return objerrs; } else { return null; }
  };

  var defaultOptions = {
    useDefault: false,
    useCoerce: false,
    checkRequired: true,
    removeAdditional: false,
    useLegacyValidation: false
  };

  function Environment () {
    if (!(this instanceof Environment)) { return new Environment(); }

    this.coerceType = {};
    this.fieldType = clone(fieldType);
    this.fieldValidate = clone(fieldValidate);
    this.fieldFormat = clone(fieldFormat);
    this.defaultOptions = clone(defaultOptions);
    this.schema = {};
  }

  Environment.prototype = {
    checkValidity: checkValidity,
    validate: function (name, object, options) {
      var schemaStack = [name]; var errors = null; var objectStack = [{object: {'__root__': object}, key: '__root__'}];

      if (typeof name === 'string') {
        schemaStack = resolveURI(this, null, name);
        if (!schemaStack) { throw new Error('jjv: could not find schema \'' + name + '\'.'); }
      }

      if (!options) {
        options = this.defaultOptions;
      } else {
        for (var p in this.defaultOptions) {
          if (this.defaultOptions.hasOwnProperty(p) && !options.hasOwnProperty(p)) { options[p] = this.defaultOptions[p]; }
        }
      }

      errors = this.checkValidity(this, schemaStack, objectStack, options);

      if (errors) { return {validation: errors.hasOwnProperty('schema') ? errors.schema : errors}; } else { return null; }
    },

    resolveRef: function (schemaStack, $ref) {
      return resolveURI(this, schemaStack, $ref);
    },

    addType: function (name, func) {
      this.fieldType[name] = func;
    },

    addTypeCoercion: function (type, func) {
      this.coerceType[type] = func;
    },

    addCheck: function (name, func) {
      this.fieldValidate[name] = func;
    },

    addFormat: function (name, func) {
      this.fieldFormat[name] = func;
    },

    addSchema: function (name, schema) {
      if (!schema && name) {
        schema = name;
        name = undefined;
      }
      if (schema.hasOwnProperty('id') && typeof schema.id === 'string' && schema.id !== name) {
        if (schema.id.charAt(0) === '/') { throw new Error('jjv: schema id\'s starting with / are invalid.'); }
        this.schema[normalizeID(schema.id)] = schema;
      } else if (!name) {
        throw new Error('jjv: schema needs either a name or id attribute.');
      }
      if (name) { this.schema[normalizeID(name)] = schema; }
    }
  };

  // Export for use in server and client.
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') { module.exports = Environment; } else if (typeof define === 'function' && define.amd) { define(function () { return Environment; }); } else { this.jjv = Environment; }
}).call(this);

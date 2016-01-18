var _ = require('lodash');

var isParamRegexp = /^:/;
var isEscapedColonRegexp = /^\\:/;
var startsWithSlash = /^\//;
var endsWithSlash = /\/$/;

function Router() {
  if (!this instanceof Router) {
    return new Router();
  }
  this.stack = [];
}

var makeMethod = function(method) {
  return function(route, fn) {
    var handler = fn;
    var path = route;
    if (typeof handler == 'undefined') {
      handler = path;
      path = '';
    }
    // TODO: check types
    // TODO: force standard leading/trailing slashes
    // make regexp
    var parts = path.split('/');
    var regexpParts = [];
    var paramNames = [];
    parts.forEach(function(part) {
      if (isParamRegexp.test(part)) {
        regexpParts.push('([^/]*)');
        paramNames.push(part.slice(1));
      } else if (isEscapedColonRegexp.test(part)) {
        regexpParts.push(part.slice(1));
      } else {
        regexpParts.push(part);
      }
    });
    var regexp = new RegExp('^' + regexpParts.join('/') + '/');
    // closure to wrap the handler in route testing logic
    handler = (function(handler) {
      return function(req, res, next) {
        // if method is wrong, skip
        if (method && (req.method != method)) {
          next();
          return;
        }
        var match = regexp.exec(req.path);
        // if path doesn't match, skip
        if (!match) {
          next();
          return;
        }
        // gather and assign params for this handler
        var oldParams = req.params;
        var newParams = _.zipObject(paramNames, match.slice(1));
        if (_.isObject(oldParams)) {
          // layer new params on top of old
          req.params = {};
          _.assign(req.params, oldParams, newParams);
        } else {
          req.params = newParams;
        }
        handler(req, res, function() {
          req.params = oldParams;
          next();
        });
      };
    })(handler);
    handler.regexp = regexp;
    this.stack.push(handler);
  };
};

_.assign(Router.prototype, {
  use: makeMethod(),
  get: makeMethod('get'),
  post: makeMethod('post'),
  handle: function(req, res, end) {
    if (startsWithSlash.test(req.path)) {
      req.path = req.path.slice(1);
    }
    if (!endsWithSlash.test(req.path)) {
      req.path = req.path+'/';
    }

    var i = 0;
    var stack = this.stack;

    next();
    function next() {
      if (i < stack.length) {
        var handler = stack[i++];
        handler(req, res, _next);
        var called = false;
        function _next() {
          if (!called) {
            called = true;
            next();
          }
        }
      } else {
        end();
      }
    }
  },
});

module.exports = Router;

var _    = require('lodash'),
    chai = require('chai');

var Router = require('../router.js'),
    FakeResponder = require('./fake-res.js');

var make = function(method, path, body) { 
  var data = {
    method: method,
    path: path,
  };
  if (body != undefined) data.body = body;
  return data;
};

var demux = function(n, fn, thisVal) {
  var a = new Array(n);
  var i = 0;
  for (var j = 0; j < n; j++) {
    // closure to capture j and to make a once-op
    a[j] = (function(j) {
      var called = false;
      return function() {
        if (!called) {
          called = true;
          if (++i == n) {
            fn.call(thisVal);
          }
        }
      }
    })(j);
  }
  return a;
}

describe('demux', function() {
  it('should work for one', function(done) {
    var one = demux(1, done);
    one[0]();
  });

  it('should work for many', function(done) {
    var seven = demux(7, done);
    seven.forEach(function(fn) { fn(); });
  });
  
  it('should respect thisVar', function(done) {
    var thisVar = {};
    var one = demux(1, function() {
      this.should.equal(thisVar);
      done();
    }, thisVar);
    one[0]();
  });

  it('should work for repeated calls', function(done) {
    var fail = true;
    var two = demux(2, function() {
      if (fail) {
        done(new Error('demux called fn too soon'));
      } else {
        done();
      }
    });
    two[0]();
    two[0]();
    fail = false;
    two[1]();
  });

  it('should only call fn once', function(done) {
    var fail = false;
    var one = demux(1, function() {
      if (fail) done(new Error('demux called fn twice'));
      else {
        fail = true;
        done();
      }
    });
    one[0]();
    one[0]();
  });
});

var NOT_HANDLED_ERROR = "handler did not handle request";

describe('Router', function() {
  var router = null;
  var wrongHandlerError = new Error('wrong handler called');
  var wrongHandler = function(done) {
    return done.bind(null, wrongHandlerError);
  };

  beforeEach(function() {
    router = new Router();
  });

  describe('#use()', function() {

    it('should trigger use handlers for simple routes', function(done) {
      router.use('a', function(req, res, next) {
        done();
      });
      router.handle(make('get', 'a'), {}, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

    it('should trigger when multiple present', function(done) {
      router.use('a', wrongHandler(done));
      router.use('b', function(req, res, next) { done(); });
      router.use('c', wrongHandler(done));
      router.handle(make('get', 'b'), {}, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

    it('should trigger multiple handlers', function(done) {
      var dones = demux(2, done);
      router.use('a', function(req, res, next) {
        dones[0]();
        next();
      });
      router.use('a', function() {
        dones[1]();
      });
      router.handle(make('get', 'a'), {}, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

    it('should pass handlers the correct parameters', function(done) {
      var origReq = make('get', 'a');
      var origRes = {};
      router.use('a', function(req, res, next) {
        req.should.equal(origReq);
        res.should.equal(origRes);
        next.should.be.a('function');
        done();
      });
      router.handle(origReq, origRes, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

    it('should trigger for routes with params', function(done) {
      var req = make('get', 'a/1234');
      router.use('a/:id', function(req, res, next) {
        req.params.should.be.a('object');
        req.params.id.should.be.a('string');
        req.params.id.should.equal('1234');
        done();
      });
      router.handle(req, {}, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

  });

  describe('#get()', function() {
    
    it('should trigger for method == \'get\'', function(done) {
      router.get('a', function(req, res, next) {
        done();
      });
      router.handle(make('get', 'a'), {}, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

    it('shouldn\'t trigger for method == \'post\'', function(done) {
      router.get('a', function(req, res, next) {
        done(new Error(NOT_HANDLED_ERROR));
      });
      router.handle(make('post', 'a'), {}, function() {
        done();
      });
    });

  });

  describe('#post()', function() {
    
    it('should trigger for method == \'post\'', function(done) {
      router.post('a', function(req, res, next) {
        done();
      });
      router.handle(make('post', 'a'), {}, function() {
        done(new Error(NOT_HANDLED_ERROR));
      });
    });

    it('shouldn\'t trigger for method == \'get\'', function(done) {
      router.post('a', function(req, res, next) {
        done(new Error(NOT_HANDLED_ERROR));
      });
      router.handle(make('get', 'a'), {}, function() {
        done();
      });
    });

  });

});

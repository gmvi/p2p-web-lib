var chai = require('chai');
var should = chai.should();

function FakeResponder() {
  this.done = false;
  this.data = undefined;
  var statusCode = 200;
  this.status = function(code) {
    statusCode = code || 200;
    return this;
  };
  this.send = function(body) {
    if (this.done) return;
    this.done = true;
    var data = {
      status: statusCode,
    };
    if (typeof body != undefined) {
      data.body = body;
    }
    this.data = data;
  };
};

module.exports = FakeResponder;

describe('FakeResponder', function() {
  var res = null;

  beforeEach(function() {
    res = new FakeResponder();
  });

  it('should accept data', function() {
    var body = {};
    res.send(body);
    res.data.body.should.equal(body);
  });

  it('should not accept data twice', function() {
    res.send({});
    var data = res.data;
    var body = {};
    res.send(body);
    res.data.should.equal(data);
    res.data.body.should.not.equal(body);
  });

  it('should be done', function() {
    res.done.should.equal(false);
    res.send();
    res.done.should.equal(true);
  });
});

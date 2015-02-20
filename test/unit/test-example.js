var assert = require('chai').assert;

suite('test dynamic hook', function () {

  test('missing body', function (done) {

    var hoodie = {
    };

    var dynamic_hook = require('../../hooks/dynamic')(hoodie);

    var request = {
      payload: null
    };

    var reply = function(msg) {
      assert.equal('no body found', msg, 'should show errer');
      done();
    };

    dynamic_hook['server.api.plugin-request'](request, reply);
    
  });

  test('sending emails fails', function (done) {

    var hoodie = {
      sendEmail: function(email, callback) {
        return callback(new Error('sending email failed because of foo'));
      }
    };

    var dynamic_hook = require('../../hooks/dynamic')(hoodie);

    var request = {
      payload: {
        from: 'foo@bar.com'
      }
    };

    var reply = function(msg) {
      assert.equal('sending email failed: "Error: sending email failed because of foo"', msg, 'should show email send error');
      done();
    };

    dynamic_hook['server.api.plugin-request'](request, reply);
    
  });

  test('sending emails works', function (done) {

    var hoodie = {
      sendEmail: function(email, callback) {
        return callback(null);
      }
    };

    var dynamic_hook = require('../../hooks/dynamic')(hoodie);

    var request = {
      payload: {
        from: 'foo@bar.com'
      }
    };

    var reply = function(msg) {
      assert.equal('ok', msg, 'should show ok');
      done();
    };

    dynamic_hook['server.api.plugin-request'](request, reply);
    
  });

});

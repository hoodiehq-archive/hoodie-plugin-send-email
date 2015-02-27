/**
 * Hoodie plugin send-email
 * Send emails, only when online, though!
 */

/* global Hoodie */

Hoodie.extend(function (hoodie) {
  'use strict';

  // extend the hoodie.js API
  hoodie.sendEmail = function (email) {
    return hoodie.request('post', '/_plugins/send-email/_api', {
      data: JSON.stringify(email),
      processData: false,
      contentType: 'application/json'
    });
  };

});

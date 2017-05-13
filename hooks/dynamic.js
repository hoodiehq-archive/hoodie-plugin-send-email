var url = require('url')

var sendRequest = require('request').defaults({json: true})

/*
  Hooks allow you to alter the behaviour of hoodie-server,
  Hoodie’s core backend module.

  This is possible:
  - get a notification when something in hoodie-server happens
  - extend core features of hoodie-server from a plugin

  A hook is defined as a function that takes a number of arguments
  and possibly a return value. Each hook has its own conventions,
  based on where in hoodie-server it hooks into.

  There are fundamentally two types of hooks:
  - static hooks (see static.js)
  - dynamic hooks (this file)

  The core difference is that static hooks work standalone and just
  receive a number of arguments and maybe return a value. Dynamic
  hooks get initialised with a live instance of the hoodie object,
  that is also available in worker.js, with access to the database,
  and other convenience libraries.
*/
module.exports = function (hoodie) {

  return {
    /*
      group: server.api.*
      description: The server.api group allows you to extend the
        /_api endpoint from hoodie-server.
    */
    /*
      name: server.api.plugin-request
      description: This hook handles any request to
        `/_api/_plugins/{pluginname}/_api`. It gets the regular
         hapi request and reply objects as parameters.
         See http://hapijs.com/api#request-object
         and http://hapijs.com/api#reply-interface
         for details.

         Example:
           If your plugin is called `hoodie-plugin-test` then the URL for this hook is:
           /_api/_plugins/test/_api. You can send all of GET/PUT/POST/DELETE/OPTIONS to it.

      parameters:
      - request: the hapi request object
      - reply: the hapi reply object

      return value: boolen
        false determines that the hook didn’t run successfully and causes Hoodie to
        return a 500 error.
    */
    'server.api.plugin-request': function (request, reply) {

      // Use `hoodie` like you would in worker.js to access the
      // main data store

      if (!request.payload) {
        console.log('Email error: no body found ("%s", %s by %s)', email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
        return reply('no body found');
      }

      var email = request.payload;

      // Authorization:Bearer dXNlci9nQG1pbnV0ZXMuaW86NTgzMzFEQjg6HvQnojpLQfS_MsYoqORL9XjWBy0
      var sessionId = (request.headers.Authorization || request.headers.authorization || '').substr('Bearer '.length)

      if (!sessionId) {
        console.log('Email error: sending email failed: no SessionID ("%s", %s by %s)', email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
        return reply('sending email failed: unauthenticated')
      }

      var userId = email.headers['X-MC-Metadata'].user_id
      var couchUrl = url.parse(process.env.COUCH_URL) // {protocol, host}

      // 1. find user account by id
      sendRequest({
        method: 'get',
        url: url.format({
          protocol: couchUrl.protocol,
          host: couchUrl.host,
          pathname: '/_users/_design/views/_view/fastspring-by-id',
          search: '?key="' + userId + '"',
          auth: [process.env.HOODIE_ADMIN_USER, process.env.HOODIE_ADMIN_PASS].join(':')
        })
      }, function (error, response, body) {
        if (error) {
          console.log('Email error: %s ("%s", %s by %s)', error.message, email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
          return reply(error)
        }

        // expected body:
        // {
        //     "total_rows": 8,
        //     "offset": 0,
        //     "rows": [
        //         {
        //             "id": "org.couchdb.user:user/casper+1434488170262@minutes.io",
        //             "key": "2w72y1c",
        //             "value": null
        //         }
        //     ]
        // }

        if (!body.rows) {
          console.log('Email error: sending email failed: account not found, case 1 ("%s", %s by %s)', email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
          return reply('sending email failed: unauthenticated')
        }

        if (body.rows.length === 0) {
          console.log('Email error: sending email failed: account not found, case 2 ("%s", %s by %s)', email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
          return reply('sending email failed: unauthenticated')
        }

        var usersDocId = body.rows[0].id.split(':').pop()

        sendRequest({
          method: 'get',
          url: url.format({
            protocol: couchUrl.protocol,
            host: couchUrl.host,
            pathname: '/_users/org.couchdb.user:' + encodeURIComponent(usersDocId),
          }),
          headers: {
            cookie: 'AuthSession=' + sessionId
          }
        }, function (error, response, body) {
          if (error) {
            console.log('Email error: Could not find user: %s ("%s", %s by %s)', error.message, email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
            return reply(error)
          }

          if (response.statusCode !== 200) {
            console.log('Email error: Could not find user: %j ("%s", %s by %s)', response.body, email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
            console.log('Email error: sending email failed: account not found ("%s", %s by %s)', email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
            return reply('sending email failed: unauthenticated')
          }

          hoodie.sendEmail(email, function (error) {
            if (error) {
              console.log('Email error: sending email failed: %s ("%s", %s by %s)', error.message, email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
              return reply('sending email failed: "' + error + '"');
            }

            console.log('Email for "%s" sent (Meeting %s by %s)', email.subject, email.headers['X-MC-Metadata'].meeting_id, email.headers['X-MC-Metadata'].user_id)
            reply({'ok': true});
          });
        })
      })
    }
  };
};

# loopback-jwt

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Gratipay][gratipay-image]][gratipay-url]

  loopback-jwt is a node express middleware plugin to map [Json Web tokens](https://www.jwt.io) and [Loopback](https://strongloop.com/) users.

```js
// load loopback-jwt module
var auth = require('loopback-jwt')(app,{
    secretKey: '<secret>',
    model: '<model>'
});

// apply to a path
app.use('/<path>',auth.authenticated,function(req,res,next) {
    debug("has valid token",req.user);
    next();
});

// catch error
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send('invalid token, or no token supplied');
    } else {
        res.status(401).send(err);
    }
});

```

## Getting Started

loopback-jwt is a simple middleware to map jwt with loopback. It is assumed that a jwt has been passed in the request

### Install Connect

```sh
$ npm install loopback-jwt --save
```

### loading loopback-jwt

`var auth = require('loopback-jwt')(app,{options});`

`options` allows any options that are permitted to be passed to the loopback-jwt middleware


options:
- `secretKey` the key need to verify the jwt (required)
- `model` the loopback model used for User maintenance (defaults to 'User')
- `identifier` the jwt claim to identify the user (defaults to 'email')
- `password` the default password to use when creating loopback users (defaults to uuid.v4())

### Using loopback-jwt

the `authenticated` method of loopback-jwt is added to any path that you wish to protect. If the client has not supplied a valid, signed jwt then an error will be raised

```js

// apply to a path
app.use('/<path>',auth.authenticated,function(req,res,next) {
    debug("has valid token",req.user);
    next();
});

// catch error
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send('invalid token, or no token supplied');
    } else {
        res.status(401).send(err);
    }
});
```

## Alter user data before creating a new user

Register a `beforeCreate` callback in options and modify/enrich the passed in user object with profile data contained in the jwt token:

```js
var auth = require('loopback-jwt')(app,{
    secretKey: '<secret>',
    model: '<model>',
    beforeCreate: function(newUser, data) {
      newUser.name = data.name;
    }
});
```


## Contributors

 https://github.com/whoGloo/loopback-jwt/graphs/contributors

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/connect.svg
[npm-url]: https://npmjs.org/package/connect
[travis-image]: https://img.shields.io/travis/senchalabs/connect/master.svg
[travis-url]: https://travis-ci.org/senchalabs/connect
[coveralls-image]: https://img.shields.io/coveralls/senchalabs/connect/master.svg
[coveralls-url]: https://coveralls.io/r/senchalabs/connect
[downloads-image]: https://img.shields.io/npm/dm/connect.svg
[downloads-url]: https://npmjs.org/package/connect
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg
[gratipay-url]: https://www.gratipay.com/dougwilson/

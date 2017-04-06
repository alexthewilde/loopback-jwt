/** The MIT License (MIT)
 * Copyright (c) 2016 Julian Lyndon-Smith (julian@whogloo.io), whoGloo inc
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

module.exports = function(app,options) {
    var debug = require('debug')('loopback-jwt');
    var jwt = require('express-jwt');

    if (!options.secretKey) {
        throw new Error("secretKey must be supplied");
    }

    let getToken = (req) => {
      if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
              return req.headers.authorization.split(' ')[1];
          } else if (req.query) {
            return req.query.token || req.query.access_token;
          }

      return null;
    };

    var data = {
        secretKey: options.secretKey,
        algorithms: ['RS256','HS256'],
        model: options.model || 'User',
        identifier: options.identifier || 'email',
        password: options.password || options.secretKey
    };

    var checkJwt = jwt({
        algorithms: data.algorithms,
        secret: data.secretKey,
        credentialsRequired: options.credentialsRequired,
        getToken: options.getToken || getToken
    })

    .unless( { path: options.unless || []} );

    var mapUser = function(req,res,next) {

        debug("attempting to map user [%s]",req.user[data.identifier]);

        let filter = {
          where: {
            email: req.user[data.identifier]
          },

          include: ['accessTokens']
        };

        app.models[data.model].findOne(filter, function(err, user) {

            if (err) {
                debug("find failed",err);
                return next(err);
            }

            let action;
            let accessTokens = user && user.accessTokens();

            if (!user) {
                action = createUser;
            } else if (!accessTokens || accessTokens.length === 0) {
                action = loginUser;
            } else {
                action = user.accessTokens.findOne;
            }
            action(req)
              .then(function(token) {
                  req.accessToken = token;
                  next();
              })
              .catch(function(err) {
                  next(err);
              });
        });
    };

    function loginUser(req) {
        let now = Math.round(Date.now().valueOf()/1000);
        let ttl = req.user.exp - now;
        let email = req.user[data.identifier];

        debug("attempting to login user [%s]",email);

        return new Promise(function(resolve,reject) {

            app.models[data.model].login({
                email,
                password: data.password.toString(),
                ttl
            })

            .then(function(token) {
                debug("logged in user [%s]",email);
                return resolve(token);
            })

            .catch(function(e) {
                debug("login error",e);
                return reject(e);
            });
        });
    }

     function logout(req, res) {
         app.models[data.model].logout(req.accessToken.id, function(err) {
             res.send(err);
          });
      }

    function createUser(req) {
        debug("creating new user");

        var id = req.user[data.identifier];

        return new Promise(function(resolve,reject) {
            let newUserData = {
                email: id,
                password: data.password.toString()
            };

            if (typeof options.beforeCreate === 'function') {
                resolve(
                  options.beforeCreate(newUserData,req.user) || newUserData
                );
            } else {
                resolve(newUserData);
            }
        })

        .then(function(newUserData) {

            app.models[data.model].create(newUserData)

            .then(function(newUser) {
                debug("new user created [%s]",newUser.email);
                loginUser(req)

                .then(function (token) {
                    return Promise.resolve(token);
                });
            })

            .catch(function(e) {
              debug("error creating user",e);
              return Promise.reject(e);
            });
        })

        .catch(function(e) {
            debug("error creating user",e);
            return Promise.reject(e);
        });
    }

    var authenticated = [checkJwt,mapUser];

    return {
        authenticated: authenticated,
        logout: logout
    };
};

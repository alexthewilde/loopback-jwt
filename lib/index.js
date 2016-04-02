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

    var userMap = {};

    if (!options.secretKey) {
        throw new Error("secretKey must be supplied");
    }

    var data = {
        secretKey: options.secretKey,
        algorithms: ['RS256','HS256'],
        model: options.model || 'User',
        identifier: options.identifier || 'email',
        password: options.password || options.secretKey
    };

    var checkJwt = jwt({
        algorithms: data.algorithms,
        secret: data.secretKey
    });

    var mapUser = function(req,res,next) {
        debug("attempting to map user [%s]",req.user[data.identifier]);

        var id = req.user[data.identifier];

        var token = userMap[id];

        if (!token) {

            loginUser(req)

            .then(function() {
                next();
            })

            .catch(function() {
                createUser(req)

                .then(function() {
                    next();
                })

                .catch(function(e) {
                    debug("ERR",e);
                });

            });

        } else {
            debug("found existing token [%s]",token.id);
            req.accessToken = token;
            next();
        }

    };

    function loginUser(req) {
        var id = req.user[data.identifier];

        debug("attempting to login user [%s]",id);

        return new Promise(function(resolve,reject) {

            app.models[data.model].login({
                email: id,
                password: data.password
            })

            .then(function(token) {
                debug("mapped existing user [%s]",token.id);
                userMap[id] = token;
                req.accessToken = token;
                resolve();
            })

            .catch(function(e) {
                debug("login error",e);
                reject(e);
            });
        });
    }

    function createUser(req) {
        debug("creating new user");

        var id = req.user[data.identifier];

        return new Promise(function(resolve,reject) {
            newUserData = {
                email: id,
                password: data.password
            }

            if (typeof options.beforeCreate === 'function') {
                options.beforeCreate(newUserData, req.user);
            }

            app.models[data.model].create(newUserData)

            .then(function(newUser) {
                debug("new user created [%s]",newUser.email);
                loginUser(req)

                .then(function() {
                    resolve();
                });
            })

            .catch(function(e) {
                debug("error creating user",e);
                reject(e);
            });
        });
    }

    var authenticated = [checkJwt,mapUser];

    return {
        authenticated: authenticated
    };
}

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
    var uuid = require('uuid');

    var userMap = {};

    if (!options.secretKey) {
        throw new Error("secretKey must be supplied");
    }

    var data = {
        secretKey: options.secretKey,
        algorithms: ['RS256','HS256'],
        model: options.model || 'User',
        identifier: options.identifier || 'email',
        password: options.password || uuid.v4()
    };

    var checkJwt = jwt({
        algorithms: data.algorithms,
        secret: data.secretKey,
        password: data.password
    });

    var mapUser = function(req,res,next) {
        debug("map user",req.user);

        var id = req.user[data.identifier];

        var token = userMap[id];

        if (!token) {

            loginUser(req)

            .then(function(token) {
                debug("mapped existing user",token);
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
            debug("found existing token",token);
            req.accessToken = token;
            next();
        }

    };

    function loginUser(req) {
        var id = req.user[data.identifier];

        return new Promise(function(resolve,reject) {
            app.models[data.model].login({
                email: id,
                password: data.secretKey
            })

            .then(function(token) {
                debug("mapped existing user",token);
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
            debug("within promise");

            app.models[data.model].create({
                email: id,
                password: data.password
            })

            .then(function(newUser) {
                debug("new user created",newUser);
                resolve(newUser);
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
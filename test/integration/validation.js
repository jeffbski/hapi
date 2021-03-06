// Load modules

var Lab = require('lab');
var Hapi = require('../..');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Validation', function () {

    it('changes between validation engines', function (done) {

        var s1a = Hapi.types.String();
        expect(s1a.noShortCircuit).to.exist;
        Hapi.joi.version('v2');
        var s2 = Hapi.types.string();
        expect(s2.noShortCircuit).to.not.exist;
        Hapi.joi.version('v1');
        var s1b = Hapi.types.String();
        expect(s1b.noShortCircuit).to.exist;
        done();
    });

    it('validates valid input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    query: {
                        a: Hapi.types.String().min(2)
                    }
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('validates valid input (Object root)', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    query: Hapi.types.Object({
                        a: Hapi.types.String().min(2)
                    })
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('fails on invalid input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    query: {
                        a: Hapi.types.String().min(2)
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation).to.deep.equal({
                source: 'query',
                keys: ['a']
            });

            done();
        });
    });

    it('ignores on invalid input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    query: {
                        a: Hapi.types.String().min(2)
                    },
                    failAction: 'ignore'
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('logs on invalid input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply(this.getLog('validation')[0].data); },
            config: {
                validate: {
                    query: {
                        a: Hapi.types.String().min(2)
                    },
                    failAction: 'log'
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.deep.equal({
                response: {
                    validation: {
                        source: 'query',
                        keys: ['a']
                    }
                },
                message: 'the length of a must be at least 2 characters long'
            });

            done();
        });
    });

    it('replaces error with message on invalid input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    query: {
                        a: Hapi.types.String().min(2)
                    },
                    failAction: function (source, error, next) {

                        next('Got error in ' + source + ' where ' + error.response.payload.validation.keys[0] + ' is bad');
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('Got error in query where a is bad');
            done();
        });
    });

    it('customizes error on invalid input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'GET',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    query: {
                        a: Hapi.types.String().min(2)
                    },
                    errorFields: {
                        walt: 'jr'
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result).to.deep.equal({
                code: 400,
                error: 'Bad Request',
                message: 'the length of a must be at least 2 characters long',
                validation: {
                    source: 'query',
                    keys: ['a']
                },
                walt: 'jr'
            });

            done();
        });
    });

    it('fails on text input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'POST',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    payload: {
                        a: Hapi.types.String().min(2)
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/?a=1', payload: 'some text', headers: { 'content-type': 'text/plain' } }, function (res) {

            expect(res.statusCode).to.equal(415);
            done();
        });
    });

    it('fails on null input', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'POST',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    payload: {
                        a: Hapi.types.String().required()
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/', payload: 'null', headers: { 'content-type': 'application/json' } }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation.source).to.equal('payload')
            done();
        });
    });

    it('fails on no payload', function (done) {

        var server = new Hapi.Server();
        server.route({
            method: 'POST',
            path: '/',
            handler: function () { this.reply('ok'); },
            config: {
                validate: {
                    payload: {
                        a: Hapi.types.String().required()
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/' }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation).to.deep.equal({
                source: 'payload',
                keys: ['a']
            });

            done();
        });
    });
});

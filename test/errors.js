'use strict';

// Load modules

const Lab = require('lab');
const Joi = require('../lib');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Lab.expect;


describe('errors', () => {

    it('has an isJoi property', (done) => {

        Joi.validate('bar', Joi.valid('foo'), (err) => {

            expect(err).to.exist();
            expect(err.isJoi).to.be.true();
            done();
        });
    });

    it('supports custom errors when validating types', (done) => {

        const schema = Joi.object({
            email: Joi.string().email(),
            date: Joi.date(),
            alphanum: Joi.string().alphanum(),
            min: Joi.string().min(3),
            max: Joi.string().max(3),
            required: Joi.string().required(),
            xor: Joi.string(),
            renamed: Joi.string().valid('456'),
            notEmpty: Joi.string().required()
        }).rename('renamed', 'required').without('required', 'xor').without('xor', 'required');

        const input = {
            email: 'invalid-email',
            date: 'invalid-date',
            alphanum: '\b\n\f\r\t',
            min: 'ab',
            max: 'abcd',
            required: 'hello',
            xor: '123',
            renamed: '456',
            notEmpty: ''
        };

        const lang = {
            any: {
                empty: '3'
            },
            date: {
                base: '18'
            },
            string: {
                base: '13',
                min: '14',
                max: '15',
                alphanum: '16',
                email: '19'
            },
            object: {
                without: '7',
                rename: {
                    override: '11'
                }
            }
        };

        Joi.validate(input, schema, { abortEarly: false, language: lang }, (err, value) => {

            expect(err).to.exist();
            expect(err.name).to.equal('ValidationError');
            expect(err.message).to.equal('"value" 11. child "email" fails because ["email" 19]. child "date" fails because ["date" 18]. child "alphanum" fails because ["alphanum" 16]. child "min" fails because ["min" 14]. child "max" fails because ["max" 15]. child "notEmpty" fails because ["notEmpty" 3]. "required" 7. "xor" 7');
            done();
        });
    });

    it('does not prefix with key when language uses context.key', (done) => {

        Joi.valid('sad').options({ language: { any: { allowOnly: 'my hero "{{key}}" is not {{valids}}' } } }).validate(5, (err, value) => {

            expect(err.message).to.equal('my hero "value" is not [sad]');
            done();
        });
    });

    it('escapes unsafe keys', (done) => {

        const schema = {
            'a()': Joi.number()
        };

        Joi.validate({ 'a()': 'x' }, schema, (err, value) => {

            expect(err.message).to.equal('child "a&#x28;&#x29;" fails because ["a&#x28;&#x29;" must be a number]');

            Joi.validate({ 'b()': 'x' }, schema, (err2, value2) => {

                expect(err2.message).to.equal('"b&#x28;&#x29;" is not allowed');
                done();
            });
        });
    });

    it('returns error type in validation error', (done) => {

        const input = {
            notNumber: '',
            notString: true,
            notBoolean: 9
        };

        const schema = {
            notNumber: Joi.number().required(),
            notString: Joi.string().required(),
            notBoolean: Joi.boolean().required()
        };

        Joi.validate(input, schema, { abortEarly: false }, (err, value) => {

            expect(err).to.exist();
            expect(err.details).to.have.length(3);
            expect(err.details[0].type).to.equal('number.base');
            expect(err.details[1].type).to.equal('string.base');
            expect(err.details[2].type).to.equal('boolean.base');
            done();
        });
    });

    it('returns a full path to an error value on an array (items)', (done) => {

        const schema = Joi.array().items(Joi.array().items({ x: Joi.number() }));
        const input = [
            [{ x: 1 }],
            [{ x: 1 }, { x: 'a' }]
        ];

        schema.validate(input, (err, value) => {

            expect(err).to.exist();
            expect(err.details[0].path).to.equal('1.1.x');
            done();
        });
    });

    it('returns a full path to an error value on an array (items forbidden)', (done) => {

        const schema = Joi.array().items(Joi.array().items(Joi.object({ x: Joi.string() }).forbidden()));
        const input = [
            [{ x: 1 }],
            [{ x: 1 }, { x: 'a' }]
        ];

        schema.validate(input, (err, value) => {

            expect(err).to.exist();
            expect(err.details[0].path).to.equal('1.1');
            done();
        });
    });

    it('returns a full path to an error value on an object', (done) => {

        const schema = {
            x: Joi.array().items({ x: Joi.number() })
        };

        const input = {
            x: [{ x: 1 }, { x: 'a' }]
        };

        Joi.validate(input, schema, (err, value) => {

            expect(err).to.exist();
            expect(err.details[0].path).to.equal('x.1.x');
            done();
        });
    });

    it('overrides root key language', (done) => {

        Joi.string().options({ language: { root: 'blah' } }).validate(4, (err, value) => {

            expect(err.message).to.equal('"blah" must be a string');
            done();
        });
    });

    it('overrides label key language', (done) => {

        Joi.string().options({ language: { key: 'my own {{!key}} ' } }).validate(4, (err, value) => {

            expect(err.message).to.equal('my own value must be a string');
            done();
        });
    });

    it('overrides wrapArrays', (done) => {

        Joi.array().items(Joi.boolean()).options({ language: { messages: { wrapArrays: false } } }).validate([4], (err, value) => {

            expect(err.message).to.equal('"value" at position 0 fails because "0" must be a boolean');
            done();
        });
    });

    it('allows html escaping', (done) => {

        Joi.string().options({ language: { root: 'blah' } }).label('bleh').validate(4, (err, value) => {

            expect(err.message).to.equal('"bleh" must be a string');
            done();
        });
    });

    it('provides context with the error', (done) => {

        Joi.object({ length: Joi.number().min(3).required() }).validate({ length: 1 }, (err) => {

            expect(err.details).to.equal([{
                message: '"length" must be larger than or equal to 3',
                path: 'length',
                type: 'number.min',
                context: {
                    limit: 3,
                    key: 'length',
                    value: 1
                }
            }]);
            done();
        });
    });

    it('has a name that is ValidationError', (done) => {

        const schema = Joi.number();
        schema.validate('a', (validateErr) => {

            expect(validateErr).to.exist();
            expect(validateErr.name).to.be.equal('ValidationError');

            try {
                Joi.assert('a', schema);
                throw new Error('should not reach that');
            }
            catch (assertErr) {
                expect(assertErr.name).to.be.equal('ValidationError');
            }

            try {
                Joi.assert('a', schema, 'foo');
                throw new Error('should not reach that');
            }
            catch (assertErr) {
                expect(assertErr.name).to.be.equal('ValidationError');
            }

            try {
                Joi.assert('a', schema, new Error('foo'));
                throw new Error('should not reach that');
            }
            catch (assertErr) {
                expect(assertErr.name).to.equal('Error');
                done();
            }
        });
    });

    describe('annotate()', () => {

        it('annotates error', (done) => {

            const object = {
                a: 'm',
                y: {
                    b: {
                        c: 10
                    }
                }
            };

            const schema = {
                a: Joi.string().valid('a', 'b', 'c', 'd'),
                y: Joi.object({
                    u: Joi.string().valid(['e', 'f', 'g', 'h']).required(),
                    b: Joi.string().valid('i', 'j').allow(false),
                    d: Joi.object({
                        x: Joi.string().valid('k', 'l').required(),
                        c: Joi.number()
                    })
                })
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"y\": {\n    \"b\" \u001b[31m[3]\u001b[0m: {\n      \"c\": 10\n    },\n    \u001b[41m\"u\"\u001b[0m\u001b[31m [2]: -- missing --\u001b[0m\n  },\n  "a" \u001b[31m[1]\u001b[0m: \"m\"\n}\n\u001b[31m\n[1] "a" must be one of [a, b, c, d]\n[2] "u" is required\n[3] "b" must be a string\u001b[0m');
                done();
            });
        });

        it('annotates error without colors if requested', (done) => {

            const object = {
                a: 'm'
            };

            const schema = {
                a: Joi.string().valid('a', 'b', 'c', 'd')
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate(true)).to.equal('{\n  "a" [1]: \"m\"\n}\n\n[1] "a" must be one of [a, b, c, d]');
                done();
            });
        });

        it('annotates error within array', (done) => {

            const object = {
                a: [1, 2, 3, 4, 2, 5]
            };

            const schema = {
                a: Joi.array().items(Joi.valid(1, 2))
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"a\": [\n    1,\n    2,\n    3, \u001b[31m[1]\u001b[0m\n    4, \u001b[31m[2]\u001b[0m\n    2,\n    5 \u001b[31m[3]\u001b[0m\n  ]\n}\n\u001b[31m\n[1] \"2\" must be one of [1, 2]\n[2] \"3\" must be one of [1, 2]\n[3] \"5\" must be one of [1, 2]\u001b[0m');
                done();
            });
        });

        it('annotates error within array multiple times on the same element', (done) => {

            const object = {
                a: [2, 3, 4]
            };

            const schema = {
                a: Joi.array().items(Joi.number().min(4).max(2))
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"a\": [\n    2, \u001b[31m[1]\u001b[0m\n    3, \u001b[31m[2, 3]\u001b[0m\n    4 \u001b[31m[4]\u001b[0m\n  ]\n}\n\u001b[31m\n[1] \"0\" must be larger than or equal to 4\n[2] \"1\" must be larger than or equal to 4\n[3] \"1\" must be less than or equal to 2\n[4] \"2\" must be less than or equal to 2\u001b[0m');
                done();
            });
        });

        it('annotates error within array when it is an object', (done) => {

            const object = {
                a: [{ b: 2 }]
            };

            const schema = {
                a: Joi.array().items(Joi.number())
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"a\": [\n    { \u001b[31m[1]\u001b[0m\n      \"b\": 2\n    }\n  ]\n}\n\u001b[31m\n[1] \"0\" must be a number\u001b[0m');
                done();
            });
        });

        it('annotates error within multiple arrays and multiple times on the same element', (done) => {

            const object = {
                a: [2, 3, 4],
                b: [2, 3, 4]
            };

            const schema = {
                a: Joi.array().items(Joi.number().min(4).max(2)),
                b: Joi.array().items(Joi.number().min(4).max(2))
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"a\": [\n    2, \u001b[31m[1]\u001b[0m\n    3, \u001b[31m[2, 3]\u001b[0m\n    4 \u001b[31m[4]\u001b[0m\n  ],\n  \"b\": [\n    2, \u001b[31m[5]\u001b[0m\n    3, \u001b[31m[6, 7]\u001b[0m\n    4 \u001b[31m[8]\u001b[0m\n  ]\n}\n\u001b[31m\n[1] \"0\" must be larger than or equal to 4\n[2] \"1\" must be larger than or equal to 4\n[3] \"1\" must be less than or equal to 2\n[4] \"2\" must be less than or equal to 2\n[5] \"0\" must be larger than or equal to 4\n[6] \"1\" must be larger than or equal to 4\n[7] \"1\" must be less than or equal to 2\n[8] \"2\" must be less than or equal to 2\u001b[0m');
                done();
            });
        });

        it('displays alternatives fail as a single line', (done) => {

            const schema = {
                x: [
                    Joi.string(),
                    Joi.number(),
                    Joi.date()
                ]
            };

            Joi.validate({ x: true }, schema, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"x\" \u001b[31m[1, 2, 3]\u001b[0m: true\n}\n\u001b[31m\n[1] "x" must be a string\n[2] "x" must be a number\n[3] "x" must be a number of milliseconds or valid date string\u001b[0m');
                done();
            });
        });

        it('annotates circular input', (done) => {

            const schema = {
                x: Joi.object({
                    y: Joi.object({
                        z: Joi.number()
                    })
                })
            };

            const input = {};
            input.x = input;

            Joi.validate(input, schema, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"x\" \u001b[31m[1]\u001b[0m: \"[Circular ~]\"\n}\n\u001b[31m\n[1] \"x\" is not allowed\u001b[0m');
                done();
            });
        });

        it('annotates deep circular input', (done) => {

            const schema = {
                x: Joi.object({
                    y: Joi.object({
                        z: Joi.number()
                    })
                })
            };

            const input = { x: { y: {} } };
            input.x.y.z = input.x.y;

            Joi.validate(input, schema, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"x\": {\n    \"y\": {\n      \"z\" \u001b[31m[1]\u001b[0m: \"[Circular ~.x.y]\"\n    }\n  }\n}\n\u001b[31m\n[1] \"z\" must be a number\u001b[0m');
                done();
            });
        });

        it('annotates deep circular input with extra keys', (done) => {

            const schema = {
                x: Joi.object({
                    y: Joi.object({
                        z: Joi.number()
                    })
                })
            };

            const input = { x: { y: { z: 1, foo: {} } } };
            input.x.y.foo = input.x.y;

            Joi.validate(input, schema, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"x\": {\n    \"y\": {\n      \"z\": 1,\n      \"foo\" \u001b[31m[1]\u001b[0m: \"[Circular ~.x.y]\"\n    }\n  }\n}\n\u001b[31m\n[1] \"foo\" is not allowed\u001b[0m');
                done();
            });
        });

        it('prints NaN, Infinity and -Infinity correctly in errors', (done) => {

            const schema = {
                x: Joi.object({
                    y: Joi.date().allow(null),
                    z: Joi.date().allow(null),
                    u: Joi.date().allow(null),
                    g: Joi.date().allow(null),
                    h: Joi.date().allow(null),
                    i: Joi.date().allow(null),
                    k: Joi.date().allow(null),
                    p: Joi.date().allow(null),
                    f: Joi.date().allow(null)
                })
            };

            const input = {
                x: {
                    y: NaN,
                    z: Infinity,
                    u: -Infinity,
                    g: Symbol('foo'),
                    h: -Infinity,
                    i: Infinity,
                    k: (a) => a,
                    p: Symbol('bar'),
                    f: function (x) {

                        return [{ y: 2 }];
                    }
                }
            };

            Joi.validate(input, schema, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"x\": {\n    \"z\": Infinity,\n    \"u\": -Infinity,\n    \"g\": Symbol(foo),\n    \"h\": -Infinity,\n    \"i\": Infinity,\n    \"k\": (a) => a,\n    \"p\": Symbol(bar),\n    \"f\": function (x) {\\n\\n                        return [{ y: 2 }];\\n                    },\n    \"y\" \u001b[31m[1]\u001b[0m: NaN\n  }\n}\n\u001b[31m\n[1] \"y\" must be a number of milliseconds or valid date string\u001b[0m');
                done();
            });
        });

        it('pinpoints an error in a stringified JSON object', (done) => {

            const object = {
                a: '{"c":"string"}'
            };

            const schema = {
                a: Joi.object({
                    b: Joi.string()
                })
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate(true)).to.equal('{\n  \"a\" [1]: \"{\\\"c\\\":\\\"string\\\"}\"\n}\n\n[1] \"c\" is not allowed');
                done();
            });
        });

        it('pinpoints several errors in a stringified JSON object', (done) => {

            const object = {
                a: '{"b":-1.5}'
            };

            const schema = {
                a: Joi.object({
                    b: Joi.number().integer().positive()
                })
            };

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate(true)).to.equal('{\n  "a" [1, 2]: "{\\"b\\":-1.5}"\n}\n\n[1] "b" must be an integer\n[2] "b" must be a positive number');
                done();
            });
        });

        it('pinpoints an error in a stringified JSON object (deep)', (done) => {

            const object = {
                a: '{"b":{"c":{"d":1}}}'
            };

            const schema = Joi.object({
                a: Joi.object({
                    b: Joi.object({
                        c: {
                            d: Joi.string()
                        }
                    })
                })
            });

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(err.annotate(true)).to.equal('{\n  "a" [1]: "{\\"b\\":{\\"c\\":{\\"d\\":1}}}"\n}\n\n[1] "d" must be a string');
                done();
            });
        });

        it('handles child to uncle relationship inside a child', (done) => {

            const object = {
                response: {
                    options: {
                        stripUnknown: true
                    }
                }
            };

            const schema = Joi.object({
                response: Joi.object({
                    modify: Joi.boolean(),
                    options: Joi.object()
                })
                    .assert('options.stripUnknown', Joi.ref('modify'), 'meet requirement of having peer modify set to true')
            });

            Joi.validate(object, schema, { abortEarly: false }, (err, value) => {

                expect(err).to.exist();
                expect(() => {

                    err.annotate(true);
                }).to.not.throw();

                done();
            });
        });
    });
});

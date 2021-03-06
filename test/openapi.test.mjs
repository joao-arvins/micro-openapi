import micro from 'micro';
import test from 'ava';
import listen from 'test-listen';
import fetch from 'node-fetch';

import openapi, {
  validate, param, handleErrors, specification
} from '../src/openapi';

const { json, send } = micro;

let service;
let url;

test.beforeEach(async () => {
  service = micro(handleErrors(openapi(spec)));
  url = await listen(service);
});

test.afterEach.always(() => {
  service.close();
});


test('basic url', async (t) => {
  const response = await fetch(`${url}/status`);
  const body = await response.text();

  t.is(response.status, 200);
  t.is(body, 'OK');
});


test('spec json', async (t) => {
  const response = await fetch(`${url}/openapi.json`);
  const body = await response.json();

  t.is(response.status, 200);
  t.deepEqual(body, JSON.parse(JSON.stringify(spec)));
});


test('url with int param', async (t) => {
  const response = await fetch(`${url}/resources/4`);
  const body = await response.json();

  t.is(response.status, 200);
  t.deepEqual(body, {
    id: 4
  });
});


test('url with missing param', async (t) => {
  const response = await fetch(`${url}/resources/`);
  const body = await response.text();

  t.is(response.status, 404);
  t.is(body, 'Not Found');
});


test('url with string param', async (t) => {
  const response = await fetch(`${url}/resources/bob`);
  const body = await response.json();

  t.is(response.status, 400);
  t.deepEqual(body, [{
    errorCode: 'type.openapi.validation',
    location: 'path',
    message: 'should be integer',
    path: 'id'
  }]);
});


test('url with non-validation error', async (t) => {
  const response = await fetch(`${url}/error`);
  const body = await response.text();

  t.is(response.status, 500);
  t.is(body, 'Internal Server Error');
});


test('url with body', async (t) => {
  const response = await fetch(`${url}/resources`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'Testing',
      detail: {
        level: 15
      },
      options: [
        {
          id: 4
        }
      ]
    })
  });
  const body = await response.json();

  t.is(response.status, 201);
  t.deepEqual(body, {
    id: 123,
    content: 'Testing',
    detail: {
      level: 15
    },
    options: [
      {
        id: 4
      }
    ]
  });
});


const spec = {
  openapi: '3.0.0',
  info: {
    version: '1.0',
    title: 'Example API',
    license: {
      name: 'MIT'
    }
  },
  paths: {
    'openapi.json': {
      get: {
        description: 'OpenAPI Spec',
        operation: req => specification(req)
      }
    },
    '/status': {
      get: {
        description: 'API Status',
        operation: () => 'OK',
        responses: {
          200: {
            description: 'Ok'
          }
        }
      }
    },
    '/error': {
      get: {
        description: 'Throw an Error',
        operation: () => {
          throw new Error('Not Ok');
        },
        responses: {
          500: {
            description: 'Not Ok'
          }
        }
      }
    },
    '/resources': {
      post: {
        description: 'Create a Resource',
        operation: validate(async (req, res) => {
          const body = await json(req);
          send(res, 201, {
            id: 123,
            ...body
          });
        }),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: true,
                properties: {
                  content: {
                    type: 'string',
                    required: true,
                    minLength: 5
                  },
                  detail: {
                    type: 'object',
                    required: true,
                    properties: {
                      level: {
                        type: 'integer',
                        require: true,
                        minimum: 10
                      }
                    }
                  },
                  options: {
                    type: 'array',
                    required: true,
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'integer',
                          required: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Created'
          }
        }
      }
    },
    '/resources/{id}': {
      get: {
        description: 'Get a Resource by Id',
        operation: validate(req => ({
          id: param(req, 'id')
        })),
        parameters: [{
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'integer'
          }
        }],
        responses: {
          200: {
            description: 'Ok'
          }
        }
      }
    }
  },
  servers: [{
    url: '/v1'
  }]
};

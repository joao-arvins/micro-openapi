import micro from 'micro';
import test from 'ava';
import listen from 'test-listen';
import fetch from 'node-fetch';

import openapi, { validate, param, handleErrors } from '../src/openapi';

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
    '/status': {
      get: {
        description: 'API Status',
        operationId: () => 'OK',
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
        operationId: () => {
          throw new Error('Not Ok');
        },
        responses: {
          500: {
            description: 'Not Ok'
          }
        }
      }
    },
    '/resources/{id}': {
      get: {
        description: 'Get a Resource by Id',
        operationId: validate(req => ({
          id: param(req, 'id')
        })),
        parameters: [{
          in: 'path',
          name: 'id',
          required: true,
          type: 'integer',
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

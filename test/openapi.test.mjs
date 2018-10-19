import micro from 'micro';
import test from 'ava';
import listen from 'test-listen';
import fetch from 'node-fetch';

import openapi, { validate, param } from '../src/openapi';

let service;
let url;

test.beforeEach(async () => {
  service = micro(openapi(spec));
  url = await listen(service);
});

test.afterEach.always(() => {
  service.close();
});


test('basic url', async (t) => {
  const response = await fetch(`${url}/status`);
  const body = await response.text();

  t.is(body, 'OK');
});


test('url with int param', async (t) => {
  const response = await fetch(`${url}/resources/4`);
  const body = await response.json();

  t.deepEqual(body, {
    id: 4
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
    '/resources/{id}': {
      get: {
        description: 'Get a Resource by Id',
        operationId: req => ({
          id: param(req, 'id')
        }),
        parameters: [{
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'number'
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

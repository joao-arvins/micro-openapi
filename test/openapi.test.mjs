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
  const response = await fetch(`${url}/v1/resource/42`);
  const body = await response.text();

  t.is(body, 'OK');
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
    '/resource/{id}': {
      get: {
        description: 'Get a Resource by Id',
        operationId: () => ({}),
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

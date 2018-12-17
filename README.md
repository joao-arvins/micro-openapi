# micro-openapi [![Build Status](https://travis-ci.org/bealearts/micro-openapi.png?branch=master)](https://travis-ci.org/bealearts/micro-openapi) [![npm version](https://badge.fury.io/js/micro-openapi.svg)](http://badge.fury.io/js/micro-openapi) [![Dependency Status](https://david-dm.org/bealearts/micro-openapi.png)](https://david-dm.org/bealearts/micro-openapi)

[OpenAPI](https://www.openapis.org/) spec defined router/validation for [micro](https://github.com/zeit/micro) based micro-services

## Usage
```js
import openapi, { validate, param, specification } from 'micro-openapi';

const getResource = validate((req, res) => ({
  id: param(req, 'id')
}));

export openapi({
  openapi: '3.0.0',
  info: {
    version: '1.0',
    title: 'Example API',
    license: {
      name: 'MIT'
    }
  },
  paths: {
    '/openapi.json': {
      get: {
        description: 'OpenAPI Specification',
        operation: req => specification(req, {
          exclude: [
            '/openapi.json'
          ]
        }))
      }
    },
    '/resources/{id}': {
      get: {
        description: 'Get a Resource by Id',
        operation: getResource,
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
            description: 'The Resource'
          },
          400: {
            description: 'Invalid Request'
          }
        }
      }
    }
  },
  servers: [{
      url: '/api/v1'
  }]
})
```

## API



## Install
```shell
npm i micro-openapi
```

import tree, { param } from 'micro-tree';
import OpenAPIRequestValidator from 'openapi-request-validator';
import micro from 'micro';

const RequestValidator = OpenAPIRequestValidator.default;
const { send, text } = micro;
const validatorKey = Symbol('micro-openapi validator');
const specKey = Symbol('micro-openapi specKey');

export default function openapi(spec, notFound) {
  const routes = parse(spec);
  const router = tree(routes, notFound);
  return (req, res) => {
    req[specKey] = cleanSpec(spec);
    return router(req, res);
  };
}


export function validate(handler) {
  return async (req, res) => {
    const validator = req[validatorKey];
    const content = await text(req);
    let body = {};

    if (content) {
      body = JSON.parse(content);
    }

    const errors = validator.validate({
      body,
      params: param(req),
      query: (new URL(req.url, 'http://example.org')).query
    });

    if (errors) {
      throw new ValidationError(errors);
    }

    return handler(req, res);
  };
}


export function handleErrors(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof ValidationError) {
        return send(res, error.statusCode, error.detail);
      }
      throw error;
    }
  };
}


export { param } from 'micro-tree';


export function specification(req, opts = {}) {
  const { exclude } = opts;

  if (exclude && Array.isArray(exclude)) {
    const { paths, ...others } = req[specKey];
    return {
      ...others,
      paths: filter(paths, exclude)
    };
  }

  return req[specKey];
}


export class ValidationError extends Error {
  constructor(errors) {
    super(`Validation Error - ${JSON.stringify(errors.errors)}`);
    this.statusCode = errors.status;
    this.detail = errors.errors;
  }
}


function parse(spec) {
  // TODO: Validate spec

  const { paths } = spec;

  return Object.keys(paths).reduce((routes, path) => {
    const node = getNode(routes, path);

    Object.keys(paths[path]).forEach((verb) => {
      node[verb.toUpperCase()] = handle(paths[path][verb]);
    });

    return routes;
  }, {});
}


function getNode(routes, path) {
  const parts = path.split('/').filter(part => part !== '');
  let node = routes;
  parts.forEach((part) => {
    const formattedPart = part.replace('{', ':').replace('}', '');
    node[formattedPart] = node[formattedPart] || {};
    node = node[formattedPart];
  });

  return node;
}


function handle(def) {
  const { operation, parameters, requestBody } = def;
  return (req, res) => {
    const params = (parameters || []).map(param => ({
      ...param,
      ...param.schema // workaround for OpenAPI v3 - inline schema
    }));

    // workaround for OpenAPI v3 - requestBody
    if (requestBody) {
      const contentType = Object.keys(requestBody.content)[0];
      params.push({
        in: 'body',
        schema: toJsonSchema(requestBody.content[contentType].schema)
      });
    }

    req[validatorKey] = new RequestValidator({
      parameters: params
    });

    return operation(req, res);
  };
}


function cleanSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}


function filter(paths, exclude) {
  return Object.keys(paths).reduce((acc, key) => {
    if (exclude.includes(key)) {
      return acc;
    }
    acc[key] = paths[key];
    return acc;
  }, {});
}


function toJsonSchema(schema) {
  if (schema.type === 'object') {
    const { required, properties, ...def } = schema;
    return {
      ...def,
      properties: Object.keys(properties).reduce((acc, prop) => {
        acc[prop] = toJsonSchema(properties[prop]);
        return acc;
      }, {}),
      required: Object.keys(properties).filter(prop => properties[prop].required)
    };
  }

  if (schema.type === 'array') {
    const { required, items, ...def } = schema;
    return {
      ...def,
      items: toJsonSchema(items)
    };
  }

  const { required, ...result } = schema;
  return result;
}

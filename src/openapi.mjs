import tree, { param } from 'micro-tree';
import OpenAPIRequestValidator from 'openapi-request-validator';
import micro from 'micro';

const RequestValidator = OpenAPIRequestValidator.default;
const { send } = micro;
const validatorKey = Symbol('micro-openapi validator');

export default function openapi(spec) {
  const routes = parse(spec);
  return tree(routes);
}


export function validate(handler) {
  return (req, res) => {
    const validator = req[validatorKey];
    const errors = validator.validate({
      body: {},
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
  return (req, res) => {
    try {
      return handler(req, res);
    } catch (error) {
      if (error instanceof ValidationError) {
        return send(res, error.statusCode, error.detail);
      }
      throw error;
    }
  };
}


export { param } from 'micro-tree';

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation Error');
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
  const { operation, parameters } = def;
  return (req, res) => {
    req[validatorKey] = new RequestValidator({
      parameters: (parameters || []).map(param => ({
        ...param,
        ...param.schema // workaround for OpenAPI v3 - inline schema
      }))
    });

    return operation(req, res);
  };
}

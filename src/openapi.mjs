import tree from 'micro-tree';

export default function openapi(spec) {
  const routes = parse(spec);
  return tree(routes);
}


export function validate(handler) {
  return (req, res) => {

  };
}


export { param } from 'micro-tree';


function parse(spec) {
  if (!spec.openapi) {
    throw new Error('Must be an OpenAPI spec');
  }

  // TODO: Validate spec

  const { paths } = spec;

  return Object.keys(paths).reduce((routes, path) => {
    const node = getNode(routes, path);

    Object.keys(paths[path]).forEach((verb) => {
      node[verb.toUpperCase()] = paths[path][verb].operationId;
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

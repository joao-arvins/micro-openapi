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

    // const resource = def[path]['x-resource'];

    // Object.keys(def[path]).filter(isVerb).forEach((verb) => {
    //   node[`$${verb}`] = handle(resource, verb);
    // });

    return routes;
  }, {});
}

function getNode(routes, path) {
  const parts = path.split('/').filter(part => part !== '');
  let node = routes;
  parts.forEach((part) => {
    node[part] = node[part] || {};
    node = node[part];
  });

  return node;
}

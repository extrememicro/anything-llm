process.env.STORAGE_DIR = require("path").resolve(__dirname, "../../storage");

const { workspaceEndpoints } = require("../../endpoints/workspaces");
const { ROLES } = require("../../utils/middleware/multiUserProtected");
const {
  validWorkspaceSlug,
} = require("../../utils/middleware/validWorkspace");

function registeredRoutes() {
  const routes = [];
  const app = new Proxy(
    {},
    {
      get: (_, method) => (path, middleware) => {
        routes.push({ method, path, middleware: [].concat(middleware) });
      },
    }
  );
  workspaceEndpoints(app);
  return routes;
}

function route(routes, method, path) {
  return routes.find((item) => item.method === method && item.path === path);
}

function rolesFor(route) {
  return route.middleware.find((middleware) => middleware.allowedRoles)
    ?.allowedRoles;
}

describe("collaborator workspace route authorization", () => {
  const routes = registeredRoutes();

  test.each([
    ["post", "/workspace/:slug/upload"],
    ["post", "/workspace/:slug/upload-link"],
    ["post", "/workspace/:slug/update-embeddings"],
    ["post", "/workspace/:slug/upload-and-embed"],
  ])("allows assigned-workspace document operation %s %s", (method, path) => {
    const registered = route(routes, method, path);
    expect(rolesFor(registered)).toContain(ROLES.colaborador);
    expect(registered.middleware).toContain(validWorkspaceSlug);
  });

  test.each([
    ["post", "/workspace/new"],
    ["post", "/workspace/:slug/update"],
    ["delete", "/workspace/:slug/remove-and-unembed"],
  ])("denies collaborator from privileged operation %s %s", (method, path) => {
    expect(rolesFor(route(routes, method, path))).not.toContain(
      ROLES.colaborador
    );
  });
});

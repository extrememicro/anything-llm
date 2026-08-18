process.env.STORAGE_DIR = require("path").resolve(__dirname, "../../storage");

const { adminEndpoints } = require("../../endpoints/admin");
const { documentEndpoints } = require("../../endpoints/document");
const { liveSyncEndpoints } = require("../../endpoints/experimental/liveSync");
const { systemEndpoints } = require("../../endpoints/system");
const { workspaceEndpoints } = require("../../endpoints/workspaces");
const {
  workspaceParsedFilesEndpoints,
} = require("../../endpoints/workspacesParsedFiles");
const { handleFileUpload } = require("../../utils/files/multer");
const { ROLES } = require("../../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../../utils/middleware/validWorkspace");

function registeredRoutes(registerEndpoints) {
  const routes = [];
  const app = new Proxy(
    {},
    {
      get: (_, method) => (path, middleware) => {
        routes.push({ method, path, middleware: [].concat(middleware) });
      },
    }
  );
  registerEndpoints(app);
  return routes;
}

function route(routes, method, path) {
  return routes.find((item) => item.method === method && item.path === path);
}

function rolesFor(route) {
  return route.middleware.find((middleware) => middleware.allowedRoles)
    ?.allowedRoles;
}

function expectPrivilegedOnly(route) {
  const roles = rolesFor(route);
  expect(roles).toBeDefined();
  expect(roles.length).toBeGreaterThan(0);
  expect(
    roles.every((role) => [ROLES.admin, ROLES.manager].includes(role))
  ).toBe(true);
}

function expectMembershipBeforeUpload(registered) {
  expect(registered.middleware).toContain(validWorkspaceSlug);
  expect(registered.middleware.indexOf(validWorkspaceSlug)).toBeLessThan(
    registered.middleware.indexOf(handleFileUpload)
  );
}

describe("collaborator workspace route authorization", () => {
  const routes = registeredRoutes(workspaceEndpoints);
  const parsedFilesRoutes = registeredRoutes(workspaceParsedFilesEndpoints);

  test("allows assigned-workspace atomic upload and embed", () => {
    const registered = route(
      routes,
      "post",
      "/workspace/:slug/upload-and-embed"
    );
    expect(rolesFor(registered)).toContain(ROLES.colaborador);
    expectMembershipBeforeUpload(registered);
  });

  test("allows user/workspace-scoped parsed-file embedding", () => {
    const registered = route(
      parsedFilesRoutes,
      "post",
      "/workspace/:slug/embed-parsed-file/:fileId"
    );
    expect(rolesFor(registered)).toContain(ROLES.colaborador);
    expect(registered.middleware).toContain(validWorkspaceSlug);
  });

  test("checks workspace membership before receiving parsed files", () => {
    expectMembershipBeforeUpload(
      route(parsedFilesRoutes, "post", "/workspace/:slug/parse")
    );
  });

  test.each([
    ["post", "/workspace/new"],
    ["post", "/workspace/:slug/update"],
    ["post", "/workspace/:slug/upload"],
    ["post", "/workspace/:slug/upload-link"],
    ["post", "/workspace/:slug/update-embeddings"],
    ["delete", "/workspace/:slug/remove-and-unembed"],
  ])("denies collaborator from privileged operation %s %s", (method, path) => {
    expectPrivilegedOnly(route(routes, method, path));
  });

  test.each([
    [systemEndpoints, "get", "/system/local-files"],
    [systemEndpoints, "get", "/system/local-files/search"],
    [systemEndpoints, "post", "/system/local-files/by-docpaths"],
    [systemEndpoints, "delete", "/system/remove-document"],
    [systemEndpoints, "delete", "/system/remove-folder"],
    [documentEndpoints, "post", "/document/create-folder"],
    [documentEndpoints, "post", "/document/move-files"],
    [liveSyncEndpoints, "post", "/experimental/toggle-live-sync"],
    [liveSyncEndpoints, "get", "/experimental/live-sync/queues"],
    [liveSyncEndpoints, "post", "/workspace/:slug/update-watch-status"],
    [adminEndpoints, "get", "/admin/system-preferences-for"],
    [adminEndpoints, "post", "/admin/system-preferences"],
  ])(
    "denies collaborator from global route %s %s",
    (registerEndpoints, method, path) => {
      const registered = route(
        registeredRoutes(registerEndpoints),
        method,
        path
      );
      expect(registered).toBeDefined();
      expectPrivilegedOnly(registered);
    }
  );
});

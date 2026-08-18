jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn() },
}));
jest.mock("../../../utils/http", () => ({
  multiUserMode: jest.fn(() => true),
  userFromSession: jest.fn(),
}));
jest.mock("../../../models/workspace", () => ({
  Workspace: { getWithUser: jest.fn() },
}));

const { User } = require("../../../models/user");
const { Workspace } = require("../../../models/workspace");
const { userFromSession } = require("../../../utils/http");
const {
  ROLES,
  flexUserRoleValid,
} = require("../../../utils/middleware/multiUserProtected");
const {
  validWorkspaceSlug,
} = require("../../../utils/middleware/validWorkspace");

function responseFor(role) {
  return {
    locals: { multiUserMode: true, user: { role } },
    sendStatus: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };
}

describe("collaborator role", () => {
  test("is a valid first-class user role", () => {
    expect(User.validations.role(ROLES.colaborador)).toBe("colaborador");
    expect(() => User.validations.role("unknown")).toThrow("Invalid role");
  });

  beforeEach(() => jest.clearAllMocks());

  test("is accepted only when a route explicitly allows it", async () => {
    const next = jest.fn();
    const allowed = responseFor(ROLES.colaborador);
    await flexUserRoleValid([ROLES.colaborador])({}, allowed, next);
    expect(next).toHaveBeenCalledTimes(1);

    const denied = responseFor(ROLES.colaborador);
    await flexUserRoleValid([ROLES.admin, ROLES.manager])({}, denied, next);
    expect(denied.sendStatus).toHaveBeenCalledWith(401);

    const unknown = responseFor("unknown");
    await flexUserRoleValid([ROLES.admin, ROLES.manager, ROLES.colaborador])(
      {},
      unknown,
      next
    );
    expect(unknown.sendStatus).toHaveBeenCalledWith(401);
  });

  test("runs role and workspace membership before upload", async () => {
    const user = { id: 7, role: ROLES.colaborador };
    const request = { params: { slug: "assigned" } };
    const response = responseFor(ROLES.colaborador);
    response.locals.user = user;
    response.status = jest.fn().mockReturnThis();
    response.send = jest.fn().mockReturnThis();
    userFromSession.mockResolvedValue(user);
    Workspace.getWithUser.mockResolvedValue({ id: 11, slug: "assigned" });
    const upload = jest.fn();

    const next = jest.fn(() => validWorkspaceSlug(request, response, upload));
    await flexUserRoleValid([ROLES.colaborador])(request, response, next);
    await next.mock.results[0].value;

    expect(Workspace.getWithUser).toHaveBeenCalledWith(user, {
      slug: "assigned",
    });
    expect(upload).toHaveBeenCalledTimes(1);

    Workspace.getWithUser.mockResolvedValue(null);
    request.params.slug = "unassigned";
    const deniedNext = jest.fn(() =>
      validWorkspaceSlug(request, response, upload)
    );
    await flexUserRoleValid([ROLES.colaborador])(request, response, deniedNext);
    await deniedNext.mock.results[0].value;
    expect(response.status).toHaveBeenCalledWith(404);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  test("stops a denied collaborator before workspace and upload middleware", async () => {
    const response = responseFor(ROLES.colaborador);
    const workspace = jest.fn();
    const upload = jest.fn();

    await flexUserRoleValid([ROLES.admin])({}, response, async () => {
      await workspace({}, response, upload);
    });

    expect(response.sendStatus).toHaveBeenCalledWith(401);
    expect(workspace).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
});

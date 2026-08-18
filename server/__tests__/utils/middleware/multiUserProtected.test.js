jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn() },
}));
jest.mock("../../../utils/http", () => ({ userFromSession: jest.fn() }));

const { User } = require("../../../models/user");
const {
  ROLES,
  flexUserRoleValid,
} = require("../../../utils/middleware/multiUserProtected");

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

  test("is accepted only when a route explicitly allows it", async () => {
    const next = jest.fn();
    const allowed = responseFor(ROLES.colaborador);
    await flexUserRoleValid([ROLES.colaborador])({}, allowed, next);
    expect(next).toHaveBeenCalledTimes(1);

    const denied = responseFor(ROLES.colaborador);
    await flexUserRoleValid([ROLES.admin, ROLES.manager])({}, denied, next);
    expect(denied.sendStatus).toHaveBeenCalledWith(401);
  });
});

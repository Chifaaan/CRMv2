import { beforeEach, describe, expect, it } from "vitest";
import {
  canAddProjectToGroup,
  canManageGroup,
  canViewGroup,
  groupsForUser,
} from "../src/lib/prototype/domain";
import { usePrototypeStore } from "../src/lib/prototype/store";
import type { ProjectGroup } from "../src/lib/prototype/types";

function createProject(name: string) {
  return usePrototypeStore.getState().createProject({
    name,
    client: "Klien",
    description: "",
    priority: "medium",
    startDate: "",
    targetEndDate: "",
    coverColor: "#000000",
    mode: "manual",
  });
}

function group(id: string): ProjectGroup {
  return usePrototypeStore
    .getState()
    .groups.find((item) => item.id === id)!;
}

describe("umbrella project permissions", () => {
  beforeEach(() => {
    usePrototypeStore.getState().reset();
  });

  it("lets a PM create an umbrella from two owned projects", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const first = createProject("PM 1 Alpha");
    const second = createProject("PM 1 Beta");
    const groupId = usePrototypeStore.getState().createGroup({
      name: "Umbrella PM 1",
      description: "",
      projectIds: [first, second],
    });
    const state = usePrototypeStore.getState();
    expect(groupId).not.toBe("");
    expect(group(groupId).createdById).toBe("u-pm1");
    expect(
      state.projects.filter((project) => project.groupId === groupId),
    ).toHaveLength(2);
    expect(
      state.projectEvents.filter(
        (event) =>
          event.groupId === groupId &&
          event.eventType === "project.group_joined",
      ),
    ).toHaveLength(2);
  });

  it("rejects an umbrella with fewer than two projects", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const only = createProject("PM 1 Solo");
    const groupId = usePrototypeStore.getState().createGroup({
      name: "Umbrella Solo",
      description: "",
      projectIds: [only],
    });
    expect(groupId).toBe("");
    expect(usePrototypeStore.getState().groups).toHaveLength(1);
  });

  it("keeps PM visibility and management limited to owned umbrellas", () => {
    usePrototypeStore.getState().setCurrentUser("u-manager");
    const first = createProject("Manager Alpha");
    const second = createProject("Manager Beta");
    const managerGroup = usePrototypeStore.getState().createGroup({
      name: "Umbrella Manager",
      description: "",
      projectIds: [first, second],
    });
    const pm = usePrototypeStore
      .getState()
      .users.find((user) => user.id === "u-pm1")!;
    const manager = usePrototypeStore
      .getState()
      .users.find((user) => user.id === "u-manager")!;
    const created = group(managerGroup);
    expect(canViewGroup(pm, created)).toBe(false);
    expect(canManageGroup(pm, created)).toBe(false);
    expect(canViewGroup(manager, created)).toBe(true);
    expect(groupsForUser(usePrototypeStore.getState(), pm)).toHaveLength(0);
  });

  it("rejects a PM adding another owner's project", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const first = createProject("Own Alpha");
    const second = createProject("Own Beta");
    const groupId = usePrototypeStore.getState().createGroup({
      name: "Umbrella Owned",
      description: "",
      projectIds: [first, second],
    });
    usePrototypeStore.getState().setCurrentUser("u-pm2");
    const foreign = createProject("Foreign Project");
    const pm1 = usePrototypeStore
      .getState()
      .users.find((user) => user.id === "u-pm1")!;
    const foreignProject = usePrototypeStore
      .getState()
      .projects.find((project) => project.id === foreign)!;
    expect(
      canAddProjectToGroup(pm1, group(groupId), foreignProject),
    ).toBe(false);
    usePrototypeStore.getState().addProjectToGroup(groupId, foreign);
    expect(
      usePrototypeStore
        .getState()
        .projects.find((project) => project.id === foreign)?.groupId,
    ).toBeUndefined();
  });

  it("auto-disbands an umbrella when one member remains", () => {
    usePrototypeStore.getState().setCurrentUser("u-pm1");
    const first = createProject("Member 1");
    const second = createProject("Member 2");
    const third = createProject("Member 3");
    const groupId = usePrototypeStore.getState().createGroup({
      name: "Umbrella Three",
      description: "",
      projectIds: [first, second, third],
    });
    usePrototypeStore.getState().removeProjectFromGroup(first);
    expect(group(groupId)).toBeTruthy();
    usePrototypeStore.getState().removeProjectFromGroup(second);
    expect(
      usePrototypeStore.getState().groups.find((item) => item.id === groupId),
    ).toBeUndefined();
    expect(
      usePrototypeStore
        .getState()
        .projects.find((project) => project.id === third)?.groupId,
    ).toBeUndefined();
  });
});

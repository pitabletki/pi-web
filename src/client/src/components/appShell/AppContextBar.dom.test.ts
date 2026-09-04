// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { html } from "lit";
import type { Project, Workspace } from "../../api";
import { AppContextBar } from "./AppContextBar";

afterEach(() => {
  document.body.replaceChildren();
});

describe("plugin header items in the context bar", () => {
  it("carries the items the panel header cannot show in the mobile layout", async () => {
    const bar = new AppContextBar();
    bar.headerItems = [{ id: "modes:header.switch", title: "Working mode", render: () => html`<button class="mode">Cowork</button>` }];
    document.body.append(bar);
    await bar.updateComplete;

    const group = bar.shadowRoot?.querySelector('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe("Working mode");
    expect(group?.querySelector("button.mode")?.textContent).toBe("Cowork");
  });

  it("keeps the items on their own row above the location chips instead of pushing the chips off-screen", async () => {
    const bar = new AppContextBar();
    bar.headerItems = [
      { id: "modes:header.switch", title: "Working mode", render: () => html`<button class="mode">Cowork</button>` },
      { id: "toolbar:header.bar", title: "Quick actions", render: () => html`<button class="quick">New</button>` },
    ];
    document.body.append(bar);
    await bar.updateComplete;

    const root = bar.shadowRoot;
    const row = root?.querySelector(".context-plugin-row");
    expect(row?.querySelectorAll('[role="group"]')).toHaveLength(2);
    // The chips row stays a list of chips only: a plugin item at its head would take the
    // whole 375px viewport and leave "where am I" scrolled out of view.
    expect(root?.querySelector('.context-items [role="group"]')).toBeNull();
    expect(root?.querySelector(".context-items .context-item .context-chip")).not.toBeNull();
    // Own row first, then the location bar: the switch is the primary control on a phone.
    expect(row?.nextElementSibling?.tagName).toBe("NAV");
  });

  it("renders no plugin row when nothing is contributed", async () => {
    const bar = new AppContextBar();
    document.body.append(bar);
    await bar.updateComplete;

    expect(bar.shadowRoot?.querySelector(".context-plugin-row")).toBeNull();
  });
});

describe("provider-owned navigation in the context bar", () => {
  it("drops the project crumb when the provider owns the context", async () => {
    const bar = await mountBar(providerWorkspace());

    expect(crumbKinds(bar)).toEqual(["Workspace", "Session"]);
  });

  it("keeps the project crumb for an ordinary workspace", async () => {
    const bar = await mountBar(workspace());

    expect(crumbKinds(bar)).toEqual(["Project", "Workspace", "Session"]);
  });
});

async function mountBar(selected: Workspace): Promise<AppContextBar> {
  const bar = new AppContextBar();
  bar.project = project();
  bar.workspace = selected;
  document.body.append(bar);
  await bar.updateComplete;
  return bar;
}

function crumbKinds(bar: AppContextBar): string[] {
  return [...(bar.shadowRoot?.querySelectorAll(".context-kind") ?? [])].map((kind) => kind.textContent.trim());
}

function project(): Project {
  return { id: "project-1", name: "repo", path: "/repo", createdAt: "2026-06-04T00:00:00.000Z" };
}

function workspace(): Workspace {
  return { id: "ws-1", projectId: "project-1", path: "/repo", label: "main", isMain: true, effectiveConfig: {} };
}

function providerWorkspace(): Workspace {
  return {
    ...workspace(),
    provider: { pluginId: "modes", capabilities: { request: true, remove: false }, metadata: { navigation: { hideProjects: true } } },
  };
}

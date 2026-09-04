// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { html } from "lit";
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

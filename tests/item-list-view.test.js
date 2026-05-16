import { describe, expect, it } from "vitest";

import { getItemMenuActions } from "../js/ui/item-list-view.js";

describe("ItemListView menu actions", () => {
  it("shows plain-text exports and encryption for unencrypted entries", () => {
    expect(getItemMenuActions({ id: "plain", encrypted: false })).toEqual([
      "exportTxt",
      "exportMd",
      "encrypt",
    ]);
  });

  it("only shows decrypt for encrypted entries", () => {
    expect(getItemMenuActions({ id: "secret", encrypted: true })).toEqual(["decrypt"]);
  });
});

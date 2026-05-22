import { describe, expect, it } from "vitest";

import { getItemMenuActions, getVisibleItemCardTags } from "../js/ui/item-list-view.js";

describe("ItemListView menu actions", () => {
  it("shows plain-text exports and encryption for unencrypted entries", () => {
    expect(getItemMenuActions({ id: "plain", encrypted: false })).toEqual([
      "exportTxt",
      "exportMd",
      "editTags",
      "generateTags",
      "encrypt",
    ]);
  });

  it("shows decrypt and tag editing for encrypted entries", () => {
    expect(getItemMenuActions({ id: "secret", encrypted: true })).toEqual([
      "decrypt",
      "editTags",
      "generateTags",
    ]);
  });
});

describe("ItemListView visible tags", () => {
  it("shows only the recording tag signal for unencrypted audio entries", () => {
    const item = {
      id: "audio",
      encrypted: false,
      tags: ["Work"],
      attachments: [
        {
          id: "rec-1",
          type: "audio",
          name: "Meeting audio",
          mimeType: "audio/webm",
          createdAt: 10,
        },
      ],
    };

    expect(getVisibleItemCardTags(item)).toEqual(["Work", "录音"]);
  });

  it("keeps encrypted item tags searchable but hidden from the card", () => {
    const item = {
      id: "secret-audio",
      encrypted: true,
      tags: ["Work"],
      attachments: [{ id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 10 }],
    };

    expect(getVisibleItemCardTags(item)).toEqual([]);
  });
});

import { describe, expect, it, vi } from "vitest";

import { UIController } from "../js/ui/ui-controller.js";

describe("UIController recording player", () => {
  it("marks waveform bars as played without rebuilding the waveform", () => {
    const bars = Array.from({ length: 4 }, () => ({
      classList: { toggle: vi.fn() },
    }));
    const ui = new UIController({
      attachmentPlayerWaveform: { children: bars },
    });

    ui.updateAttachmentWaveformProgress(0.5);

    expect(bars[0].classList.toggle).toHaveBeenCalledWith("played", true);
    expect(bars[1].classList.toggle).toHaveBeenCalledWith("played", true);
    expect(bars[2].classList.toggle).toHaveBeenCalledWith("played", false);
    expect(bars[3].classList.toggle).toHaveBeenCalledWith("played", false);
  });
});

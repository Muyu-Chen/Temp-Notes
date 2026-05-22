import { describe, expect, it } from "vitest";

import {
  buildWaveformBuckets,
  cyclePlaybackRate,
  getPlaybackProgress,
} from "../js/lib/audio-waveform-utils.js";

describe("audio waveform utilities", () => {
  it("builds normalized waveform buckets from audio samples", () => {
    const buckets = buildWaveformBuckets(Float32Array.from([0, 0.5, -1, 0.25]), 2);

    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toBeGreaterThan(0);
    expect(buckets[1]).toBe(1);
  });

  it("returns silent buckets for missing samples", () => {
    expect(buildWaveformBuckets(null, 3)).toEqual([0, 0, 0]);
  });

  it("clamps playback progress to the playable range", () => {
    expect(getPlaybackProgress(5, 20)).toBe(0.25);
    expect(getPlaybackProgress(30, 20)).toBe(1);
    expect(getPlaybackProgress(5, 0)).toBe(0);
  });

  it("cycles supported playback rates", () => {
    expect(cyclePlaybackRate(1)).toBe(1.25);
    expect(cyclePlaybackRate(1.25)).toBe(1.5);
    expect(cyclePlaybackRate(1.5)).toBe(2);
    expect(cyclePlaybackRate(2)).toBe(1);
  });
});

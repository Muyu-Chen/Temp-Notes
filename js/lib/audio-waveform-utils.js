/**
 * 音频波形展示工具
 */

export const DEFAULT_WAVEFORM_BUCKETS = 56;

export const buildWaveformBuckets = (samples, bucketCount = DEFAULT_WAVEFORM_BUCKETS) => {
  const count = Math.max(1, Number(bucketCount) || DEFAULT_WAVEFORM_BUCKETS);
  if (!samples || Number(samples.length || 0) === 0) {
    return Array.from({ length: count }, () => 0);
  }

  const sampleCount = samples.length;
  const bucketSize = Math.max(1, Math.ceil(sampleCount / count));
  const buckets = [];

  for (let bucketIndex = 0; bucketIndex < count; bucketIndex += 1) {
    const start = bucketIndex * bucketSize;
    const end = Math.min(sampleCount, start + bucketSize);
    if (start >= sampleCount) {
      buckets.push(0);
      continue;
    }

    let total = 0;
    for (let index = start; index < end; index += 1) {
      const value = Number(samples[index] || 0);
      total += value * value;
    }
    buckets.push(Math.sqrt(total / Math.max(1, end - start)));
  }

  const max = Math.max(...buckets, 0);
  if (max <= 0) return buckets.map(() => 0);
  return buckets.map((value) => Math.min(1, value / max));
};

export const getPlaybackProgress = (currentTime = 0, duration = 0) => {
  const total = Number(duration || 0);
  if (!Number.isFinite(total) || total <= 0) return 0;
  const current = Math.min(Math.max(Number(currentTime || 0), 0), total);
  return current / total;
};

export const cyclePlaybackRate = (rate) => {
  const rates = [1, 1.25, 1.5, 2];
  const current = Number(rate || 1);
  const index = rates.findIndex((value) => Math.abs(value - current) < 0.01);
  return rates[(index + 1) % rates.length] || 1;
};

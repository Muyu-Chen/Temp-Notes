/**
 * 搜索工具
 */

import { formatTime } from "./time-utils.js";
import { resolveItemTitle } from "./text-utils.js";
import { normalizeTags } from "./item-utils.js";

export const normalizeSearchText = (value) => String(value ?? "").toLowerCase();

export const getSearchTokens = (query) =>
  normalizeSearchText(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const resolveSearchTokens = (queryOrTokens) =>
  Array.isArray(queryOrTokens)
    ? queryOrTokens.map(normalizeSearchText).filter(Boolean)
    : getSearchTokens(queryOrTokens);

const pushTimeField = (fields, timestamp) => {
  if (Number.isFinite(timestamp)) {
    fields.push(formatTime(timestamp));
  }
};

export const getItemSearchFields = (item) => {
  const fields = [resolveItemTitle(item)];
  fields.push(...normalizeTags(item?.tags));

  if (!item?.encrypted) {
    fields.push(item?.content || "");
  }

  pushTimeField(fields, item?.updatedAt);
  pushTimeField(fields, item?.deletedAt);

  return fields;
};

export const itemMatchesSearch = (item, queryOrTokens) => {
  const tokens = resolveSearchTokens(queryOrTokens);
  if (tokens.length === 0) return true;

  const fields = getItemSearchFields(item).map(normalizeSearchText);
  return tokens.every((token) => fields.some((field) => field.includes(token)));
};

export const filterItemsBySearch = (items, queryOrTokens) => {
  const tokens = resolveSearchTokens(queryOrTokens);
  if (tokens.length === 0) return items;
  return items.filter((item) => itemMatchesSearch(item, tokens));
};

export const excerptAroundSearch = (text, queryOrTokens, maxLength = 240) => {
  const value = String(text ?? "").trim() || "（空）";
  const tokens = resolveSearchTokens(queryOrTokens);

  if (tokens.length === 0 || value.length <= maxLength) {
    return value;
  }

  const normalized = normalizeSearchText(value);
  const firstIndex = tokens
    .map((token) => normalized.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (!Number.isFinite(firstIndex)) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
  }

  const start = Math.max(0, firstIndex - Math.floor(maxLength / 2));
  const end = Math.min(value.length, start + maxLength);
  const adjustedStart = Math.max(0, end - maxLength);
  const prefix = adjustedStart > 0 ? "…" : "";
  const suffix = end < value.length ? "…" : "";

  return `${prefix}${value.slice(adjustedStart, end)}${suffix}`;
};

export const getHighlightRanges = (text, queryOrTokens) => {
  const value = String(text ?? "");
  const tokens = resolveSearchTokens(queryOrTokens);
  if (tokens.length === 0 || !value) return [];

  const normalized = normalizeSearchText(value);
  const ranges = [];

  tokens.forEach((token) => {
    let index = normalized.indexOf(token);
    while (index >= 0) {
      ranges.push({ start: index, end: index + token.length });
      index = normalized.indexOf(token, index + token.length);
    }
  });

  return ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce((merged, range) => {
      const previous = merged[merged.length - 1];
      if (!previous || range.start > previous.end) {
        merged.push({ ...range });
      } else if (range.end > previous.end) {
        previous.end = range.end;
      }
      return merged;
    }, []);
};

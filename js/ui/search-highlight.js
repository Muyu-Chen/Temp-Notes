/**
 * 搜索命中高亮
 */

import { getHighlightRanges } from "../lib/search-utils.js";

export const appendHighlightedText = (element, text, searchTokens) => {
  const value = String(text ?? "");
  const ranges = getHighlightRanges(value, searchTokens);

  if (ranges.length === 0) {
    element.textContent = value;
    return;
  }

  element.textContent = "";
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.start > cursor) {
      element.appendChild(document.createTextNode(value.slice(cursor, range.start)));
    }

    const mark = document.createElement("mark");
    mark.className = "search-hit";
    mark.textContent = value.slice(range.start, range.end);
    element.appendChild(mark);
    cursor = range.end;
  });

  if (cursor < value.length) {
    element.appendChild(document.createTextNode(value.slice(cursor)));
  }
};

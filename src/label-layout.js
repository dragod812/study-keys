// Adapted from Study Studio word labels; shared placement algorithm.
export function placeWordLabels(items, left, right) {
  const rows = [];
  for (const item of items) {
    let row = rows.find((r) => Math.abs(r.top - item.rect.top) < 4);
    if (!row) {
      row = { top: item.rect.top, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  const positions = new Map();
  for (const row of rows) {
    const sorted = row.items.slice().sort((a, b) => a.rect.left - b.rect.left);
    let cursor = left;
    const placed = sorted.map((item) => {
      const width = Math.max(14, Math.ceil(item.code.length * 5.4 + 4));
      const x = Math.max(cursor, item.rect.left);
      cursor = x + width + 1;
      return { item, x, width };
    });
    let edge = right;
    for (const p of placed.toReversed()) {
      p.x = Math.min(p.x, edge - p.width);
      edge = p.x - 1;
    }
    // Extremely dense code can contain more one-letter tokens than one badge
    // row can fit. Use two lanes there; prefix filtering quickly clears them.
    if (placed[0]?.x < left) {
      const cursors = [left, left];
      for (const [i, p] of placed.entries()) {
        const lane = i % 2;
        p.x = Math.max(
          cursors[lane],
          Math.min(p.item.rect.left, right - p.width),
        );
        cursors[lane] = p.x + p.width + 1;
        p.lane = lane;
      }
    }
    for (const p of placed)
      positions.set(p.item.start, {
        left: p.x,
        top: row.top - 11 + (p.lane || 0) * 12,
        width: p.width,
      });
  }
  return positions;
}


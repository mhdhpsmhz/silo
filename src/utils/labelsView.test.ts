import test from "node:test";
import assert from "node:assert/strict";
import type { Label } from "../types/silo";
import { getVisibleScopedLabels, SCOPED_LABELS_MIN_LIMIT } from "./labelsView";

function makeLabels(count: number): Label[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `lbl-${idx + 1}`,
    category_id: "cat-1",
    name: `Label ${idx + 1}`,
    created_at: "2026-01-01T00:00:00Z",
  }));
}

test("getVisibleScopedLabels returns all labels without toggle when count <= limit", () => {
  const labels = makeLabels(SCOPED_LABELS_MIN_LIMIT);
  const res = getVisibleScopedLabels(labels, { expanded: false });
  assert.equal(res.visibleLabels.length, SCOPED_LABELS_MIN_LIMIT);
  assert.equal(res.hiddenCount, 0);
  assert.equal(res.canToggle, false);
});

test("getVisibleScopedLabels caps labels when collapsed and reveals all when expanded", () => {
  const labels = makeLabels(10);
  const collapsed = getVisibleScopedLabels(labels, { expanded: false });
  assert.equal(collapsed.visibleLabels.length, 6);
  assert.equal(collapsed.hiddenCount, 4);
  assert.equal(collapsed.canToggle, true);

  const expanded = getVisibleScopedLabels(labels, { expanded: true });
  assert.equal(expanded.visibleLabels.length, 10);
  assert.equal(expanded.hiddenCount, 0);
  assert.equal(expanded.canToggle, true);
});

test("getVisibleScopedLabels preserves active selected or editing label even when beyond cap", () => {
  const labels = makeLabels(10);
  const res = getVisibleScopedLabels(labels, {
    expanded: false,
    selectedLabelId: "lbl-9",
    editingLabelId: "lbl-10",
  });
  const ids = res.visibleLabels.map((l) => l.id);
  assert.equal(ids.includes("lbl-9"), true);
  assert.equal(ids.includes("lbl-10"), true);
  assert.equal(res.hiddenCount, 2);
});

import type { Label } from "../types/silo";

export const SCOPED_LABELS_MIN_LIMIT = 6;

export interface VisibleScopedLabelsResult {
  visibleLabels: Label[];
  hiddenCount: number;
  canToggle: boolean;
}

export function getVisibleScopedLabels(
  labels: Label[],
  options: {
    expanded: boolean;
    limit?: number;
    selectedLabelId?: string;
    editingLabelId?: string | null;
  },
): VisibleScopedLabelsResult {
  const limit = options.limit ?? SCOPED_LABELS_MIN_LIMIT;
  if (labels.length <= limit) {
    return {
      visibleLabels: labels,
      hiddenCount: 0,
      canToggle: false,
    };
  }

  if (options.expanded) {
    return {
      visibleLabels: labels,
      hiddenCount: 0,
      canToggle: true,
    };
  }

  const base = labels.slice(0, limit);
  const includedIds = new Set(base.map((l) => l.id));

  for (const extraId of [options.selectedLabelId, options.editingLabelId]) {
    if (!extraId || includedIds.has(extraId)) continue;
    const match = labels.find((l) => l.id === extraId);
    if (match) {
      base.push(match);
      includedIds.add(match.id);
    }
  }

  return {
    visibleLabels: base,
    hiddenCount: Math.max(0, labels.length - base.length),
    canToggle: true,
  };
}

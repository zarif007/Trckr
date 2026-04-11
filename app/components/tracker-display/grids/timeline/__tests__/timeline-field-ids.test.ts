import { describe, it, expect } from "vitest";
import { resolveTimelineFieldIds } from "../timeline-field-ids";
import type { TrackerField, TrackerLayoutNode } from "../../../types";

function field(
  id: string,
  dataType: TrackerField["dataType"],
  label: string,
): TrackerField {
  return {
    id,
    dataType,
    ui: { label },
  } as TrackerField;
}

describe("resolveTimelineFieldIds", () => {
  it("infers end date as the second date column in layout order when config omits endDateField", () => {
    const layoutNodes: TrackerLayoutNode[] = [
      { gridId: "g1", fieldId: "start", order: 0 } as TrackerLayoutNode,
      { gridId: "g1", fieldId: "title", order: 1 } as TrackerLayoutNode,
      { gridId: "g1", fieldId: "end", order: 2 } as TrackerLayoutNode,
    ];
    const fields = [
      field("start", "date", "Start"),
      field("title", "text", "Name"),
      field("end", "date", "End"),
    ];
    const { dateFieldId, endDateFieldId } = resolveTimelineFieldIds(
      layoutNodes,
      { dateField: "start" },
      fields,
    );
    expect(dateFieldId).toBe("start");
    expect(endDateFieldId).toBe("end");
  });

  it("respects explicit endDateField when valid", () => {
    const layoutNodes: TrackerLayoutNode[] = [
      { gridId: "g1", fieldId: "d1", order: 0 } as TrackerLayoutNode,
      { gridId: "g1", fieldId: "d2", order: 1 } as TrackerLayoutNode,
    ];
    const fields = [field("d1", "date", "A"), field("d2", "date", "B")];
    const { dateFieldId, endDateFieldId } = resolveTimelineFieldIds(
      layoutNodes,
      { dateField: "d2", endDateField: "d1" },
      fields,
    );
    expect(dateFieldId).toBe("d2");
    expect(endDateFieldId).toBe("d1");
  });
});

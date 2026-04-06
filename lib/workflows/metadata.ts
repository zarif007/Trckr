/**
 * Metadata extraction utilities for workflows.
 * Extracts tracker, grid, and field metadata from project data
 * for use in the workflow builder UI.
 */

export interface FieldMetadata {
  fieldId: string;
  label: string;
  dataType?: string;
}

export interface GridMetadata {
  gridId: string;
  label: string;
  fields: FieldMetadata[];
}

export interface TrackerMetadata {
  schemaId: string;
  name: string;
  grids: GridMetadata[];
}

interface TrackerSchemaObject {
  tabs?: Array<{
    sections?: Array<{
      fieldGroups?: Array<{
        fieldGroupId: string;
        label?: string;
        displayMode?: string;
        fields?: Array<{
          fieldId: string;
          label?: string;
          dataType?: string;
        }>;
      }>;
    }>;
  }>;
}

/**
 * Extracts metadata from a single tracker schema record.
 * Parses the schema JSON and extracts grids and their fields.
 */
export function extractTrackerMetadata(schemaRecord: {
  id: string;
  name: string | null;
  schema: unknown;
}): TrackerMetadata {
  const schemaObj = coerceTrackerSchemaObject(schemaRecord.schema);

  const grids: GridMetadata[] = (schemaObj.tabs || [])
    .flatMap((tab) => tab.sections || [])
    .flatMap((section) => section.fieldGroups || [])
    .filter((fg) => fg.displayMode === "grid")
    .map((fg) => ({
      gridId: fg.fieldGroupId,
      label: fg.label || fg.fieldGroupId,
      fields: (fg.fields || []).map((f) => ({
        fieldId: f.fieldId,
        label: f.label || f.fieldId,
        dataType: f.dataType,
      })),
    }));

  return {
    schemaId: schemaRecord.id,
    name: schemaRecord.name || "Unnamed Tracker",
    grids,
  };
}

function coerceTrackerSchemaObject(schema: unknown): TrackerSchemaObject {
  if (schema == null) return {};

  if (typeof schema === "string") {
    try {
      const parsed: unknown = JSON.parse(schema);
      if (parsed && typeof parsed === "object") return parsed as TrackerSchemaObject;
      return {};
    } catch {
      return {};
    }
  }

  if (typeof schema === "object") {
    return schema as TrackerSchemaObject;
  }

  return {};
}

/**
 * Extracts all tracker metadata from a project.
 * Includes both project-level and module-level trackers.
 */
export function extractTrackersFromProject(project: {
  trackerSchemas?: Array<{ id: string; name: string | null; schema: unknown }>;
  modules?: Array<{
    trackerSchemas?: Array<{
      id: string;
      name: string | null;
      schema: unknown;
    }>;
  }>;
}): TrackerMetadata[] {
  const trackers: TrackerMetadata[] = [];

  // Project-level trackers
  for (const schema of project.trackerSchemas || []) {
    trackers.push(extractTrackerMetadata(schema));
  }

  // Module-level trackers
  for (const projectModule of project.modules || []) {
    for (const schema of projectModule.trackerSchemas || []) {
      trackers.push(extractTrackerMetadata(schema));
    }
  }

  return trackers;
}

/**
 * Flattens all fields from all grids in all trackers into a single array.
 * Used for expression builder field picker.
 * Field IDs are prefixed with gridId for uniqueness: "gridId.fieldId"
 */
export function flattenTrackerFields(
  trackers: TrackerMetadata[]
): Array<{ fieldId: string; label: string; dataType?: string }> {
  return trackers.flatMap((tracker) =>
    tracker.grids.flatMap((grid) =>
      grid.fields.map((field) => ({
        fieldId: `${grid.gridId}.${field.fieldId}`,
        label: `${tracker.name} > ${grid.label} > ${field.label}`,
        dataType: field.dataType,
      }))
    )
  );
}

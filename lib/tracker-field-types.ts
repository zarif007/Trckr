export const TRACKER_FIELD_TYPES = [
  "string",
  "number",
  "date",
  "options",
  "multiselect",
  "dynamic_select",
  "dynamic_multiselect",
  "field_mappings",
  "boolean",
  "text",
  "link",
  "currency",
  "percentage",
  "status",
  "email",
  "phone",
  "url",
  "person",
  "files",
  "rating",
] as const;

export type TrackerFieldType = (typeof TRACKER_FIELD_TYPES)[number];

export const INTERNAL_ONLY_FIELD_TYPES: TrackerFieldType[] = ["field_mappings"];

export const CREATABLE_TRACKER_FIELD_TYPES: TrackerFieldType[] =
  TRACKER_FIELD_TYPES.filter(
    (type) => !INTERNAL_ONLY_FIELD_TYPES.includes(type),
  );

export const FIELD_TYPE_LABELS: Record<TrackerFieldType, string> = {
  string: "Short text",
  number: "Number",
  date: "Date",
  options: "Single select",
  multiselect: "Multi select",
  dynamic_select: "Dynamic single select",
  dynamic_multiselect: "Dynamic multi select",
  field_mappings: "Fields mapping",
  boolean: "Checkbox",
  text: "Long text",
  link: "Link",
  currency: "Currency",
  percentage: "Percentage",
  status: "Status",
  email: "Email",
  phone: "Phone",
  url: "URL",
  person: "Person",
  files: "Files",
  rating: "Rating",
};

export const FIELD_TYPE_GROUPS: Record<string, TrackerFieldType[]> = {
  Text: ["string", "text", "link", "email", "phone", "url"],
  Numbers: ["number", "currency", "percentage", "rating"],
  "Date & time": ["date"],
  Choice: [
    "status",
    "options",
    "multiselect",
    "dynamic_select",
    "dynamic_multiselect",
    "person",
  ],
  Other: ["boolean", "files"],
};

export const FIELD_TYPE_ORDER: TrackerFieldType[] = [
  "string",
  "text",
  "link",
  "email",
  "phone",
  "url",
  "number",
  "currency",
  "percentage",
  "rating",
  "date",
  "status",
  "options",
  "multiselect",
  "dynamic_select",
  "dynamic_multiselect",
  "person",
  "boolean",
  "files",
];

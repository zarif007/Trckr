/**
 * Schema version codec chain.
 *
 * Each codec migrates data from one schema version to the next.
 * Codecs are applied in sequence when a GridRow's `schemaVersion`
 * is behind the current `TrackerSchema.schemaVersion`.
 *
 * Register new codecs by pushing onto `CODEC_CHAIN`.
 */

export interface Codec {
  fromVersion: number;
  toVersion: number;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
  down?: (data: Record<string, unknown>) => Record<string, unknown>;
}

const CODEC_CHAIN: Codec[] = [];

export function registerCodec(codec: Codec): void {
  CODEC_CHAIN.push(codec);
  CODEC_CHAIN.sort((a, b) => a.fromVersion - b.fromVersion);
}

export function migrateRowData(
  data: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
): Record<string, unknown> {
  if (fromVersion >= toVersion) return data;

  let current = data;
  let currentVersion = fromVersion;

  for (const codec of CODEC_CHAIN) {
    if (codec.fromVersion < currentVersion) continue;
    if (codec.fromVersion > currentVersion) break;
    if (codec.toVersion > toVersion) break;

    current = codec.up(current);
    currentVersion = codec.toVersion;
  }

  return current;
}

export function rollbackRowData(
  data: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
): Record<string, unknown> {
  if (fromVersion <= toVersion) return data;

  const applicable = CODEC_CHAIN
    .filter((c) => c.toVersion <= fromVersion && c.fromVersion >= toVersion && c.down)
    .reverse();

  let current = data;
  for (const codec of applicable) {
    current = codec.down!(current);
  }

  return current;
}

export function getLatestCodecVersion(): number {
  if (CODEC_CHAIN.length === 0) return 1;
  return CODEC_CHAIN[CODEC_CHAIN.length - 1].toVersion;
}

export { CODEC_CHAIN };

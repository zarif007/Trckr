import { describe, it, expect, beforeEach } from "vitest";
import {
  registerCodec,
  migrateRowData,
  rollbackRowData,
  getLatestCodecVersion,
  CODEC_CHAIN,
} from "../codecs";

describe("codecs", () => {
  beforeEach(() => {
    CODEC_CHAIN.length = 0;
  });

  describe("registerCodec", () => {
    it("adds codec and sorts by fromVersion", () => {
      registerCodec({
        fromVersion: 2,
        toVersion: 3,
        up: (d) => d,
      });
      registerCodec({
        fromVersion: 1,
        toVersion: 2,
        up: (d) => d,
      });

      expect(CODEC_CHAIN[0].fromVersion).toBe(1);
      expect(CODEC_CHAIN[1].fromVersion).toBe(2);
    });
  });

  describe("migrateRowData", () => {
    it("returns data unchanged when fromVersion >= toVersion", () => {
      const data = { name: "Alice" };
      expect(migrateRowData(data, 3, 2)).toBe(data);
      expect(migrateRowData(data, 2, 2)).toBe(data);
    });

    it("applies codecs in sequence", () => {
      registerCodec({
        fromVersion: 1,
        toVersion: 2,
        up: (d) => ({ ...d, v2: true }),
      });
      registerCodec({
        fromVersion: 2,
        toVersion: 3,
        up: (d) => ({ ...d, v3: true }),
      });

      const result = migrateRowData({ name: "test" }, 1, 3);
      expect(result).toEqual({ name: "test", v2: true, v3: true });
    });

    it("applies partial range of codecs", () => {
      registerCodec({
        fromVersion: 1,
        toVersion: 2,
        up: (d) => ({ ...d, v2: true }),
      });
      registerCodec({
        fromVersion: 2,
        toVersion: 3,
        up: (d) => ({ ...d, v3: true }),
      });
      registerCodec({
        fromVersion: 3,
        toVersion: 4,
        up: (d) => ({ ...d, v4: true }),
      });

      const result = migrateRowData({ name: "test" }, 2, 3);
      expect(result).toEqual({ name: "test", v3: true });
      expect(result).not.toHaveProperty("v2");
      expect(result).not.toHaveProperty("v4");
    });
  });

  describe("rollbackRowData", () => {
    it("returns data unchanged when fromVersion <= toVersion", () => {
      const data = { name: "Alice" };
      expect(rollbackRowData(data, 1, 3)).toBe(data);
      expect(rollbackRowData(data, 2, 2)).toBe(data);
    });

    it("applies down codecs in reverse", () => {
      registerCodec({
        fromVersion: 1,
        toVersion: 2,
        up: (d) => ({ ...d, v2: true }),
        down: (d) => {
          const { v2: _, ...rest } = d;
          return rest;
        },
      });
      registerCodec({
        fromVersion: 2,
        toVersion: 3,
        up: (d) => ({ ...d, v3: true }),
        down: (d) => {
          const { v3: _, ...rest } = d;
          return rest;
        },
      });

      const result = rollbackRowData({ name: "test", v2: true, v3: true }, 3, 1);
      expect(result).toEqual({ name: "test" });
    });

    it("skips codecs without down", () => {
      registerCodec({
        fromVersion: 1,
        toVersion: 2,
        up: (d) => ({ ...d, v2: true }),
      });
      registerCodec({
        fromVersion: 2,
        toVersion: 3,
        up: (d) => ({ ...d, v3: true }),
        down: (d) => {
          const { v3: _, ...rest } = d;
          return rest;
        },
      });

      const result = rollbackRowData({ name: "test", v2: true, v3: true }, 3, 1);
      expect(result).toEqual({ name: "test", v2: true });
    });
  });

  describe("getLatestCodecVersion", () => {
    it("returns 1 when no codecs registered", () => {
      expect(getLatestCodecVersion()).toBe(1);
    });

    it("returns the highest toVersion", () => {
      registerCodec({ fromVersion: 1, toVersion: 2, up: (d) => d });
      registerCodec({ fromVersion: 2, toVersion: 5, up: (d) => d });
      expect(getLatestCodecVersion()).toBe(5);
    });
  });
});

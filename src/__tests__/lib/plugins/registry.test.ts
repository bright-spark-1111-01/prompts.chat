import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAuthPlugin,
  getAuthPlugin,
  getAllAuthPlugins,
  registerStoragePlugin,
  getStoragePlugin,
  getAllStoragePlugins,
  getRegistry,
} from "@/lib/plugins/registry";
import type { AuthPlugin, StoragePlugin } from "@/lib/plugins/types";

function makeAuthPlugin(id: string): AuthPlugin {
  return {
    id,
    name: `${id} auth`,
    // The concrete provider shape is irrelevant for registry behaviour.
    getProvider: () => ({}) as ReturnType<AuthPlugin["getProvider"]>,
  };
}

function makeStoragePlugin(id: string): StoragePlugin {
  return {
    id,
    name: `${id} storage`,
    upload: async () => ({ url: `https://example.com/${id}` }),
    isConfigured: () => true,
  };
}

describe("plugins/registry", () => {
  beforeEach(() => {
    // Registry is a module-level singleton; reset it between tests.
    const registry = getRegistry();
    registry.auth.clear();
    registry.storage.clear();
  });

  describe("auth plugins", () => {
    it("registers and retrieves an auth plugin by id", () => {
      const plugin = makeAuthPlugin("github");
      registerAuthPlugin(plugin);
      expect(getAuthPlugin("github")).toBe(plugin);
    });

    it("returns undefined for an unregistered id", () => {
      expect(getAuthPlugin("missing")).toBeUndefined();
    });

    it("overwrites a plugin registered with the same id", () => {
      registerAuthPlugin(makeAuthPlugin("github"));
      const replacement = makeAuthPlugin("github");
      registerAuthPlugin(replacement);
      expect(getAuthPlugin("github")).toBe(replacement);
      expect(getAllAuthPlugins()).toHaveLength(1);
    });

    it("lists all registered auth plugins", () => {
      registerAuthPlugin(makeAuthPlugin("github"));
      registerAuthPlugin(makeAuthPlugin("google"));
      expect(getAllAuthPlugins().map((p) => p.id).sort()).toEqual(["github", "google"]);
    });

    it("returns an empty list when none are registered", () => {
      expect(getAllAuthPlugins()).toEqual([]);
    });
  });

  describe("storage plugins", () => {
    it("registers and retrieves a storage plugin by id", () => {
      const plugin = makeStoragePlugin("s3");
      registerStoragePlugin(plugin);
      expect(getStoragePlugin("s3")).toBe(plugin);
    });

    it("returns undefined for an unregistered id", () => {
      expect(getStoragePlugin("missing")).toBeUndefined();
    });

    it("lists all registered storage plugins", () => {
      registerStoragePlugin(makeStoragePlugin("s3"));
      registerStoragePlugin(makeStoragePlugin("url"));
      expect(getAllStoragePlugins().map((p) => p.id).sort()).toEqual(["s3", "url"]);
    });
  });

  describe("getRegistry", () => {
    it("exposes the shared auth and storage maps", () => {
      const registry = getRegistry();
      expect(registry.auth).toBeInstanceOf(Map);
      expect(registry.storage).toBeInstanceOf(Map);

      registerAuthPlugin(makeAuthPlugin("github"));
      expect(registry.auth.has("github")).toBe(true);
    });

    it("returns the same singleton instance on each call", () => {
      expect(getRegistry()).toBe(getRegistry());
    });
  });
});

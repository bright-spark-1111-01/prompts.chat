import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Shared mock for the OpenAI chat completion call.
const createMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: createMock } };
      constructor(public opts: unknown) {}
    },
  };
});

const ORIGINAL_ENV = { ...process.env };

// Each test imports the module fresh so the internal OpenAI client singleton
// and the env-derived model constant are re-evaluated with the desired env.
async function loadModule() {
  vi.resetModules();
  return import("@/lib/slug");
}

function mockTranslation(text: string) {
  createMock.mockResolvedValue({
    choices: [{ message: { content: text } }],
  });
}

describe("slug translation helpers", () => {
  beforeEach(() => {
    createMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_GENERATIVE_MODEL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("translateToEnglish", () => {
    it("returns the original text when no API key is configured", async () => {
      const { translateToEnglish } = await loadModule();
      const result = await translateToEnglish("Merhaba dünya");
      expect(result).toBe("Merhaba dünya");
      expect(createMock).not.toHaveBeenCalled();
    });

    it("returns the translated text when an API key is configured", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockTranslation("Hello world");
      const { translateToEnglish } = await loadModule();

      const result = await translateToEnglish("Merhaba dünya");
      expect(result).toBe("Hello world");
      expect(createMock).toHaveBeenCalledOnce();
    });

    it("trims whitespace from the translation", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockTranslation("  Hello world  ");
      const { translateToEnglish } = await loadModule();

      expect(await translateToEnglish("x")).toBe("Hello world");
    });

    it("falls back to the original text when the response has no content", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
      const { translateToEnglish } = await loadModule();

      expect(await translateToEnglish("original")).toBe("original");
    });

    it("falls back to the original text when the API call throws", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      createMock.mockRejectedValue(new Error("network down"));
      const { translateToEnglish } = await loadModule();

      expect(await translateToEnglish("original")).toBe("original");
    });

    it("uses a custom generative model when configured", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      process.env.OPENAI_GENERATIVE_MODEL = "gpt-4o";
      mockTranslation("Hello");
      const { translateToEnglish } = await loadModule();

      await translateToEnglish("Hola");
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-4o" })
      );
    });
  });

  describe("generateSlug", () => {
    it("slugifies English titles without translating", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      const { generateSlug } = await loadModule();

      const slug = await generateSlug("Act as a Code Reviewer");
      expect(slug).toBe("act-as-a-code-reviewer");
      expect(createMock).not.toHaveBeenCalled();
    });

    it("translates non-English titles before slugifying", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockTranslation("English Translator");
      const { generateSlug } = await loadModule();

      const slug = await generateSlug("İngilizce Çevirmen");
      expect(slug).toBe("english-translator");
      expect(createMock).toHaveBeenCalledOnce();
    });

    it("slugifies non-English titles as-is when no API key is set", async () => {
      const { generateSlug } = await loadModule();
      const slug = await generateSlug("Привет мир");
      // Non-ASCII characters are stripped by slugify, leaving an empty slug.
      expect(slug).toBe("");
    });
  });

  describe("generatePromptSlug", () => {
    it("always attempts translation, even for English titles", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockTranslation("My Prompt");
      const { generatePromptSlug } = await loadModule();

      const slug = await generatePromptSlug("My Prompt");
      expect(slug).toBe("my-prompt");
      expect(createMock).toHaveBeenCalledOnce();
    });

    it("slugifies the original title when translation is unavailable", async () => {
      const { generatePromptSlug } = await loadModule();
      const slug = await generatePromptSlug("Hello World");
      expect(slug).toBe("hello-world");
    });
  });
});

import { describe, expect, it } from "vitest";
import { cleanText, phraseKey, stem, termRegExp, tokenize } from "../text";

describe("stem", () => {
  it("treats word forms of the same root as equal", () => {
    const forms = ["manage", "managed", "managing", "management", "manager"].map(stem);
    expect(new Set(forms).size).toBe(1);
  });

  it("keeps words ending in double s intact", () => {
    expect(stem("business")).toBe("business");
    expect(stem("processes")).toBe(stem("process"));
  });
});

describe("tokenize", () => {
  it("keeps tech terms with symbols together", () => {
    const tokens = tokenize("Node.js, C++, C# and .NET.").map((t) => t.text);
    expect(tokens).toEqual(["Node.js", "C++", "C#", "and", ".NET"]);
  });
});

describe("phraseKey", () => {
  it("normalizes case and word forms", () => {
    expect(phraseKey("Project Managers")).toBe(phraseKey("project management"));
  });
});

describe("cleanText", () => {
  it("removes control characters, normalizes newlines and enforces the limit", () => {
    expect(cleanText("a\r\nb\u0000c​d", 100)).toBe("a\nbcd");
    expect(cleanText("abcdef", 3)).toBe("abc");
  });
});

describe("termRegExp", () => {
  it("escapes regex characters in terms", () => {
    expect("I know C++ well".replace(termRegExp("C++"), "X")).toBe("I know X well");
    expect(() => termRegExp("(a+)+$ [x]")).not.toThrow();
  });

  it("does not match inside emails or longer words", () => {
    expect("abebe.js@example.com".replace(termRegExp("js"), "X")).toBe("abebe.js@example.com");
    expect("jsx and JS".replace(termRegExp("JS", false), "X")).toBe("jsx and X");
  });
});

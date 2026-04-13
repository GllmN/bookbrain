import { beforeEach, describe, expect, it, vi } from "vitest";

// Remplace le chemin SQLite par une base en mémoire — évite de toucher aux fichiers réels
vi.mock("../config/index.js", () => ({
  config: { sqlitePath: ":memory:" },
}));

import {
  clearAllSessions,
  deleteBook,
  deleteSession,
  getAllBooks,
  getAllSessions,
  getBookById,
  getDb,
  getSessionById,
  insertBook,
  insertSession,
  isFileIndexed,
  updateSession,
} from "./database.js";
import type { Book, HistorySession } from "../models/types.js";

// ── Helpers ───────────────────────────────────────

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Clean Code",
    author: "Robert C. Martin",
    filePath: "/library/clean-code.pdf",
    fileType: "pdf",
    totalChunks: 42,
    indexedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(overrides: Partial<HistorySession> = {}): HistorySession {
  return {
    id: "session-1",
    type: "ask",
    title: "Qu'est-ce que le clean code ?",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Remet les tables à zéro avant chaque test
beforeEach(() => {
  getDb().exec("DELETE FROM books; DELETE FROM history_sessions;");
});

// ── Books ─────────────────────────────────────────

describe("insertBook / getAllBooks", () => {
  it("insère un livre et le retrouve dans la liste", () => {
    insertBook(makeBook());
    const books = getAllBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("Clean Code");
  });

  it("retourne une liste vide si aucun livre indexé", () => {
    expect(getAllBooks()).toHaveLength(0);
  });

  it("remplace un livre existant sur même id (INSERT OR REPLACE)", () => {
    insertBook(makeBook());
    insertBook(makeBook({ title: "Clean Code 2nd Edition" }));
    const books = getAllBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("Clean Code 2nd Edition");
  });

  it("retourne les livres triés par titre", () => {
    insertBook(makeBook({ id: "b2", title: "Refactoring", filePath: "/refactoring.pdf" }));
    insertBook(makeBook({ id: "b1", title: "Clean Code", filePath: "/clean-code.pdf" }));
    const titles = getAllBooks().map((b) => b.title);
    expect(titles).toEqual(["Clean Code", "Refactoring"]);
  });

  it("préserve coverPath undefined quand non fourni", () => {
    insertBook(makeBook());
    expect(getAllBooks()[0].coverPath).toBeUndefined();
  });

  it("préserve coverPath quand fourni", () => {
    insertBook(makeBook({ coverPath: "/covers/clean-code.jpg" }));
    expect(getAllBooks()[0].coverPath).toBe("/covers/clean-code.jpg");
  });
});

describe("getBookById", () => {
  it("retourne le livre correspondant à l'id", () => {
    insertBook(makeBook());
    const book = getBookById("book-1");
    expect(book?.id).toBe("book-1");
    expect(book?.author).toBe("Robert C. Martin");
  });

  it("retourne undefined pour un id inexistant", () => {
    expect(getBookById("inexistant")).toBeUndefined();
  });
});

describe("deleteBook", () => {
  it("supprime le livre et retourne true", () => {
    insertBook(makeBook());
    expect(deleteBook("book-1")).toBe(true);
    expect(getAllBooks()).toHaveLength(0);
  });

  it("retourne false si le livre n'existe pas", () => {
    expect(deleteBook("inexistant")).toBe(false);
  });
});

describe("isFileIndexed", () => {
  it("retourne true si le chemin est déjà indexé", () => {
    insertBook(makeBook());
    expect(isFileIndexed("/library/clean-code.pdf")).toBe(true);
  });

  it("retourne false si le chemin n'est pas indexé", () => {
    expect(isFileIndexed("/library/inconnu.pdf")).toBe(false);
  });
});

// ── History Sessions ──────────────────────────────

describe("insertSession / getAllSessions", () => {
  it("insère une session et la retrouve dans la liste", () => {
    insertSession(makeSession());
    const sessions = getAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe("Qu'est-ce que le clean code ?");
  });

  it("retourne une liste vide si aucune session", () => {
    expect(getAllSessions()).toHaveLength(0);
  });

  it("retourne les sessions triées par date décroissante", () => {
    insertSession(makeSession({ id: "s1", createdAt: "2026-01-01T00:00:00.000Z" }));
    insertSession(makeSession({ id: "s2", createdAt: "2026-06-01T00:00:00.000Z" }));
    const ids = getAllSessions().map((s) => s.id);
    expect(ids).toEqual(["s2", "s1"]);
  });

  it("sérialise et désérialise correctement les messages JSON", () => {
    const messages = [{ role: "user" as const, content: "Bonjour", timestamp: "2026-01-01T00:00:00.000Z" }];
    insertSession(makeSession({ messages }));
    expect(getAllSessions()[0].messages).toEqual(messages);
  });

  it("gère une session de type search avec searchQuery", () => {
    insertSession(makeSession({ id: "s2", type: "search", searchQuery: "design patterns", searchTook: 120 }));
    const session = getSessionById("s2");
    expect(session?.searchQuery).toBe("design patterns");
    expect(session?.searchTook).toBe(120);
  });
});

describe("getSessionById", () => {
  it("retourne la session correspondante", () => {
    insertSession(makeSession());
    expect(getSessionById("session-1")?.type).toBe("ask");
  });

  it("retourne undefined pour un id inexistant", () => {
    expect(getSessionById("inexistant")).toBeUndefined();
  });
});

describe("updateSession", () => {
  it("met à jour les messages d'une session", () => {
    insertSession(makeSession());
    const messages = [{ role: "assistant" as const, content: "Réponse", timestamp: "2026-01-01T00:00:00.000Z" }];
    updateSession("session-1", { messages });
    expect(getSessionById("session-1")?.messages).toEqual(messages);
  });

  it("met à jour les searchResults et searchTook", () => {
    insertSession(makeSession({ id: "s2", type: "search" }));
    updateSession("s2", { searchResults: [], searchTook: 250 });
    const session = getSessionById("s2");
    expect(session?.searchResults).toEqual([]);
    expect(session?.searchTook).toBe(250);
  });
});

describe("deleteSession", () => {
  it("supprime la session et retourne true", () => {
    insertSession(makeSession());
    expect(deleteSession("session-1")).toBe(true);
    expect(getAllSessions()).toHaveLength(0);
  });

  it("retourne false si la session n'existe pas", () => {
    expect(deleteSession("inexistant")).toBe(false);
  });
});

describe("clearAllSessions", () => {
  it("vide toutes les sessions", () => {
    insertSession(makeSession({ id: "s1" }));
    insertSession(makeSession({ id: "s2" }));
    clearAllSessions();
    expect(getAllSessions()).toHaveLength(0);
  });
});

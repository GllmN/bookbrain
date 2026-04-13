import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConversationService } from './conversation.service';
import { ApiService } from './api.service';
import { ChatMessage, HistorySession } from '../models/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<HistorySession> = {}): HistorySession {
  return {
    id: 'session-1',
    type: 'ask',
    title: 'Session test',
    createdAt: '2026-01-01T00:00:00.000Z',
    messages: [],
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    role: 'user',
    content: 'Bonjour',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ConversationService', () => {
  let service: ConversationService;
  let apiSpy: {
    getHistory: jest.Mock;
    createSession: jest.Mock;
    updateSession: jest.Mock;
    deleteHistorySession: jest.Mock;
    clearHistory: jest.Mock;
  };

  beforeEach(() => {
    apiSpy = {
      getHistory: jest.fn().mockReturnValue(of([])),
      createSession: jest.fn().mockReturnValue(of(null)),
      updateSession: jest.fn().mockReturnValue(of(null)),
      deleteHistorySession: jest.fn().mockReturnValue(of(null)),
      clearHistory: jest.fn().mockReturnValue(of(null)),
    };

    TestBed.configureTestingModule({
      providers: [
        ConversationService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(ConversationService);
  });

  afterEach(() => TestBed.resetTestingModule());

  // ── buildSession ─────────────────────────────────────────────────────────────

  describe('buildSession', () => {
    it('cree une session de type "ask" avec un tableau de messages vide', () => {
      const session = service.buildSession('ask', 'Ma question');
      expect(session.type).toBe('ask');
      expect(session.messages).toEqual([]);
    });

    it('cree une session de type "search" sans tableau de messages', () => {
      const session = service.buildSession('search', 'Ma recherche');
      expect(session.type).toBe('search');
      expect(session.messages).toBeUndefined();
    });

    it('utilise la requete comme titre si elle fait 60 caracteres ou moins', () => {
      const query = 'Une question courte';
      const session = service.buildSession('ask', query);
      expect(session.title).toBe(query);
    });

    it('tronque le titre a 60 caracteres et ajoute "..." si la requete est trop longue', () => {
      const query = 'A'.repeat(80);
      const session = service.buildSession('ask', query);
      expect(session.title).toBe('A'.repeat(60) + '\u2026');
      expect(session.title.length).toBe(61);
    });

    it('genere un identifiant UUID v4 unique a chaque appel', () => {
      const s1 = service.buildSession('ask', 'Q1');
      const s2 = service.buildSession('ask', 'Q2');
      expect(s1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(s1.id).not.toBe(s2.id);
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  describe('selectSession / startNewChat / activeSession', () => {
    it('activeSession vaut null au demarrage', () => {
      expect(service.activeSession()).toBeNull();
    });

    it('selectSession active la session correspondante', () => {
      const session = makeSession({ id: 'abc' });
      service.sessions.set([session]);
      service.selectSession('abc');
      expect(service.activeSession()).toEqual(session);
    });

    it('activeSession vaut null si l id ne correspond a aucune session', () => {
      service.sessions.set([makeSession({ id: 'abc' })]);
      service.selectSession('inexistant');
      expect(service.activeSession()).toBeNull();
    });

    it('startNewChat reinitialise activeSession a null', () => {
      service.sessions.set([makeSession({ id: 'abc' })]);
      service.selectSession('abc');
      service.startNewChat();
      expect(service.activeSession()).toBeNull();
    });
  });

  // ── createSession ─────────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('ajoute la session en tete de liste et l active', () => {
      const existing = makeSession({ id: 'old' });
      service.sessions.set([existing]);
      const newSession = makeSession({ id: 'new' });
      service.createSession(newSession);
      expect(service.sessions()[0].id).toBe('new');
      expect(service.activeSessionId()).toBe('new');
    });

    it('appelle l API de persistance', () => {
      service.createSession(makeSession());
      expect(apiSpy.createSession).toHaveBeenCalledTimes(1);
    });
  });

  // ── appendMessage ─────────────────────────────────────────────────────────────

  describe('appendMessage', () => {
    it('ajoute un message a la session ciblee', () => {
      service.sessions.set([makeSession({ id: 's1', messages: [] })]);
      service.appendMessage('s1', makeMessage({ content: 'Nouveau message' }));
      expect(service.sessions()[0].messages).toHaveLength(1);
      expect(service.sessions()[0].messages![0].content).toBe('Nouveau message');
    });

    it('ne modifie pas les autres sessions', () => {
      service.sessions.set([
        makeSession({ id: 's1', messages: [] }),
        makeSession({ id: 's2', messages: [] }),
      ]);
      service.appendMessage('s1', makeMessage());
      expect(service.sessions()[1].messages).toHaveLength(0);
    });
  });

  // ── appendToken ───────────────────────────────────────────────────────────────

  describe('appendToken', () => {
    it('concatene le token au contenu du dernier message assistant', () => {
      const assistantMsg = makeMessage({ role: 'assistant', content: 'Bonjour' });
      service.sessions.set([makeSession({ id: 's1', messages: [assistantMsg] })]);
      service.appendToken('s1', ' monde');
      expect(service.sessions()[0].messages![0].content).toBe('Bonjour monde');
    });

    it('n ajoute rien si le dernier message n est pas de l assistant', () => {
      const userMsg = makeMessage({ role: 'user', content: 'Question' });
      service.sessions.set([makeSession({ id: 's1', messages: [userMsg] })]);
      service.appendToken('s1', ' token');
      expect(service.sessions()[0].messages![0].content).toBe('Question');
    });

    it('ne modifie pas les autres sessions', () => {
      service.sessions.set([
        makeSession({ id: 's1', messages: [makeMessage({ role: 'assistant', content: 'Rep1' })] }),
        makeSession({ id: 's2', messages: [makeMessage({ role: 'assistant', content: 'Rep2' })] }),
      ]);
      service.appendToken('s1', ' +');
      expect(service.sessions()[1].messages![0].content).toBe('Rep2');
    });
  });

  // ── updateLastMessage ─────────────────────────────────────────────────────────

  describe('updateLastMessage', () => {
    it('applique le patch au dernier message assistant', () => {
      const assistantMsg = makeMessage({ role: 'assistant', content: 'Reponse initiale' });
      service.sessions.set([makeSession({ id: 's1', messages: [assistantMsg] })]);
      service.updateLastMessage('s1', { content: 'Reponse mise a jour' });
      expect(service.sessions()[0].messages![0].content).toBe('Reponse mise a jour');
    });

    it('n applique pas le patch si le dernier message n est pas de l assistant', () => {
      const userMsg = makeMessage({ role: 'user', content: 'Question' });
      service.sessions.set([makeSession({ id: 's1', messages: [userMsg] })]);
      service.updateLastMessage('s1', { content: 'Modifie' });
      expect(service.sessions()[0].messages![0].content).toBe('Question');
    });
  });

  // ── patchSession ──────────────────────────────────────────────────────────────

  describe('patchSession', () => {
    it('met a jour les champs de la session ciblee', () => {
      service.sessions.set([makeSession({ id: 's1', title: 'Ancien titre' })]);
      service.patchSession('s1', { title: 'Nouveau titre' });
      expect(service.sessions()[0].title).toBe('Nouveau titre');
    });

    it('ne modifie pas les autres sessions', () => {
      service.sessions.set([
        makeSession({ id: 's1', title: 'S1' }),
        makeSession({ id: 's2', title: 'S2' }),
      ]);
      service.patchSession('s1', { title: 'S1 modifie' });
      expect(service.sessions()[1].title).toBe('S2');
    });
  });

  // ── deleteSession ─────────────────────────────────────────────────────────────

  describe('deleteSession', () => {
    it('retire la session de la liste', () => {
      service.sessions.set([makeSession({ id: 's1' }), makeSession({ id: 's2' })]);
      service.deleteSession('s1');
      expect(service.sessions().map(s => s.id)).toEqual(['s2']);
    });

    it('reinitialise activeSessionId si la session active est supprimee', () => {
      service.sessions.set([makeSession({ id: 's1' })]);
      service.selectSession('s1');
      service.deleteSession('s1');
      expect(service.activeSessionId()).toBeNull();
    });

    it('ne reinitialise pas activeSessionId si une autre session est supprimee', () => {
      service.sessions.set([makeSession({ id: 's1' }), makeSession({ id: 's2' })]);
      service.selectSession('s1');
      service.deleteSession('s2');
      expect(service.activeSessionId()).toBe('s1');
    });

    it('appelle l API de suppression avec le bon id', () => {
      service.sessions.set([makeSession({ id: 's1' })]);
      service.deleteSession('s1');
      expect(apiSpy.deleteHistorySession).toHaveBeenCalledWith('s1');
    });
  });

  // ── clearHistory ──────────────────────────────────────────────────────────────

  describe('clearHistory', () => {
    it('vide la liste des sessions', () => {
      service.sessions.set([makeSession({ id: 's1' }), makeSession({ id: 's2' })]);
      service.clearHistory();
      expect(service.sessions()).toHaveLength(0);
    });

    it('reinitialise activeSessionId', () => {
      service.sessions.set([makeSession({ id: 's1' })]);
      service.selectSession('s1');
      service.clearHistory();
      expect(service.activeSessionId()).toBeNull();
    });

    it('appelle l API de suppression globale', () => {
      service.clearHistory();
      expect(apiSpy.clearHistory).toHaveBeenCalledTimes(1);
    });
  });
});

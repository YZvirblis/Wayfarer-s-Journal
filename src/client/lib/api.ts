import type {
  BackupInfo,
  CharacterDocument,
  CharacterSummary,
  ImportResult,
  RestoreMode,
  Settings,
} from '../../shared/schema';

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    throw new ApiError('Cannot reach the journal server. Is it still running?');
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep the status-based message
    }
    throw new ApiError(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listCharacters: () => request<CharacterSummary[]>('/characters'),
  createCharacter: (name: string) =>
    request<CharacterDocument>('/characters', { method: 'POST', body: JSON.stringify({ name }) }),
  getCharacter: (id: string) => request<CharacterDocument>(`/characters/${id}`),
  saveCharacter: (doc: CharacterDocument) =>
    request<CharacterDocument>(`/characters/${doc.id}`, { method: 'PUT', body: JSON.stringify(doc) }),
  deleteCharacter: (id: string) => request<void>(`/characters/${id}`, { method: 'DELETE' }),
  duplicateCharacter: (id: string) => request<CharacterDocument>(`/characters/${id}/duplicate`, { method: 'POST' }),
  importExample: () => request<CharacterDocument>('/characters/example', { method: 'POST' }),
  listBackups: (id: string) => request<BackupInfo[]>(`/characters/${id}/backups`),
  restoreBackup: (id: string, file: string, mode: RestoreMode) =>
    request<CharacterDocument>(`/characters/${id}/restore`, { method: 'POST', body: JSON.stringify({ file, mode }) }),
  /** `commit: false` validates and migrates without writing, returning only the summary. */
  importCharacter: (document: unknown, commit: boolean) =>
    request<ImportResult>('/characters/import', { method: 'POST', body: JSON.stringify({ document, commit }) }),
  getSettings: () => request<Settings>('/settings'),
  saveSettings: (settings: Settings) => request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

import type { JoinCreateVenueSelection } from './join-create-venue';

type JoinCreateDraft = {
  players: number;
  selectedVenue: JoinCreateVenueSelection | null;
};

let draft: JoinCreateDraft | null = null;

export function saveJoinCreateDraft(next: JoinCreateDraft) {
  draft = { ...next };
}

export function peekJoinCreateDraft(): JoinCreateDraft | null {
  return draft ? { ...draft, selectedVenue: draft.selectedVenue ? { ...draft.selectedVenue } : null } : null;
}

export function clearJoinCreateDraft() {
  draft = null;
}

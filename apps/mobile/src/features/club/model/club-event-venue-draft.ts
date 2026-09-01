import type { JoinCreateVenueSelection } from '../../join-create/model/join-create-venue';

type ClubEventVenueDraft = {
  clubId: string;
  selectedVenue: JoinCreateVenueSelection;
};

let draft: ClubEventVenueDraft | null = null;

export function saveClubEventVenueDraft(next: ClubEventVenueDraft) {
  draft = {
    clubId: next.clubId,
    selectedVenue: { ...next.selectedVenue },
  };
}

export function peekClubEventVenueDraft(clubId: string): JoinCreateVenueSelection | null {
  if (!draft || draft.clubId !== clubId) return null;
  return { ...draft.selectedVenue };
}

export function clearClubEventVenueDraft() {
  draft = null;
}

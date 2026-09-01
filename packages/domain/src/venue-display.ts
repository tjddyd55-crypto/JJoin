/**
 * Venue label SSOT for Join/Club event forms — never expose raw IDs.
 */

export function resolveVenueDisplayName(input: {
  golfFacilityDisplayName?: string | null;
  activatedVenueName?: string | null;
  storedVenueName?: string | null;
}): string {
  const facility = input.golfFacilityDisplayName?.trim();
  if (facility) return facility;
  const activated = input.activatedVenueName?.trim();
  if (activated) return activated;
  const stored = input.storedVenueName?.trim();
  if (stored) return stored;
  return '';
}

export function isRawVenueIdLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
    return true;
  }
  if (t.startsWith('{') || t.startsWith('[')) return true;
  return false;
}

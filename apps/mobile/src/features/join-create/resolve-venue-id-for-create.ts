import type { ApiClient } from '@jjoin/api-client';
import type { JoinCreateVenueSelection } from './model/join-create-venue';

/**
 * Ensures an activated venueId exists before POST /joins.
 * CUSTOM selections from map deep-links may only have name/address until persisted.
 */
export async function resolveVenueIdForCreate(
  api: ApiClient,
  selected: JoinCreateVenueSelection,
): Promise<string> {
  if (selected.venueId?.trim()) return selected.venueId.trim();

  if (selected.source === 'CUSTOM') {
    const name = selected.name.trim();
    const address = selected.address.trim();
    if (!name || !address) {
      throw new Error('venue_not_ready');
    }
    const created = await api.createCustomVenue({
      name,
      address,
      phone: selected.phone ?? null,
    });
    return created.venueId;
  }

  throw new Error('venue_not_ready');
}

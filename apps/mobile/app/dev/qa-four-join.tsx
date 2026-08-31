import { Redirect } from 'expo-router';
import { DEV_QA_FOUR_PARTICIPANT_JOIN_ID } from '../../src/lib/dev-qa-joins';
import { isInternalToolsEnabled } from '../../src/lib/internal-tools';

/**
 * DEV-only redirect to the fixed 4-participant attendance QA join.
 * Stable automation entry: jjoindev://dev/qa-four-join
 */
export default function DevQaFourJoinScreen() {
  if (!isInternalToolsEnabled()) {
    return <Redirect href="/(tabs)/my" />;
  }
  return <Redirect href={`/join/${DEV_QA_FOUR_PARTICIPANT_JOIN_ID}`} />;
}

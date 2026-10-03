import { Redirect, type Href } from 'expo-router';

/** Legacy session-review hub — preserved server-side; UI redirects to community board. */
export default function LegacyJoinSessionReviewsRedirect() {
  return <Redirect href={'/reviews' as Href} />;
}

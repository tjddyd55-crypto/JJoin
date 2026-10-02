import { HomeScreen } from '../../src/features/home/screens/HomeScreen';
import { useAndroidDoubleBackExit } from '../../src/features/navigation/useAndroidDoubleBackExit';

export default function HomeTabRoute() {
  const { exitHint } = useAndroidDoubleBackExit(true);
  return (
    <>
      <HomeScreen />
      {exitHint}
    </>
  );
}

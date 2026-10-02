import { StyleSheet, View } from 'react-native';
import { HomeScreen } from '../../src/features/home/screens/HomeScreen';
import { useAndroidDoubleBackExit } from '../../src/features/navigation/useAndroidDoubleBackExit';

export default function HomeTabRoute() {
  const { exitHint } = useAndroidDoubleBackExit(true);
  return (
    <View style={styles.root}>
      <HomeScreen />
      {exitHint}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

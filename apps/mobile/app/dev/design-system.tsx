import { ScrollView, View, StyleSheet } from 'react-native';
import {
  ThemeProvider,
  Text,
  Button,
  IconButton,
  Input,
  Card,
  Chip,
  Badge,
  AppBar,
  BottomNavigation,
  BottomSheetFrame,
  ListRow,
  Section,
  ScreenFrame,
  ScrollScreenFrame,
  StickyActionFrame,
  Icon,
  Row,
  Spacer,
  Divider,
  useTheme,
  clubMinimalTheme,
} from '@jjoin/design-system';

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <Row align="center" gap="sm">
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </Row>
  );
}

function CatalogBody() {
  const theme = useTheme();

  return (
    <ScrollScreenFrame>
      <Text variant="headline" tone="primary">
        Design System Catalog
      </Text>
      <Text variant="meta" tone="tertiary">
        Club Minimal — dev only
      </Text>
      <Spacer size="lg" />

      <Section title="Colors" subtitle="Semantic tokens">
        <ColorSwatch label="app.background" color={theme.colors.app.background} />
        <ColorSwatch label="surface.card" color={theme.colors.surface.card} />
        <ColorSwatch label="action.primary" color={theme.colors.action.primary} />
        <ColorSwatch label="text.primary" color={theme.colors.text.primary} />
      </Section>

      <Section title="Typography">
        <Text variant="display">Display</Text>
        <Text variant="screenTitle">Screen Title</Text>
        <Text variant="sectionTitle">Section Title</Text>
        <Text variant="body">Body text</Text>
        <Text variant="caption" tone="tertiary">
          Caption
        </Text>
        <Text variant="coinLarge" tone="primary">
          1,250
        </Text>
      </Section>

      <Section title="Buttons">
        <Button label="Primary CTA" variant="primary" />
        <Button label="Secondary" variant="secondary" />
        <Button label="Ghost" variant="ghost" />
        <Button label="Loading" variant="primary" loading />
        <Button label="Disabled" variant="primary" disabled />
        <Row gap="sm">
          <IconButton icon="notification" accessibilityLabel="알림" variant="surface" />
          <IconButton icon="search" accessibilityLabel="검색" selected />
        </Row>
      </Section>

      <Section title="Input">
        <Input label="Reward" placeholder="0" helper="Quick add below" />
        <Input label="Error state" error="Invalid amount" defaultValue="abc" />
      </Section>

      <Section title="Card & Chip & Badge">
        <Card variant="elevated">
          <Text variant="venueTitle">Card elevated</Text>
          <Text variant="meta" tone="secondary">
            Internal padding from token
          </Text>
        </Card>
        <Row gap="sm" style={{ flexWrap: 'wrap' }}>
          <Chip label="Filter" />
          <Chip label="Selected" selected />
          <Chip label="+10" variant="quickAdd" />
        </Row>
        <Row gap="sm">
          <Badge label="Neutral" />
          <Badge label="Gold" variant="gold" />
          <Badge label="Success" variant="success" />
        </Row>
      </Section>

      <Section title="Icons">
        <Row gap="md">
          <Icon name="home" tone="gold" />
          <Icon name="map" />
          <Icon name="coin" tone="gold" />
          <Icon name="location" />
        </Row>
      </Section>

      <Section title="Bottom Sheet Frame">
        <BottomSheetFrame>
          <Text variant="sectionTitle">Venue sheet preview</Text>
          <Text variant="body" tone="secondary">
            Visual frame — runtime sheet is separate
          </Text>
        </BottomSheetFrame>
      </Section>

      <Section title="ListRow">
        <Card variant="base" padding="none" style={{ paddingHorizontal: 16 }}>
          <ListRow label="계정 관리" icon="profile" onPress={() => {}} />
          <ListRow label="알림 설정" icon="notification" onPress={() => {}} />
          <ListRow label="로그아웃" onPress={() => {}} />
          <ListRow label="회원탈퇴" tone="danger" onPress={() => {}} showSeparator={false} />
        </Card>
      </Section>

      <Section title="Patterns (mobile)" subtitle="Domain UI — not DS core">
        <Text variant="meta" tone="tertiary">
          JoinCard · RewardCoinInput · SettingRow alias · apps/mobile/src/ui/patterns
        </Text>
        <Text variant="caption" tone="secondary">
          Open product screens to preview real pattern usage (Home empty states, Create reward, Map
          venue sheet).
        </Text>
      </Section>

      <Spacer size="xxl" />
    </ScrollScreenFrame>
  );
}

import { isInternalToolsEnabled } from '../../src/lib/internal-tools';

export default function DesignSystemCatalogScreen() {
  if (!isInternalToolsEnabled()) {
    return (
      <ScreenFrame>
        <Text tone="secondary">사용할 수 없는 화면입니다.</Text>
      </ScreenFrame>
    );
  }

  return (
    <ThemeProvider theme={clubMinimalTheme}>
      <View style={styles.root}>
        <AppBar title="DS Catalog" onBack={() => {}} showBack={false} />
        <CatalogBody />
        <StickyActionFrame>
          <Button label="Sticky CTA" variant="primary" />
        </StickyActionFrame>
        <BottomNavigation
          items={[
            { key: 'home', label: '홈', icon: 'home', active: true, onPress: () => {} },
            { key: 'map', label: '지도', icon: 'map', onPress: () => {} },
            { key: 'create', label: '만들기', icon: 'create', onPress: () => {} },
            { key: 'wallet', label: '지갑', icon: 'wallet', onPress: () => {} },
            { key: 'profile', label: '프로필', icon: 'profile', onPress: () => {} },
          ]}
        />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  swatch: { width: 28, height: 28, borderRadius: 6 },
});

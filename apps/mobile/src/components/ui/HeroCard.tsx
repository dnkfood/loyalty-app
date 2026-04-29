import type { ReactNode } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Fonts, Radii, Shadow } from '../../theme/tokens';
import { Chip } from './Chip';

interface HeroCardProps {
  tier?: string;
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  borderRadius?: number;
}

export function HeroCard({
  tier,
  children,
  style,
  padding = 22,
  borderRadius = Radii.xl,
}: HeroCardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding, borderRadius },
        Shadow.hero,
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.brandText}>DNK FOOD</Text>
        </View>
        {tier ? <Chip label={tier} onHero /> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.hero,
    borderWidth: 1,
    borderColor: Colors.heroBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    height: 28,
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: Fonts.sansBold,
    fontSize: 18,
    color: Colors.heroInk,
    letterSpacing: 2.5,
  },
});

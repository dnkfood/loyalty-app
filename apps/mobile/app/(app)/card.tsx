import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  TouchableOpacity,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getLoyaltyCard, getBalance } from '../../src/api/loyalty.api';
import { ScreenContainer } from '../../src/theme/ScreenContainer';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { Chip } from '../../src/components/ui/Chip';
import { useBrightnessBoost } from '../../src/hooks/useBrightnessBoost';
import { Colors, Type, Fonts, Spacing, Radii, Shadow } from '../../src/theme/tokens';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

export default function CardScreen() {
  useBrightnessBoost();
  const { width } = useWindowDimensions();
  const qrSize = Math.min(width - 120, 220);

  const card = useQuery({
    queryKey: ['loyalty', 'card'],
    queryFn: getLoyaltyCard,
    staleTime: 60_000,
  });
  const balance = useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: getBalance,
    staleTime: 60_000,
  });

  const tier = (balance.data?.statusName || balance.data?.statusLevel || '').toUpperCase() || 'FRIEND';
  const code = card.data?.qrData ?? '';
  const refreshing = card.isRefetching || balance.isRefetching;

  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const handleCopy = async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopyState('copied');
      showToast('Скопировано');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch (err) {
      console.warn('[Card] copy failed', err);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void card.refetch();
              void balance.refetch();
            }}
            tintColor={Colors.ink}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Карта лояльности" />

        <View style={styles.heroWrap}>
          <View style={[styles.hero, Shadow.hero]}>
            <View style={styles.heroHeader}>
              <Text style={styles.brandText}>DNK</Text>
              <Chip label={tier} onHero />
            </View>

            <View style={styles.qrPanel}>
              <View style={[styles.qrInner, { width: qrSize + 36, height: qrSize + 36 }]}>
                {code ? (
                  <QRCode
                    value={code}
                    size={qrSize}
                    color={Colors.hero}
                    backgroundColor={Colors.heroInk}
                    ecl="H"
                  />
                ) : card.isLoading ? (
                  <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]} />
                ) : (
                  <Text style={styles.qrError}>Не удалось получить QR</Text>
                )}
                {code ? (
                  <View style={styles.qrLogo}>
                    <Text style={styles.qrLogoText}>DNK</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.heroFooter}>
              <View style={styles.cardNumberWrap}>
                <Text style={styles.cardNumberLabel}>НОМЕР КАРТЫ</Text>
                <Text style={styles.cardNumber}>{code || '—'}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleCopy}
                activeOpacity={0.7}
                disabled={!code}
              >
                <Ionicons
                  name={copyState === 'copied' ? 'checkmark-outline' : 'copy-outline'}
                  size={14}
                  color={Colors.heroInk}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.copyText}>
                  {copyState === 'copied' ? 'ГОТОВО' : 'КОПИЯ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Покажите код кассиру при заказе — кэшбэк начислится автоматически.
          </Text>
        </View>

        <View style={styles.brightnessRow}>
          <Ionicons name="sparkles-outline" size={14} color={Colors.inkMuted} />
          <Text style={styles.brightnessText}>Яркость экрана увеличена</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 100 },

  heroWrap: { paddingHorizontal: Spacing.xl },
  hero: {
    backgroundColor: Colors.hero,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    borderColor: Colors.heroBorder,
    padding: Spacing.xxl,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandText: {
    fontFamily: Fonts.sansBold,
    fontSize: 20,
    color: Colors.heroInk,
    letterSpacing: 4,
  },
  qrPanel: {
    alignItems: 'center',
    marginBottom: 18,
  },
  qrInner: {
    backgroundColor: Colors.heroInk,
    borderRadius: Radii.lg,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    backgroundColor: Colors.bgAlt,
    borderRadius: 8,
  },
  qrError: {
    ...Type.bodySub,
    color: Colors.inkMuted,
  },
  qrLogo: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.heroInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    color: Colors.hero,
    letterSpacing: 2,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNumberWrap: { flex: 1 },
  cardNumberLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: Colors.heroMuted,
    marginBottom: 6,
  },
  cardNumber: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    letterSpacing: 1.5,
    color: Colors.heroInk,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.heroMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  copyText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.heroInk,
  },

  hint: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  hintText: {
    ...Type.bodySub,
    color: Colors.inkSub,
    lineHeight: 22,
  },

  brightnessRow: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  brightnessText: {
    fontFamily: Fonts.sansMed,
    fontSize: 12,
    letterSpacing: 0.3,
    color: Colors.inkMuted,
  },
});

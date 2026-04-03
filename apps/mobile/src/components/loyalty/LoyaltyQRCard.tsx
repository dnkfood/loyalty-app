import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '../ui/Card';

interface LoyaltyQRCardProps {
  qrData: string;
  externalGuestId: string;
  cardNumber?: string;
}

export function LoyaltyQRCard({ qrData, externalGuestId, cardNumber }: LoyaltyQRCardProps) {
  return (
    <Card style={styles.card} padding={24}>
      <View style={styles.qrContainer}>
        <QRCode
          value={qrData}
          size={240}
          color="#1a1a1a"
          backgroundColor="#fff"
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.guestId}>ID: {externalGuestId}</Text>
        {cardNumber && <Text style={styles.cardNumber}>{cardNumber}</Text>}
      </View>

      <Text style={styles.hint}>
        Покажите QR-код кассиру для начисления или списания баллов
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignItems: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  info: {
    alignItems: 'center',
    marginBottom: 12,
  },
  guestId: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#1a1a1a',
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

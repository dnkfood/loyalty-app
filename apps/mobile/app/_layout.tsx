import { View, Text, StyleSheet } from 'react-native';

export default function Layout() {
  return (
    <View style={s.root}>
      <Text style={s.text}>Loyalty App v1.0</Text>
      <Text style={s.sub}>If you see this, the native layer works.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  sub: { fontSize: 14, color: '#666', marginTop: 8 },
});

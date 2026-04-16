import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = 'home' | 'home-outline' | 'list' | 'list-outline' | 'qr-code' | 'qr-code-outline' | 'notifications' | 'notifications-outline' | 'person' | 'person-outline';

interface TabIconProps {
  name: IoniconsName;
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps) {
  return <Ionicons name={focused ? name : `${name}-outline` as IoniconsName} size={24} color={focused ? '#007AFF' : '#8E8E93'} />;
}

export default function AppTabLayout() {
  return (
    <Tabs
      initialRouteName="card"
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'История',
          tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: 'Карта',
          tabBarIcon: ({ focused }) => <TabIcon name="qr-code" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Уведомления',
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

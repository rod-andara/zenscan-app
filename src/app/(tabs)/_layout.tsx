import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../design/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.dark,
          borderTopColor: colors.border.dark,
        },
        tabBarActiveTintColor: colors.primary.teal,
        tabBarInactiveTintColor: colors.text.secondary.dark,
      }}
    >
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <TabIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide old camera screen
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color }) => <TabIcon name="folder" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Simple icon component (you can replace with expo-icons later)
function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    camera: '📷',
    folder: '📁',
  };

  return <Text style={{ fontSize: 24 }}>{icons[name]}</Text>;
}

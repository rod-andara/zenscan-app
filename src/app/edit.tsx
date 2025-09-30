import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../design/tokens';

export default function EditScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Edit Screen - Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.heading,
    color: colors.text.primary.dark,
  },
});

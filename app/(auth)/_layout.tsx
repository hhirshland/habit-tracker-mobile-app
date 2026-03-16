import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sentry } from '@/lib/sentry';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  Sentry.captureException(error);
  return (
    <View style={ebStyles.container}>
      <Text style={ebStyles.title}>Something went wrong</Text>
      <Text style={ebStyles.message}>We hit a snag loading this section. Please try again.</Text>
      <TouchableOpacity style={ebStyles.button} onPress={retry}>
        <Text style={ebStyles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}

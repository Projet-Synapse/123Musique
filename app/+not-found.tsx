// Powered by OnSpace.AI
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, fontSize } from '@/constants/theme';

export default function NotFoundScreen() {
  const { colors, accent } = useTheme();
  const router = useRouter();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    title: {
      fontSize: fontSize.xxl, fontWeight: '700', color: colors.text,
      marginTop: spacing.md, marginBottom: spacing.sm,
    },
    message: {
      fontSize: fontSize.md, color: colors.textSecondary,
      textAlign: 'center', marginBottom: spacing.xl,
    },
    homeButton: {
      backgroundColor: accent,
      paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
      borderRadius: radius.full,
    },
    homeButtonText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <MaterialIcons name="music-off" size={72} color={accent} />
        <Text style={s.title}>Page introuvable</Text>
        <Text style={s.message}>Cette page n&apos;existe pas ou a été déplacée.</Text>
        <TouchableOpacity
          style={s.homeButton}
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="Retour à la bibliothèque"
        >
          <Text style={s.homeButtonText}>Retour à la bibliothèque</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

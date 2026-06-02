import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { BrutlButton } from './ui/BrutlButton';
import { BrutlText } from './ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import type { ScannedFood } from './BarcodeScanModal';

interface Props {
  visible: boolean;
  onResult: (food: ScannedFood) => void;
  onClose: () => void;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  captureRing: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
  },
  closeBtn: {
    position: 'absolute', top: BrutlSpacing.xl, right: BrutlSpacing.xl,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999,
    padding: BrutlSpacing.sm, borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  hint: {
    position: 'absolute', bottom: 170, left: 0, right: 0, alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 999,
    paddingHorizontal: BrutlSpacing.md, paddingVertical: BrutlSpacing.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', gap: BrutlSpacing.lg,
  },
  loadingText: { textAlign: 'center', paddingHorizontal: BrutlSpacing.xl },
  permissionBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: BrutlSpacing.xl, gap: BrutlSpacing.lg,
  },
});

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function scanMealPhoto(base64: string): Promise<ScannedFood | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/meal-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ image: base64 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name ?? 'Scanned meal',
      calories: Math.round(data.calories ?? 0),
      proteinG: parseFloat((data.proteinG ?? 0).toFixed(1)),
      carbsG: parseFloat((data.carbsG ?? 0).toFixed(1)),
      fatG: parseFloat((data.fatG ?? 0).toFixed(1)),
      servingG: data.servingG ?? 1,
    };
  } catch {
    return null;
  }
}

export function PhotoScanModal({ visible, onResult, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture() {
    if (!cameraRef.current || loading) return;
    setLoading(true);
    setError(false);
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({ base64: true, quality: 0.5 });
      const food = await scanMealPhoto(photo.base64 ?? '');
      if (food) {
        onResult(food);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible transparent animationType="slide" statusBarTranslucent>
        <View style={[styles.overlay, styles.permissionBox]}>
          <BrutlText variant="heading" style={{ textAlign: 'center' }}>Camera Access Needed</BrutlText>
          <BrutlText variant="muted" style={{ textAlign: 'center' }}>
            Allow camera access to scan your meal and estimate macros with AI.
          </BrutlText>
          <BrutlButton label="GRANT CAMERA ACCESS" onPress={requestPermission} />
          <BrutlButton label="CANCEL" variant="ghost" onPress={onClose} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <CameraView ref={cameraRef as any} style={styles.camera} facing="back" />

        <View style={styles.hint}>
          <View style={styles.hintPill}>
            <BrutlText variant="caption">Point at your meal and capture</BrutlText>
          </View>
        </View>

        <TouchableOpacity style={styles.captureRing} onPress={handleCapture} activeOpacity={0.8}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <BrutlText variant="caption" style={{ color: BrutlColors.textPrimary }}>✕ Close</BrutlText>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={BrutlColors.accent} />
            <BrutlText variant="heading" style={styles.loadingText}>Analysing your meal...</BrutlText>
            <BrutlText variant="muted" style={styles.loadingText}>
              AI is estimating calories, protein, carbs and fat.
            </BrutlText>
          </View>
        )}
        {error && !loading && (
          <View style={styles.loading}>
            <BrutlText variant="heading" style={[styles.loadingText, { color: BrutlColors.accent }]}>
              Could not analyse meal
            </BrutlText>
            <BrutlText variant="muted" style={styles.loadingText}>
              Try again with better lighting or a closer shot.
            </BrutlText>
            <TouchableOpacity
              onPress={() => setError(false)}
              style={{ marginTop: 16, borderWidth: 1, borderColor: BrutlColors.accent, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 }}
            >
              <BrutlText variant="body" style={{ color: BrutlColors.accent }}>TRY AGAIN</BrutlText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

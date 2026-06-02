import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

// Lazy-guard native module — not available in dev builds before expo-camera was added
let CameraView: any = null;
let useCameraPermissions: () => [any, () => Promise<any>] = () => [null, async () => ({ granted: false })];
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch { /* native module not in this build */ }

import { BrutlButton } from './ui/BrutlButton';
import { BrutlText } from './ui/BrutlText';
import { BrutlColors, BrutlSpacing } from '@/constants/theme';

export interface ScannedFood {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
}

interface Props {
  visible: boolean;
  onResult: (food: ScannedFood) => void;
  onClose: () => void;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scanFrame: {
    position: 'absolute',
    top: '30%', left: '15%', right: '15%',
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BrutlColors.accent,
  },
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: BrutlColors.accent, borderTopLeftRadius: 10 },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: BrutlColors.accent, borderTopRightRadius: 10 },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: BrutlColors.accent, borderBottomLeftRadius: 10 },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: BrutlColors.accent, borderBottomRightRadius: 10 },
  hint: {
    position: 'absolute', bottom: '28%', left: 0, right: 0,
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 999,
    paddingHorizontal: BrutlSpacing.md, paddingVertical: BrutlSpacing.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  closeBtn: {
    position: 'absolute', top: BrutlSpacing.xl, right: BrutlSpacing.xl,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999,
    padding: BrutlSpacing.sm, borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: BrutlSpacing.md,
  },
  permissionBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: BrutlSpacing.xl, gap: BrutlSpacing.lg,
  },
});

async function lookupBarcode(barcode: string): Promise<ScannedFood | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product?.nutriments) return null;
    const p = data.product;
    const n = p.nutriments;
    return {
      name: p.product_name || p.brands || 'Unknown product',
      calories: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
      proteinG: parseFloat((n['proteins_100g'] ?? 0).toFixed(1)),
      carbsG: parseFloat((n['carbohydrates_100g'] ?? 0).toFixed(1)),
      fatG: parseFloat((n['fat_100g'] ?? 0).toFixed(1)),
      servingG: 100,
    };
  } catch {
    return null;
  }
}

export function BarcodeScanModal({ visible, onResult, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState('');

  useEffect(() => {
    if (visible) { setScanning(true); setLastCode(''); }
  }, [visible]);

  async function handleBarcode({ data }: { data: string }) {
    if (!scanning || loading || data === lastCode) return;
    setScanning(false);
    setLastCode(data);
    setLoading(true);
    const food = await lookupBarcode(data);
    setLoading(false);
    if (food) {
      onResult(food);
    } else {
      setScanning(true);
    }
  }

  if (!visible) return null;

  if (!CameraView) {
    return (
      <Modal visible transparent animationType="slide" statusBarTranslucent>
        <View style={[styles.overlay, styles.permissionBox]}>
          <BrutlText variant="heading" style={{ textAlign: 'center' }}>Camera Not Available</BrutlText>
          <BrutlText variant="muted" style={{ textAlign: 'center' }}>
            This feature requires a newer build. Use the preview APK from EAS.
          </BrutlText>
          <BrutlButton label="CLOSE" onPress={onClose} />
        </View>
      </Modal>
    );
  }

  if (!permission?.granted) {
    return (
      <Modal visible transparent animationType="slide" statusBarTranslucent>
        <View style={[styles.overlay, styles.permissionBox]}>
          <BrutlText variant="heading" style={{ textAlign: 'center' }}>Camera Access Needed</BrutlText>
          <BrutlText variant="muted" style={{ textAlign: 'center' }}>
            Allow camera access to scan food barcodes.
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
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanning ? handleBarcode : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        />

        <View style={styles.scanFrame} pointerEvents="none">
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        <View style={styles.hint}>
          <View style={styles.hintPill}>
            <BrutlText variant="caption">Align barcode within the frame</BrutlText>
          </View>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <BrutlText variant="caption" style={{ color: BrutlColors.textPrimary }}>✕ Close</BrutlText>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={BrutlColors.accent} />
            <BrutlText variant="caption">Looking up product...</BrutlText>
          </View>
        )}
      </View>
    </Modal>
  );
}

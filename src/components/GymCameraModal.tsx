import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';

const QUIPS = [
  'IRON NEVER LIES',
  'NO EXCUSES. ONLY REPS.',
  'EARN IT EVERY SESSION.',
  'PAIN IS TEMPORARY.\nPRs LAST FOREVER.',
  'THE GRIND NEVER STOPS.',
  'BUILT IN THE DARK.',
  'LIFT HEAVY. LIVE HEAVY.',
  'CONSISTENCY BEATS INTENSITY.',
  'WEAK MIND. WEAK BODY.',
  'WHO SAID YOU COULD REST?',
];

type State = 'idle' | 'preview';

export function GymCameraModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const insets = useSafeAreaInsets();

  const quip = useMemo(
    () => QUIPS[Math.floor(Math.random() * QUIPS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photoUri],
  );

  const dateStr = new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  async function launchCamera() {
    if (launching) return;
    setLaunching(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        saveToPhotos: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setState('preview');
      } else {
        onClose();
      }
    } catch {
      onClose();
    } finally {
      setLaunching(false);
    }
  }

  function retake() {
    setPhotoUri(null);
    setState('idle');
    launchCamera();
  }

  function handleClose() {
    setPhotoUri(null);
    setState('idle');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      {state === 'idle' ? (
        /* Launch state — shown briefly while system camera opens */
        <View style={[gc.launchContainer, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleClose} style={gc.launchClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={BrutlColors.textMuted} />
          </TouchableOpacity>
          <View style={gc.launchBody}>
            {launching ? (
              <ActivityIndicator size="large" color={BrutlColors.accent} />
            ) : (
              <>
                <View style={gc.cameraIconBox}>
                  <Ionicons name="camera" size={40} color={BrutlColors.accent} />
                </View>
                <BrutlText style={gc.launchTitle}>GYM SHOT</BrutlText>
                <BrutlText style={gc.launchSub}>Photo saves to your gallery automatically.</BrutlText>
                <TouchableOpacity style={gc.launchBtn} onPress={launchCamera} activeOpacity={0.8}>
                  <BrutlText style={gc.launchBtnTxt}>OPEN CAMERA</BrutlText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
        /* Branded preview */
        <View style={gc.fill}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}

          <View style={gc.bottomDark} />
          <View style={gc.accentStripe} />

          <View style={[gc.topBar, { paddingTop: insets.top + BrutlSpacing.sm }]}>
            <TouchableOpacity onPress={handleClose} style={gc.iconBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <View style={gc.savedChip}>
              <Ionicons name="checkmark-circle" size={12} color={BrutlColors.success} />
              <BrutlText style={gc.savedChipTxt}>SAVED TO GALLERY</BrutlText>
            </View>
            <BrutlText style={gc.dateLabel}>{dateStr}</BrutlText>
          </View>

          <View style={[gc.brandBlock, { paddingBottom: insets.bottom + 120 }]}>
            <BrutlText style={gc.brandName}>BRUTL</BrutlText>
            <BrutlText style={gc.quipLine}>{quip}</BrutlText>
            <BrutlText style={gc.brandDomain}>brutl.app</BrutlText>
          </View>

          <View style={[gc.actionRow, { paddingBottom: insets.bottom + BrutlSpacing.xl }]}>
            <TouchableOpacity style={gc.doneBtn} onPress={handleClose} activeOpacity={0.85}>
              <BrutlText style={gc.doneBtnTxt}>DONE</BrutlText>
            </TouchableOpacity>
            <TouchableOpacity style={gc.retakeBtn} onPress={retake} activeOpacity={0.8}>
              <Ionicons name="camera-reverse-outline" size={18} color={BrutlColors.textMuted} />
              <BrutlText style={gc.retakeTxt}>RETAKE</BrutlText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const gc = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },

  launchContainer: {
    flex: 1, backgroundColor: BrutlColors.bg,
    paddingHorizontal: BrutlSpacing.xl,
  },
  launchClose: {
    alignSelf: 'flex-end',
    paddingTop: BrutlSpacing.md,
    padding: BrutlSpacing.sm,
  },
  launchBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: BrutlSpacing.md,
  },
  cameraIconBox: {
    width: 80, height: 80, borderRadius: BrutlRadius.lg,
    backgroundColor: `${BrutlColors.accent}18`,
    borderWidth: 1, borderColor: `${BrutlColors.accent}40`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: BrutlSpacing.sm,
  },
  launchTitle: {
    fontFamily: BrutlFonts.display, fontSize: 36,
    color: BrutlColors.textPrimary, letterSpacing: 3,
  },
  launchSub: {
    fontSize: 13, color: BrutlColors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
  launchBtn: {
    marginTop: BrutlSpacing.sm,
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingHorizontal: BrutlSpacing.xl,
    paddingVertical: BrutlSpacing.md,
  },
  launchBtnTxt: {
    fontFamily: BrutlFonts.display, fontSize: 18,
    color: '#fff', letterSpacing: 1,
  },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: BrutlSpacing.md,
    paddingBottom: BrutlSpacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: BrutlRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  savedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${BrutlColors.success}20`,
    borderWidth: 1, borderColor: `${BrutlColors.success}40`,
    borderRadius: BrutlRadius.full,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 3,
  },
  savedChipTxt: {
    fontSize: 9, color: BrutlColors.success, letterSpacing: 1,
  },
  dateLabel: {
    fontFamily: BrutlFonts.display, fontSize: 12,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 2,
  },

  bottomDark: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '48%', backgroundColor: 'rgba(0,0,0,0.82)',
  },
  accentStripe: {
    position: 'absolute', bottom: '48%', left: 0, right: 0,
    height: 3, backgroundColor: BrutlColors.accent,
  },

  brandBlock: {
    position: 'absolute', bottom: 0, left: BrutlSpacing.lg, right: BrutlSpacing.lg,
  },
  brandName: {
    fontFamily: BrutlFonts.display, fontSize: 80,
    color: '#fff', letterSpacing: 6, lineHeight: 82,
  },
  quipLine: {
    fontFamily: BrutlFonts.display, fontSize: 22,
    color: BrutlColors.accent, letterSpacing: 2, lineHeight: 28,
    marginTop: BrutlSpacing.xs,
  },
  brandDomain: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2, marginTop: BrutlSpacing.xs,
  },

  actionRow: {
    position: 'absolute', bottom: 0, left: BrutlSpacing.md, right: BrutlSpacing.md,
    flexDirection: 'row', gap: BrutlSpacing.sm,
  },
  doneBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingVertical: BrutlSpacing.md,
  },
  doneBtnTxt: {
    fontFamily: BrutlFonts.display, fontSize: 18,
    color: '#fff', letterSpacing: 1,
  },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: BrutlSpacing.xs,
    paddingHorizontal: BrutlSpacing.md,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1, borderColor: BrutlColors.borderVisible,
  },
  retakeTxt: {
    fontFamily: BrutlFonts.display, fontSize: 14,
    color: BrutlColors.textMuted, letterSpacing: 1,
  },
});

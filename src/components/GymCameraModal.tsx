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
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';

const QUIPS = [
  'IRON NEVER LIES',
  'NO EXCUSES. ONLY REPS.',
  'EARN IT EVERY SESSION.',
  'PAIN IS TEMPORARY. PRS LAST FOREVER.',
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
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [state, setState] = useState<State>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        setState('preview');
        saveToGallery(uri);
      } else {
        onClose();
      }
    } catch {
      onClose();
    } finally {
      setLaunching(false);
    }
  }

  async function saveToGallery(uri: string) {
    setSaving(true);
    try {
      let granted = mediaPermission?.granted;
      if (!granted) {
        const { granted: g } = await requestMediaPermission();
        granted = g;
      }
      if (granted) {
        await MediaLibrary.saveToLibraryAsync(uri);
        setSaved(true);
      }
    } catch {
      // silent — photo still visible in preview
    } finally {
      setSaving(false);
    }
  }

  function retake() {
    setPhotoUri(null);
    setSaved(false);
    setState('idle');
    launchCamera();
  }

  function handleClose() {
    setPhotoUri(null);
    setSaved(false);
    setState('idle');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      {state === 'idle' ? (
        <View style={[gc.launchContainer, { paddingTop: insets.top + BrutlSpacing.sm }]}>
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
                <BrutlText style={gc.launchSub}>Take a progress photo. Saved to your gallery.</BrutlText>
                <TouchableOpacity style={gc.launchBtn} onPress={launchCamera} activeOpacity={0.8}>
                  <BrutlText style={gc.launchBtnTxt}>OPEN CAMERA</BrutlText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
        /* ── Branded preview ─────────────────────────────────── */
        <View style={gc.previewContainer}>
          {/* Full 4:3 image — contained, no cropping */}
          <View style={gc.imageArea}>
            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={gc.photo}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Branding overlay pinned to bottom of image area */}
          <View style={gc.overlayStripe} />
          <View style={gc.brandRow}>
            <View>
              <BrutlText style={gc.brandName}>BRUTL</BrutlText>
              <BrutlText style={gc.quipLine}>{quip}</BrutlText>
            </View>
            <View style={gc.dateBlock}>
              <BrutlText style={gc.dateLabel}>{dateStr}</BrutlText>
              <BrutlText style={gc.brandDomain}>brutl.app</BrutlText>
            </View>
          </View>

          {/* Top bar */}
          <View style={[gc.topBar, { paddingTop: insets.top + BrutlSpacing.xs }]}>
            <TouchableOpacity onPress={handleClose} style={gc.iconBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <View style={gc.savedChip}>
              {saving ? (
                <ActivityIndicator size="small" color={BrutlColors.textMuted} />
              ) : (
                <Ionicons
                  name={saved ? 'checkmark-circle' : 'ellipse-outline'}
                  size={12}
                  color={saved ? BrutlColors.success : BrutlColors.textDisabled}
                />
              )}
              <BrutlText style={[gc.savedChipTxt, saved && { color: BrutlColors.success }]}>
                {saving ? 'SAVING...' : saved ? 'SAVED' : 'NOT SAVED'}
              </BrutlText>
            </View>
          </View>

          {/* Actions */}
          <View style={[gc.actionRow, { paddingBottom: insets.bottom + BrutlSpacing.md }]}>
            <TouchableOpacity style={gc.doneBtn} onPress={handleClose} activeOpacity={0.85}>
              <BrutlText style={gc.doneBtnTxt}>DONE</BrutlText>
            </TouchableOpacity>
            <TouchableOpacity style={gc.retakeBtn} onPress={retake} activeOpacity={0.8}>
              <Ionicons name="camera-reverse-outline" size={16} color={BrutlColors.textMuted} />
              <BrutlText style={gc.retakeTxt}>RETAKE</BrutlText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  );
}

const gc = StyleSheet.create({
  // ── idle / launch ──────────────────────────────────────────
  launchContainer: {
    flex: 1,
    backgroundColor: BrutlColors.bg,
    paddingHorizontal: BrutlSpacing.xl,
  },
  launchClose: {
    alignSelf: 'flex-end',
    padding: BrutlSpacing.sm,
  },
  launchBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: BrutlFonts.display,
    fontSize: 36,
    color: BrutlColors.textPrimary,
    letterSpacing: 2,
  },
  launchSub: {
    fontSize: 13,
    color: BrutlColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  launchBtn: {
    marginTop: BrutlSpacing.sm,
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingHorizontal: BrutlSpacing.xl,
    paddingVertical: BrutlSpacing.md,
  },
  launchBtnTxt: {
    fontFamily: BrutlFonts.display,
    fontSize: 18,
    color: '#fff',
    letterSpacing: 1,
  },

  // ── preview ────────────────────────────────────────────────
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageArea: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  overlayStripe: {
    height: 3,
    backgroundColor: BrutlColors.accent,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: BrutlSpacing.lg,
    paddingTop: BrutlSpacing.sm,
    paddingBottom: BrutlSpacing.sm,
  },
  brandName: {
    fontFamily: BrutlFonts.display,
    fontSize: 44,
    color: '#fff',
    letterSpacing: 4,
    lineHeight: 46,
  },
  quipLine: {
    fontFamily: BrutlFonts.display,
    fontSize: 12,
    color: BrutlColors.accent,
    letterSpacing: 1.5,
    lineHeight: 16,
  },
  dateBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  dateLabel: {
    fontFamily: BrutlFonts.display,
    fontSize: 11,
    color: BrutlColors.textMuted,
    letterSpacing: 1.5,
  },
  brandDomain: {
    fontSize: 10,
    color: BrutlColors.textDisabled,
    letterSpacing: 1.5,
  },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BrutlSpacing.md,
    paddingBottom: BrutlSpacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iconBtn: {
    width: 36, height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BrutlRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: BrutlRadius.full,
    paddingHorizontal: BrutlSpacing.sm,
    paddingVertical: 4,
  },
  savedChipTxt: {
    fontSize: 10,
    color: BrutlColors.textDisabled,
    letterSpacing: 1,
  },

  actionRow: {
    flexDirection: 'row',
    gap: BrutlSpacing.sm,
    paddingHorizontal: BrutlSpacing.md,
    paddingTop: BrutlSpacing.sm,
    backgroundColor: '#0A0A0A',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingVertical: BrutlSpacing.sm + 2,
  },
  doneBtnTxt: {
    fontFamily: BrutlFonts.display,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrutlSpacing.xs,
    paddingHorizontal: BrutlSpacing.md,
    borderRadius: BrutlRadius.sm,
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  retakeTxt: {
    fontFamily: BrutlFonts.display,
    fontSize: 14,
    color: BrutlColors.textMuted,
    letterSpacing: 1,
  },
});

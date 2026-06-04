import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlText } from '@/components/ui/BrutlText';
import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';

const QUIPS = [
  'IRON NEVER LIES',
  'NO EXCUSES. ONLY REPS.',
  'EARN IT EVERY SESSION.',
  'PAIN IS TEMPORARY.\nPRs LAST FOREVER.',
  'THE GRIND DOESN\'T STOP.',
  'BUILT IN THE DARK.',
  'LIFT HEAVY. LIVE HEAVY.',
  'CONSISTENCY BEATS INTENSITY.',
  'WEAK MIND. WEAK BODY.',
  'WHO SAID YOU COULD REST?',
];

type State = 'camera' | 'preview';

export function GymCameraModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [state, setState] = useState<State>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const quip = useMemo(
    () => QUIPS[Math.floor(Math.random() * QUIPS.length)],
    // new quip per capture
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photoUri],
  );

  const dateStr = new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  async function capture() {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setState('preview');
      }
    } catch {
      // camera not ready — ignore
    }
  }

  async function save() {
    if (!photoUri) return;
    setSaving(true);
    try {
      if (!mediaPermission?.granted) {
        const { granted } = await requestMediaPermission();
        if (!granted) { setSaving(false); return; }
      }
      await MediaLibrary.saveToLibraryAsync(photoUri);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        setState('camera');
        setPhotoUri(null);
      }, 1000);
    } catch {
      setSaving(false);
    }
  }

  function retake() {
    setState('camera');
    setPhotoUri(null);
    setSaved(false);
  }

  function handleClose() {
    retake();
    onClose();
  }

  if (camPermission && !camPermission.granted) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
        <View style={[gc.permContainer, { paddingTop: insets.top + BrutlSpacing.xl }]}>
          <Ionicons name="camera-outline" size={48} color={BrutlColors.accent} />
          <BrutlText style={gc.permTitle}>CAMERA ACCESS</BrutlText>
          <BrutlText style={gc.permBody}>Grant camera access to capture your gym progress shots.</BrutlText>
          <TouchableOpacity style={gc.permBtn} onPress={requestCamPermission}>
            <BrutlText style={gc.permBtnTxt}>ALLOW CAMERA</BrutlText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} hitSlop={12} style={{ marginTop: BrutlSpacing.md }}>
            <BrutlText variant="muted">Not now</BrutlText>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      {state === 'camera' ? (
        <View style={gc.fill}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

          <View style={[gc.topBar, { paddingTop: insets.top + BrutlSpacing.sm }]}>
            <TouchableOpacity onPress={handleClose} style={gc.iconBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <BrutlText style={gc.topBarTitle}>GYM SHOT</BrutlText>
            <View style={{ width: 44 }} />
          </View>

          <View style={[gc.captureArea, { paddingBottom: insets.bottom + BrutlSpacing.xl }]}>
            <TouchableOpacity style={gc.captureRing} onPress={capture} activeOpacity={0.75}>
              <View style={gc.captureCore} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={gc.fill}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}

          <View style={gc.bottomDark} />
          <View style={gc.accentStripe} />

          <View style={[gc.topBar, { paddingTop: insets.top + BrutlSpacing.sm }]}>
            <TouchableOpacity onPress={retake} style={gc.iconBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <BrutlText style={gc.dateLabel}>{dateStr}</BrutlText>
            <View style={{ width: 44 }} />
          </View>

          <View style={[gc.brandBlock, { paddingBottom: insets.bottom + 120 }]}>
            <BrutlText style={gc.brandName}>BRUTL</BrutlText>
            <BrutlText style={gc.quipLine}>{quip}</BrutlText>
            <BrutlText style={gc.brandDomain}>brutl.app</BrutlText>
          </View>

          <View style={[gc.actionRow, { paddingBottom: insets.bottom + BrutlSpacing.xl }]}>
            <TouchableOpacity
              style={[gc.saveBtn, (saving || saved) && { opacity: 0.7 }]}
              onPress={save}
              disabled={saving || saved}
              activeOpacity={0.85}
            >
              <Ionicons
                name={saved ? 'checkmark-circle' : 'download-outline'}
                size={20}
                color="#fff"
              />
              <BrutlText style={gc.saveBtnTxt}>
                {saved ? 'SAVED' : saving ? 'SAVING...' : 'SAVE TO GALLERY'}
              </BrutlText>
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

  permContainer: {
    flex: 1, backgroundColor: BrutlColors.bg,
    alignItems: 'center', justifyContent: 'center',
    padding: BrutlSpacing.xl, gap: BrutlSpacing.md,
  },
  permTitle: {
    fontFamily: BrutlFonts.display, fontSize: 32,
    color: BrutlColors.textPrimary, letterSpacing: 2,
  },
  permBody: {
    fontSize: 14, color: BrutlColors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
  permBtn: {
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingHorizontal: BrutlSpacing.xl,
    paddingVertical: BrutlSpacing.md,
    marginTop: BrutlSpacing.sm,
  },
  permBtnTxt: {
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
  topBarTitle: {
    fontFamily: BrutlFonts.display, fontSize: 16,
    color: '#fff', letterSpacing: 3,
  },
  captureArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center',
  },
  captureRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureCore: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: '#fff',
  },

  bottomDark: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '48%',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  accentStripe: {
    position: 'absolute', bottom: '48%', left: 0, right: 0,
    height: 3,
    backgroundColor: BrutlColors.accent,
  },
  dateLabel: {
    fontFamily: BrutlFonts.display, fontSize: 13,
    color: 'rgba(255,255,255,0.75)', letterSpacing: 2,
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
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: BrutlSpacing.xs,
    backgroundColor: BrutlColors.accent,
    borderRadius: BrutlRadius.sm,
    paddingVertical: BrutlSpacing.md,
  },
  saveBtnTxt: {
    fontFamily: BrutlFonts.display, fontSize: 16,
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

import React, { useRef, useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';

interface CameraScreenProps {
  navigation: any;
}

export function CameraScreen({ navigation }: CameraScreenProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (photo?.uri) {
        navigation.navigate('Preview', { imageUri: photo.uri });
      }
    } catch (err: any) {
      Alert.alert('촬영 실패', err.message || '사진을 찍을 수 없습니다.');
    } finally {
      setCapturing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      navigation.navigate('Preview', { imageUri: result.assets[0].uri });
    }
  };

  const toggleFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing(f => (f === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlash(f => !f);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={64} color={colors.textTertiary} />
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xl, textAlign: 'center' }]}>
          카메라 권한이 필요합니다
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
          메모 사진을 촬영하려면{'\n'}카메라 접근을 허용해주세요.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={[typography.button, { color: colors.textInverse }]}>권한 허용</Text>
        </Pressable>
        <Pressable style={styles.galleryAltButton} onPress={handlePickImage}>
          <MaterialCommunityIcons name="image-outline" size={20} color={colors.primary} />
          <Text style={[typography.buttonSmall, { color: colors.primary, marginLeft: spacing.sm }]}>
            갤러리에서 선택
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash ? 'on' : 'off'}
        >
          {/* Top controls */}
          <View style={styles.topBar}>
            <Pressable style={styles.controlButton} onPress={toggleFlash}>
              <MaterialCommunityIcons
                name={flash ? 'flash' : 'flash-off'}
                size={24}
                color="#FFF"
              />
            </Pressable>

            <View style={styles.topCenter}>
              <MaterialCommunityIcons name="printer" size={20} color="#FFF" />
              <Text style={[typography.caption, { color: '#FFF', marginLeft: 6 }]}>
                MEMO PRINT
              </Text>
            </View>

            <Pressable style={styles.controlButton} onPress={toggleFacing}>
              <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#FFF" />
            </Pressable>
          </View>

          {/* Viewfinder guide */}
          <View style={styles.viewfinderGuide}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <Text style={styles.guideText}>메모를 프레임 안에 맞춰주세요</Text>

          {/* Bottom controls */}
          <View style={styles.bottomBar}>
            <Pressable style={styles.sideButton} onPress={handlePickImage}>
              <MaterialCommunityIcons name="image-multiple-outline" size={28} color="#FFF" />
              <Text style={[typography.caption, { color: '#FFF', marginTop: 4 }]}>갤러리</Text>
            </Pressable>

            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Pressable
                style={[styles.captureButton, capturing && styles.captureButtonActive]}
                onPress={handleCapture}
                disabled={capturing}
              >
                <View style={styles.captureInner} />
              </Pressable>
            </Animated.View>

            <View style={styles.sideButton}>
              <MaterialCommunityIcons name="printer" size={28} color="rgba(255,255,255,0.3)" />
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.3)', marginTop: 4 }]}>
                촬영 후 인쇄
              </Text>
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
  },
  galleryAltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderGuide: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '30%',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  guideText: {
    position: 'absolute',
    bottom: '32%',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 32 : 48,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sideButton: {
    width: 64,
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    padding: 4,
  },
  captureButtonActive: {
    borderColor: colors.error,
  },
  captureInner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
});

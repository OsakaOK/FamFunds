// ToastContext — lightweight, non-blocking feedback messages that slide in at the
// top and auto-dismiss. Use these for success/info/error feedback instead of
// native Alert popups. (Destructive confirmations still use a real dialog.)

import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, t: ToastType = 'info') {
    setMessage(msg);
    setType(t);
    if (hideTimer.current) clearTimeout(hideTimer.current);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 180, useNativeDriver: true }),
      ]).start();
    }, 2600);
  }

  const accent =
    type === 'success'
      ? colors.success
      : type === 'error'
        ? colors.danger
        : type === 'warning'
          ? colors.warning
          : colors.primary;
  const icon =
    type === 'success'
      ? 'checkmark-circle'
      : type === 'error'
        ? 'alert-circle'
        : type === 'warning'
          ? 'warning'
          : 'information-circle';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[
          styles.wrap,
          { top: insets.top + 10, opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.toast, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name={icon as any} size={20} color={accent} />
          <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 24,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 440,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1, fontSize: 14, fontWeight: '600' },
});

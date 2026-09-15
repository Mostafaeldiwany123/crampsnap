import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DimensionValue, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  isDark?: boolean;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  isDark = false,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const theme = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonTextLine({
  width = '100%',
  height = 14,
  style,
  isDark,
}: {
  width?: DimensionValue;
  height?: number;
  style?: ViewStyle;
  isDark?: boolean;
}) {
  return <Skeleton width={width} height={height} borderRadius={6} style={style} isDark={isDark} />;
}

export function SkeletonCard({ isDark = false }: { isDark?: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Skeleton width="100%" height={120} borderRadius={10} isDark={isDark} />
      <View style={{ marginTop: 12, gap: 8 }}>
        <Skeleton width="75%" height={16} borderRadius={6} isDark={isDark} />
        <Skeleton width="45%" height={12} borderRadius={4} isDark={isDark} />
      </View>
    </View>
  );
}

export function SkeletonListItem({ isDark = false }: { isDark?: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.listItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Skeleton width={56} height={56} borderRadius={10} isDark={isDark} />
      <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
        <Skeleton width="80%" height={16} borderRadius={6} isDark={isDark} />
        <Skeleton width="50%" height={12} borderRadius={4} isDark={isDark} />
      </View>
      <Skeleton width={20} height={20} borderRadius={10} isDark={isDark} />
    </View>
  );
}

export function SkeletonGridThumb({ size, isDark = false }: { size: number; isDark?: boolean }) {
  return (
    <View style={{ width: size, height: size, padding: 2 }}>
      <Skeleton width="100%" height="100%" borderRadius={8} isDark={isDark} />
    </View>
  );
}

export function SkeletonStatsHUD({ isDark = false }: { isDark?: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.statsHUD, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Skeleton width={32} height={32} borderRadius={16} isDark={isDark} />
          <Skeleton width={48} height={18} borderRadius={4} style={{ marginTop: 8 }} isDark={isDark} />
          <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} isDark={isDark} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={32} height={32} borderRadius={16} isDark={isDark} />
          <Skeleton width={48} height={18} borderRadius={4} style={{ marginTop: 8 }} isDark={isDark} />
          <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} isDark={isDark} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={32} height={32} borderRadius={16} isDark={isDark} />
          <Skeleton width={48} height={18} borderRadius={4} style={{ marginTop: 8 }} isDark={isDark} />
          <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} isDark={isDark} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  statsHUD: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
});

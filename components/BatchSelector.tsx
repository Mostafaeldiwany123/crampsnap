import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { Check, X } from 'phosphor-react-native';

const { width, height } = Dimensions.get('window');

interface BatchSelectorProps {
  photos: string[];
  onSelect: (uri: string) => void;
  onCancel: () => void;
}

export default function BatchSelector({ photos, onSelect, onCancel }: BatchSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.carouselItem}>
      <View style={styles.imageCard}>
        <Image source={{ uri: item }} style={styles.image} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backdrop} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color="#FFFFFF" weight="regular" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Best Photo</Text>
        <View style={{ width: 40 }} /> {/* spacer */}
      </View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          data={photos}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        />
      </View>

      {/* Slider Indicators (Dots) */}
      <View style={styles.dotsContainer}>
        {photos.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              currentIndex === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.selectBtn}
          activeOpacity={0.8}
          onPress={() => onSelect(photos[currentIndex])}
        >
          <Text style={styles.selectBtnText}>Select This Photo</Text>
          <Check size={18} color="#000000" weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // translucent so camera is visible
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
  },
  closeBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  carouselContainer: {
    flex: 1,
  },
  carouselItem: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageCard: {
    width: '100%',
    height: '90%', // Leave room top and bottom
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  selectBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 100, // Pill
  },
  selectBtnText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'AssistantBold',
    fontWeight: '800',
  },
});

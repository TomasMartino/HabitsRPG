import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Rarity color mapping per spec
const RARITY_COLORS: Record<string, string> = {
  COMMON: '#FFFFFF',
  UNCOMMON: '#4CAF50',
  RARE: '#2196F3',
  EPIC: '#9C27B0',
  LEGENDARY: '#FF9800',
};

const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Común',
  UNCOMMON: 'Poco Común',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Legendario',
};

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  itemType: 'CONSUMABLE' | 'COSMETIC' | 'BOOST';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  priceGold: number;
  priceGems: number;
  effectType?: string;
  effectValue?: number;
  imageUrl?: string | null;
  isPurchasable?: boolean;
  maxOwned?: number | null;
  equipSlot?: string | null;
  owned?: boolean;
  ownedQuantity?: number;
}

interface ShopItemCardProps {
  item: ShopItem;
  onBuy: (item: ShopItem) => void;
  playerGold: number;
  playerGems: number;
}

export default function ShopItemCard({ item, onBuy, playerGold, playerGems }: ShopItemCardProps) {
  const borderColor = RARITY_COLORS[item.rarity] || '#FFFFFF';
  const rarityLabel = RARITY_LABELS[item.rarity] || 'Común';
  const canAfford = playerGold >= item.priceGold && playerGems >= item.priceGems;
  const isOwned = item.owned || (item.ownedQuantity ?? 0) > 0;

  const itemTypeIcon =
    item.itemType === 'CONSUMABLE' ? '🧪' :
    item.itemType === 'COSMETIC' ? '👗' :
    '⚡';

  return (
    <View style={[styles.card, { borderColor }]}>
      {/* Rarity indicator line */}
      <View style={[styles.rarityBar, { backgroundColor: borderColor }]} />

      {/* Icon placeholder */}
      <View style={[styles.iconContainer, { backgroundColor: borderColor + '20' }]}>
        <Text style={styles.iconText}>
          {item.imageUrl ? '🎒' : itemTypeIcon}
        </Text>
      </View>

      {/* Item info */}
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.rarityText, { color: borderColor }]}>
        {rarityLabel}
      </Text>

      <View style={styles.divider} />

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Price */}
      {item.priceGold > 0 && (
        <View style={styles.priceRow}>
          <Text style={styles.priceIcon}>💰</Text>
          <Text style={styles.priceText}>{item.priceGold}</Text>
        </View>
      )}
      {item.priceGems > 0 && (
        <View style={styles.priceRow}>
          <Text style={styles.priceIcon}>💎</Text>
          <Text style={styles.priceText}>{item.priceGems}</Text>
        </View>
      )}

      {/* Owned badge or Buy button */}
      {isOwned ? (
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedText}>
            ✔ Dueño ({item.ownedQuantity})
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.buyButton,
            { backgroundColor: canAfford ? '#4CAF50' : '#9E9E9E' },
          ]}
          onPress={() => onBuy(item)}
          disabled={!canAfford}
          activeOpacity={0.7}
        >
          <Text style={styles.buyButtonText}>
            {canAfford ? 'COMPRAR' : 'SIN FONDOS'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  rarityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  iconText: {
    fontSize: 28,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 2,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#333',
    marginBottom: 6,
  },
  description: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  priceIcon: {
    fontSize: 14,
  },
  priceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  ownedBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
  },
  ownedText: {
    color: '#C8E6C9',
    fontSize: 11,
    fontWeight: '600',
  },
  buyButton: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 6,
    minWidth: '80%',
    alignItems: 'center',
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

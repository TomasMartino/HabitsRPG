import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#FFFFFF',
  UNCOMMON: '#4CAF50',
  RARE: '#2196F3',
  EPIC: '#9C27B0',
  LEGENDARY: '#FF9800',
};

const ITEM_TYPE_ICONS: Record<string, string> = {
  CONSUMABLE: '🧪',
  COSMETIC: '👗',
  BOOST: '⚡',
};

export interface PlayerInventoryItem {
  id: number;
  itemId: number;
  name: string;
  description?: string;
  itemType: string;
  rarity: string;
  quantity: number;
  isEquipped: boolean;
  expiresAt?: string | null;
  equipSlot?: string | null;
}

interface InventoryListProps {
  inventory: PlayerInventoryItem[];
  onEquip: (item: PlayerInventoryItem) => void;
  onUnequip: (item: PlayerInventoryItem) => void;
}

export default function InventoryList({ inventory, onEquip, onUnequip }: InventoryListProps) {
  if (inventory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎒</Text>
        <Text style={styles.emptyText}>Tu inventario está vacío</Text>
        <Text style={styles.emptySubtext}>
          ¡Compra objetos en el Catálogo!
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: PlayerInventoryItem }) => {
    const borderColor = RARITY_COLORS[item.rarity] || '#FFFFFF';
    const typeIcon = ITEM_TYPE_ICONS[item.itemType] || '📦';
    const canEquip = item.itemType === 'COSMETIC';

    return (
      <View style={[styles.itemCard, { borderColor }]}>
        {/* Rarity bar */}
        <View style={[styles.rarityBar, { backgroundColor: borderColor }]} />

        <View style={styles.itemHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{typeIcon}</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemQuantity}>x{item.quantity}</Text>
          </View>
        </View>

        {/* Equip/Unequip status */}
        {item.isEquipped ? (
          <View style={styles.equippedSection}>
            <View style={styles.equippedBadge}>
              <Text style={styles.equippedText}>⚔ Equipado</Text>
            </View>
            {item.equipSlot && (
              <Text style={styles.slotText}>
                Slot: {item.equipSlot.replace('_', ' ')}
              </Text>
            )}
            <TouchableOpacity
              style={styles.unequipButton}
              onPress={() => onUnequip(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.unequipButtonText}>Desequipar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.equipButton,
              !canEquip && styles.equipButtonDisabled,
            ]}
            onPress={() => canEquip && onEquip(item)}
            disabled={!canEquip}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.equipButtonText,
              !canEquip && styles.equipButtonTextDisabled,
            ]}>
              {canEquip ? 'Equipar' : 'No equipable'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Expiry info for boosts */}
        {item.expiresAt && (
          <Text style={styles.expiryText}>
            ⏳ Expira: {new Date(item.expiresAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={inventory}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rarityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconText: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  itemQuantity: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 1,
  },
  equippedSection: {
    alignItems: 'center',
    gap: 4,
  },
  equippedBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  equippedText: {
    color: '#C8E6C9',
    fontSize: 11,
    fontWeight: 'bold',
  },
  slotText: {
    fontSize: 10,
    color: '#AAA',
    fontStyle: 'italic',
  },
  unequipButton: {
    backgroundColor: '#E53935',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 2,
  },
  unequipButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  equipButton: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  equipButtonDisabled: {
    backgroundColor: '#333',
  },
  equipButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  equipButtonTextDisabled: {
    color: '#888',
  },
  expiryText: {
    fontSize: 10,
    color: '#FFB74D',
    textAlign: 'center',
    marginTop: 4,
  },
});

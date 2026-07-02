import React, { useEffect, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ShopItemCard from '@/components/ShopItemCard';
import InventoryList from '@/components/InventoryList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useShopStore, ShopItem, InventoryItem } from '@/stores/shopStore';
import { usePlayerStore } from '@/stores/playerStore';

type ViewMode = 'catalog' | 'inventory';
type CategoryFilter = 'ALL' | 'CONSUMABLE' | 'COSMETIC' | 'BOOST';

const CATEGORIES: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: 'ALL', label: 'Todo', icon: '📋' },
  { key: 'CONSUMABLE', label: 'Consumibles', icon: '🧪' },
  { key: 'COSMETIC', label: 'Cosméticos', icon: '👗' },
  { key: 'BOOST', label: 'Mejoras', icon: '⚡' },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    inventory,
    isPurchasing,
    loading,
    error,
    fetchItems,
    fetchInventory,
    buyItem,
    equipItem,
    unequipItem,
  } = useShopStore();
  const { player, fetchPlayer } = usePlayerStore();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  // --- Load data on mount ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchItems(), fetchInventory(), fetchPlayer()]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // --- Buy handler ---
  const handleBuy = async (item: ShopItem) => {
    const playerGold = player?.gold ?? 0;
    const playerGems = player?.gems ?? 0;

    // Build price info text
    const priceParts: string[] = [];
    if (item.priceGold > 0) priceParts.push(`💰 ${item.priceGold} Oro`);
    if (item.priceGems > 0) priceParts.push(`💎 ${item.priceGems} Gemas`);
    const priceStr = priceParts.join(' + ');

    // Build currency warning
    let fundsWarning = '';
    if (playerGold < item.priceGold) {
      fundsWarning = `\n\n⚠️ Te faltan ${item.priceGold - playerGold} de oro.`;
    } else if (playerGems < item.priceGems) {
      fundsWarning = `\n\n⚠️ Te faltan ${item.priceGems - playerGems} gemas.`;
    }

    Alert.alert(
      '🛒 Confirmar Compra',
      `¿Comprar "${item.name}"?\n\n${priceStr}${fundsWarning}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '¡Comprar!',
          style: 'default',
          onPress: async () => {
            const success = await buyItem(item.id);
            if (success) {
              const itemTypeIcon =
                item.itemType === 'CONSUMABLE' ? '🧪' :
                item.itemType === 'COSMETIC' ? '👗' : '⚡';
              Alert.alert('✅ ¡Comprado!', `${itemTypeIcon} ${item.name} adquirido.`);
            } else {
              const errMsg = useShopStore.getState().error || 'No se pudo completar la compra.';
              Alert.alert('❌ Error', errMsg);
            }
          },
        },
      ],
    );
  };

  // --- Equip/Unequip handlers ---
  const handleEquip = async (invItem: InventoryItem) => {
    const slot = invItem.equipSlot || 'SKIN';
    const success = await equipItem(invItem.id, slot);
    if (!success) {
      const errMsg = useShopStore.getState().error || 'No se pudo equipar.';
      Alert.alert('❌ Error', errMsg);
    }
  };

  const handleUnequip = async (invItem: InventoryItem) => {
    const slot = invItem.equipSlot || 'SKIN';
    const success = await unequipItem(slot);
    if (!success) {
      const errMsg = useShopStore.getState().error || 'No se pudo desequipar.';
      Alert.alert('❌ Error', errMsg);
    }
  };

  // --- Filter items by category ---
  const filteredItems =
    categoryFilter === 'ALL'
      ? items
      : items.filter((i) => i.itemType === categoryFilter);

  // --- Render ---
  if (loading && items.length === 0 && inventory.length === 0) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Cargando tienda...</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>🏪 Tienda</ThemedText>
        <View style={styles.currencyRow}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyIcon}>💰</Text>
            <Text style={styles.currencyValue}>{player?.gold ?? 0}</Text>
          </View>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyIcon}>💎</Text>
            <Text style={styles.currencyValue}>{player?.gems ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* View mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            viewMode === 'catalog' && styles.modeButtonActive,
          ]}
          onPress={() => setViewMode('catalog')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.modeButtonText,
            viewMode === 'catalog' && styles.modeButtonTextActive,
          ]}>
            📜 Catálogo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            viewMode === 'inventory' && styles.modeButtonActive,
          ]}
          onPress={() => setViewMode('inventory')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.modeButtonText,
            viewMode === 'inventory' && styles.modeButtonTextActive,
          ]}>
            🎒 Mi Inventario ({inventory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Content */}
      {viewMode === 'catalog' ? (
        <>
          {/* Category filters */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  categoryFilter === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => setCategoryFilter(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryLabel,
                  categoryFilter === cat.key && styles.categoryLabelActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Items grid */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.itemRow}
            renderItem={({ item }) => (
              <ShopItemCard
                item={item}
                onBuy={handleBuy}
                playerGold={player?.gold ?? 0}
                playerGems={player?.gems ?? 0}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFD700"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyIcon}>{categoryFilter === 'ALL' ? '📭' : '🔍'}</Text>
                <Text style={styles.emptyText}>
                  {categoryFilter === 'ALL'
                    ? 'No hay artículos disponibles'
                    : `No hay artículos en esta categoría`}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <InventoryList
          inventory={inventory}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#AAA',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    gap: 4,
  },
  currencyIcon: {
    fontSize: 16,
  },
  currencyValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#2A2A4E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  modeButtonText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: '#FFD700',
  },
  errorBanner: {
    backgroundColor: '#4A1C1C',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  errorText: {
    color: '#FFCDD2',
    fontSize: 13,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#2A2A4E',
    borderColor: '#FFD700',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: '#FFD700',
  },
  itemRow: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

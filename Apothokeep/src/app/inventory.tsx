import React, { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StatusBar,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

// Define the type for an inventory item
interface InventoryItem {
  id: string;
  name: string;
  purchaseDate: string;
  purchaseDateRaw: string;
  expirationDate: string;
  expirationDateRaw: string;
  location: 0 | 1 | 2;
  opened: boolean;
}

export default function InventoryScreen() {
  const router = useRouter();
  // Start with empty inventory
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [result, setResult] = useState('test camera');
  const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

  // State for Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemExpiration, setNewItemExpiration] = useState("");
  const [newItemLocation, setNewItemLocation] = useState<0 | 1 | 2>(0);
  const [newItemOpened, setNewItemOpened] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [editExpirationDate, setEditExpirationDate] = useState("");
  const [editItemLocation, setEditItemLocation] = useState<0 | 1 | 2>(0);
  const [editItemOpened, setEditItemOpened] = useState(false);
  const [purchaseSortDir, setPurchaseSortDir] = useState<"asc" | "desc">("asc");

  const locationLabel = (location: 0 | 1 | 2) => {
    if (location === 1) return "Refrigerator";
    if (location === 2) return "Freezer";
    return "Pantry";
  };

  const formatExpirationDate = (value?: string) => {
    if (!value) return "No Date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const parseDisplayDate = (value?: string) => {
    if (!value) return null;
    if (value === "No Date") return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const parseRawDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const toLocalISOString = (date: Date) => {
    // Preserve local wall time when converting to ISO string
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString();
  };

  const parseRelativeExpiration = (input: string): Date | null => {
    // Supports: "1 week", "4 days", "2 weeks", "in 3 months"
    const match = input
      .toLowerCase()
      .trim()
      .match(/^(?:in\s+)?(\d+)\s*(day|days|week|weeks|month|months|year|years)$/);
    if (!match) return null;

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const unit = match[2];
    const now = new Date();
    const result = new Date(now);

    if (unit.startsWith("day")) {
      result.setDate(now.getDate() + amount);
    } else if (unit.startsWith("week")) {
      result.setDate(now.getDate() + amount * 7);
    } else if (unit.startsWith("month")) {
      result.setMonth(now.getMonth() + amount);
    } else if (unit.startsWith("year")) {
      result.setFullYear(now.getFullYear() + amount);
    } else {
      return null;
    }

    return result;
  };

  const openEditModal = (item: InventoryItem) => {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditPurchaseDate(item.purchaseDate);
    setEditExpirationDate(item.expirationDate);
    setEditItemLocation(item.location);
    setEditItemOpened(item.opened);
    setEditModalVisible(true);
  };

  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/foodstuff`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Request failed (${response.status})`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.items ?? [];
      const normalized = list
        .filter((item: any) => item)
        .map((item: any) => ({
          id: item?._id?.toString() ?? item?.id?.toString() ?? Math.random().toString(),
          name: item?.name ?? "Unnamed item",
          purchaseDate: formatExpirationDate(item?.purchaseDate),
          purchaseDateRaw: item?.purchaseDate ?? "",
          expirationDate: formatExpirationDate(item?.expirationDate),
          expirationDateRaw: item?.expirationDate ?? "",
          location: (item?.location ?? 0) as 0 | 1 | 2,
          opened: Boolean(item?.opened),
        }));
      setItems(normalized);
    } catch (err: any) {
      Alert.alert("Load failed", err?.message || "Could not fetch inventory.");
    }
  }, [API_BASE_URL]);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory])
  );

  const handleActionSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        options: ['Cancel', 'Take Photo', 'Manual Entry'],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark',
      }, (buttonIndex) => {
        if (buttonIndex === 1) {
          router.push("/camera" as any);
        } else if (buttonIndex === 2) {
          setModalVisible(true);
        }
      });
    } else {
      // Android/Web Fallback
      Alert.alert(
        "Add Item",
        "Choose an option",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Take Photo", onPress: () => router.push("/camera" as any) },
          { text: "Manual Entry", onPress: () => setModalVisible(true) },
        ]
      );
    }
  };

  const togglePurchaseSort = () => {
    setPurchaseSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortedItems = [...items].sort((a, b) => {
    const aDate = parseRawDate(a.purchaseDateRaw) ?? parseDisplayDate(a.purchaseDate);
    const bDate = parseRawDate(b.purchaseDateRaw) ?? parseDisplayDate(b.purchaseDate);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    const diff = aDate.getTime() - bDate.getTime();
    return purchaseSortDir === "asc" ? diff : -diff;
  });

  // Function to add a new item
  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    const trimmedExpiration = newItemExpiration.trim();

    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter an item name.");
      return;
    }

    let expirationDateForDb = toLocalISOString(new Date());
    if (trimmedExpiration) {
      const parsedExpiration = parseDateInput(trimmedExpiration, "expiration");
      if (!parsedExpiration) return;
      expirationDateForDb = toLocalISOString(parsedExpiration);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/foodstuff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          opened: newItemOpened,
          purchaseDate: toLocalISOString(new Date()),
          expirationDate: expirationDateForDb,
          location: newItemLocation,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Request failed (${response.status})`);
      }

      const savedItem = await response.json();
      const newItem: InventoryItem = {
        id: savedItem?._id?.toString() ?? Date.now().toString(),
        name: savedItem?.name ?? trimmedName,
        purchaseDate: formatExpirationDate(
          savedItem?.purchaseDate ?? new Date().toISOString()
        ),
        purchaseDateRaw: savedItem?.purchaseDate ?? new Date().toISOString(),
        expirationDate: formatExpirationDate(
          savedItem?.expirationDate ?? trimmedExpiration
        ),
        expirationDateRaw: savedItem?.expirationDate ?? trimmedExpiration,
        location: (savedItem?.location ?? newItemLocation) as 0 | 1 | 2,
        opened: Boolean(savedItem?.opened ?? newItemOpened),
      };

      setItems((prevItems) => [...prevItems, newItem]);

      // Reset and close modal
      setNewItemName("");
      setNewItemExpiration("");
      setNewItemLocation(0);
      setNewItemOpened(false);
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Save failed", err?.message || "Could not save item.");
    }
  };

  const parseDateInput = (raw: string, fieldLabel: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let parsed: Date;
    const relativeExpiration = parseRelativeExpiration(trimmed);
    if (relativeExpiration) {
      parsed = relativeExpiration;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      parsed = new Date(`${trimmed}T23:59:59.999`);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
      const [mm, dd, yearRaw] = trimmed.split("/");
      const mmNum = Number(mm);
      const ddNum = Number(dd);
      let yyyy = Number(yearRaw);
      if (yearRaw.length === 2) {
        // Interpret 00-69 as 2000-2069, 70-99 as 1970-1999
        yyyy = yyyy + (yyyy <= 69 ? 2000 : 1900);
      }
      parsed = new Date(yyyy, mmNum - 1, ddNum, 23, 59, 59, 999);
    } else {
      parsed = new Date(trimmed);
    }
    if (Number.isNaN(parsed.getTime())) {
      Alert.alert(
        "Invalid date",
        `Please use a valid ${fieldLabel} date (e.g. 2024-12-31, 12/31/2024, or 12/31/24) or a duration like 1 week.`
      );
      return null;
    }
    return parsed;
  };

  const handleUpdateItem = async () => {
    if (!editItemId) return;
    const trimmedName = editItemName.trim();
    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter an item name.");
      return;
    }

    const parsedPurchase = parseDateInput(editPurchaseDate, "purchase");
    if (editPurchaseDate.trim() && !parsedPurchase) return;
    const parsedExpiration = parseDateInput(editExpirationDate, "expiration");
    if (editExpirationDate.trim() && !parsedExpiration) return;

    const payload: Record<string, any> = {
      name: trimmedName,
      location: editItemLocation,
      opened: editItemOpened,
    };
    if (parsedPurchase) payload.purchaseDate = toLocalISOString(parsedPurchase);
    if (parsedExpiration) payload.expirationDate = toLocalISOString(parsedExpiration);

    try {
      const response = await fetch(`${API_BASE_URL}/foodstuff/${editItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Request failed (${response.status})`);
      }

      const savedItem = await response.json().catch(() => null);

      setItems((prev) =>
        prev.map((item) =>
          item.id === editItemId
            ? {
                ...item,
                name: savedItem?.name ?? trimmedName,
                purchaseDate: formatExpirationDate(
                  savedItem?.purchaseDate ??
                    (parsedPurchase ? parsedPurchase.toISOString() : item.purchaseDate)
                ),
                purchaseDateRaw:
                  savedItem?.purchaseDate ??
                  (parsedPurchase ? parsedPurchase.toISOString() : item.purchaseDateRaw),
                expirationDate: formatExpirationDate(
                  savedItem?.expirationDate ??
                    (parsedExpiration ? parsedExpiration.toISOString() : item.expirationDate)
                ),
                expirationDateRaw:
                  savedItem?.expirationDate ??
                  (parsedExpiration ? parsedExpiration.toISOString() : item.expirationDateRaw),
                location: (savedItem?.location ?? editItemLocation) as 0 | 1 | 2,
                opened: Boolean(savedItem?.opened ?? editItemOpened),
              }
            : item
        )
      );

      setEditModalVisible(false);
      setEditItemId(null);
      setEditItemName("");
      setEditPurchaseDate("");
      setEditExpirationDate("");
      setEditItemLocation(0);
      setEditItemOpened(false);
    } catch (err: any) {
      Alert.alert("Update failed", err?.message || "Could not update item.");
    }
  };

  // Function to delete an item
  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/foodstuff/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Request failed (${response.status})`);
      }

      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } catch (err: any) {
      Alert.alert("Delete failed", err?.message || "Could not delete item.");
    }
  };

  // Render individual item
  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      onPress={() => openEditModal(item)}
      className="flex-row bg-white p-4 rounded-xl mb-3 items-center shadow-sm border border-green-50 active:opacity-80"
    >
      <View className="w-12 h-12 rounded-full bg-green-50 justify-center items-center mr-4 border border-green-100">
        <Feather name="box" size={20} color="#166534" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
        <Text className="text-sm text-gray-500 mt-1">
          Purchased:{" "}
          <Text className="text-green-700 font-medium">{item.purchaseDate}</Text>
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Expires:{" "}
          <Text className="text-green-700 font-medium">{item.expirationDate}</Text>
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Location:{" "}
          <Text className="text-green-700 font-medium">{locationLabel(item.location)}</Text>
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Opened:{" "}
          <Text className="text-green-700 font-medium">{item.opened ? "Yes" : "No"}</Text>
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteItem(item.id)}
        className="p-3 bg-red-50 rounded-full active:bg-red-100"
      >
        <Feather name="trash-2" size={20} color="#dc2626" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#7662C0', '#D696CA', '#E3DCD6']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%' }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
      />

      <SafeAreaView className="flex-1">
        {/* Header */}
        {/* Header */}
        <View className="px-6 py-4 mb-2">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity
              onPress={() => router.push('/')}
              className="mr-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
            >
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <View>
              <Text className="text-3xl font-extrabold text-white tracking-wider shadow-sm">My Inventory</Text>
              <Text className="text-green-100 text-xs font-medium tracking-widest uppercase">Manage Your Items</Text>
            </View>
            <TouchableOpacity
              onPress={togglePurchaseSort}
              className="ml-auto flex-row items-center px-3 py-2 rounded-full bg-white/20 active:bg-white/30"
            >
              <Feather
                name={purchaseSortDir === "asc" ? "arrow-up" : "arrow-down"}
                size={16}
                color="white"
              />
              <Text className="text-white text-xs font-semibold ml-2">
                Purchase {purchaseSortDir === "asc" ? "Asc" : "Desc"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List Content */}
        <View className="flex-1 px-4">
          <FlatList
            data={sortedItems}
            renderItem={renderItem}
            keyExtractor={(item: InventoryItem) => item.id}
            extraData={purchaseSortDir}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center mt-20">
                <View className="bg-white/80 p-6 rounded-full mb-4 shadow-sm">
                  <Feather name="inbox" size={50} color="#7662C0" style={{ opacity: 0.5 }} />
                </View>
                <Text className="text-lg text-gray-600 font-medium">Your inventory is empty</Text>
                <Text className="text-sm text-gray-400 mt-2">Add items to track their freshness</Text>
              </View>
            }
          />
        </View>

        {/* Add Button */}
        <TouchableOpacity
          className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-[#D9AC68] justify-center items-center shadow-lg shadow-green-900/40 active:scale-95 transition-transform border-4 border-white"
          onPress={handleActionSheet}
        >
          <Feather name="plus" size={32} color="white" />
        </TouchableOpacity>

        {/* Add Item Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View className="w-full bg-white rounded-3xl p-6 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-800">Add New Item</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View className="space-y-4 mb-6">
                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Item Name</Text>
                  <TextInput
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 text-gray-800"
                    placeholder="e.g., Milk, Eggs, Bread"
                    placeholderTextColor="#9ca3af"
                    value={newItemName}
                    onChangeText={setNewItemName}
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Expiration Date</Text>
                  <TextInput
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 text-gray-800"
                    placeholder="e.g., 12/31/2026 or 1 week"
                    placeholderTextColor="#9ca3af"
                    value={newItemExpiration}
                    onChangeText={setNewItemExpiration}
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Location</Text>
                  <View className="flex-row gap-2">
                    {[
                      { label: "Pantry", value: 0 as const },
                      { label: "Refrigerator", value: 1 as const },
                      { label: "Freezer", value: 2 as const },
                    ].map((option) => {
                      const isSelected = newItemLocation === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setNewItemLocation(option.value)}
                          className={`flex-1 h-12 items-center justify-center rounded-xl border ${
                            isSelected
                              ? "bg-[#D9AC68] border-[#C9974F]"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <Text className={`${isSelected ? "text-white" : "text-gray-700"} font-semibold text-sm`}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Opened</Text>
                  <View className="flex-row gap-2">
                    {[
                      { label: "No", value: false },
                      { label: "Yes", value: true },
                    ].map((option) => {
                      const isSelected = newItemOpened === option.value;
                      return (
                        <TouchableOpacity
                          key={option.label}
                          onPress={() => setNewItemOpened(option.value)}
                          className={`flex-1 h-12 items-center justify-center rounded-xl border ${
                            isSelected
                              ? "bg-[#D9AC68] border-[#C9974F]"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <Text className={`${isSelected ? "text-white" : "text-gray-700"} font-semibold text-sm`}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View className="flex-row gap-4">
                <TouchableOpacity
                  className="flex-1 h-12 justify-center items-center rounded-xl bg-gray-100 active:bg-gray-200"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-gray-600 font-bold text-base">Cancel</Text>
                </TouchableOpacity>

                {/* replace handleAddItem with onPress figure out why it wont work ahaahahah*/}
                <TouchableOpacity
                  className="flex-1 h-12 justify-center items-center rounded-xl bg-[#D9AC68] active:bg-[#C9974F] shadow-lg shadow-[#D9AC68]/30"
                  onPress={handleAddItem}
                >
                  <Text className="text-white font-bold text-base">Save Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View className="w-full bg-white rounded-3xl p-6 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-800">Edit Item</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Feather name="x" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View className="space-y-4 mb-6">
                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Item Name</Text>
                  <TextInput
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 text-gray-800"
                    placeholder="e.g., Milk, Eggs, Bread"
                    placeholderTextColor="#9ca3af"
                    value={editItemName}
                    onChangeText={setEditItemName}
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Purchase Date</Text>
                  <TextInput
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 text-gray-800"
                    placeholder="e.g., 12/31/2026 or 1 week"
                    placeholderTextColor="#9ca3af"
                    value={editPurchaseDate}
                    onChangeText={setEditPurchaseDate}
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Expiration Date</Text>
                  <TextInput
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 text-gray-800"
                    placeholder="e.g., 12/31/2026 or 1 week"
                    placeholderTextColor="#9ca3af"
                    value={editExpirationDate}
                    onChangeText={setEditExpirationDate}
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Location</Text>
                  <View className="flex-row gap-2">
                    {[
                      { label: "Pantry", value: 0 as const },
                      { label: "Refrigerator", value: 1 as const },
                      { label: "Freezer", value: 2 as const },
                    ].map((option) => {
                      const isSelected = editItemLocation === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setEditItemLocation(option.value)}
                          className={`flex-1 h-12 items-center justify-center rounded-xl border ${
                            isSelected
                              ? "bg-[#D9AC68] border-[#C9974F]"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <Text className={`${isSelected ? "text-white" : "text-gray-700"} font-semibold text-sm`}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Opened</Text>
                  <View className="flex-row gap-2">
                    {[
                      { label: "No", value: false },
                      { label: "Yes", value: true },
                    ].map((option) => {
                      const isSelected = editItemOpened === option.value;
                      return (
                        <TouchableOpacity
                          key={option.label}
                          onPress={() => setEditItemOpened(option.value)}
                          className={`flex-1 h-12 items-center justify-center rounded-xl border ${
                            isSelected
                              ? "bg-[#D9AC68] border-[#C9974F]"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <Text className={`${isSelected ? "text-white" : "text-gray-700"} font-semibold text-sm`}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View className="flex-row gap-4">
                <TouchableOpacity
                  className="flex-1 h-12 justify-center items-center rounded-xl bg-gray-100 active:bg-gray-200"
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text className="text-gray-600 font-bold text-base">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 h-12 justify-center items-center rounded-xl bg-[#D9AC68] active:bg-[#C9974F] shadow-lg shadow-[#D9AC68]/30"
                  onPress={handleUpdateItem}
                >
                  <Text className="text-white font-bold text-base">Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for floating button
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0E6D2", // Light beige/brown
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8B5E3C", // Brownish color for RPG feel
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#999",
  },
  saveButton: {
    backgroundColor: "#8B5E3C",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

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
  expirationDate: string;
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

  const formatExpirationDate = (value?: string) => {
    if (!value) return "No Date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
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
          expirationDate: formatExpirationDate(item?.expirationDate),
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

  // Function to add a new item
  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    const trimmedExpiration = newItemExpiration.trim();

    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter an item name.");
      return;
    }

    let expirationDateForDb = new Date().toISOString();
    if (trimmedExpiration) {
      let parsedExpiration: Date;
      // If user enters a date-only string, treat it as end-of-day local time
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedExpiration)) {
        parsedExpiration = new Date(`${trimmedExpiration}T23:59:59.999`);
      } else {
        parsedExpiration = new Date(trimmedExpiration);
      }
      if (Number.isNaN(parsedExpiration.getTime())) {
        Alert.alert(
          "Invalid date",
          "Please use a valid date (e.g. 2024-12-31)."
        );
        return;
      }
      expirationDateForDb = parsedExpiration.toISOString();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/foodstuff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          opened: false,
          purchaseDate: new Date().toISOString(),
          expirationDate: expirationDateForDb,
          location: 0,
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
        expirationDate: formatExpirationDate(
          savedItem?.expirationDate ?? trimmedExpiration
        ),
      };

      setItems((prevItems) => [...prevItems, newItem]);

      // Reset and close modal
      setNewItemName("");
      setNewItemExpiration("");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Save failed", err?.message || "Could not save item.");
    }
  };

  // Function to delete an item
  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item: InventoryItem) => item.id !== id));
  };

  // Render individual item
  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View className="flex-row bg-white p-4 rounded-xl mb-3 items-center shadow-sm border border-green-50">
      <View className="w-12 h-12 rounded-full bg-green-50 justify-center items-center mr-4 border border-green-100">
        <Feather name="box" size={20} color="#166534" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
        <Text className="text-sm text-gray-500 mt-1">
          Expires: <Text className="text-green-700 font-medium">{item.expirationDate}</Text>
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteItem(item.id)}
        className="p-3 bg-red-50 rounded-full active:bg-red-100"
      >
        <Feather name="trash-2" size={20} color="#dc2626" />
      </TouchableOpacity>
    </View>
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
        <View className="px-6 py-4 mb-2">
          <Text className="text-3xl font-extrabold text-white tracking-wider shadow-sm">My Inventory</Text>
          <Text className="text-green-100 text-xs font-medium tracking-widest uppercase">Manage Your Items</Text>
        </View>

        {/* List Content */}
        <View className="flex-1 px-4">
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item: InventoryItem) => item.id}
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
                    placeholder="e.g., 2024-12-31 or 1 week"
                    placeholderTextColor="#9ca3af"
                    value={newItemExpiration}
                    onChangeText={setNewItemExpiration}
                  />
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
                  className="flex-1 h-12 justify-center items-center rounded-xl bg-green-700 active:bg-green-800 shadow-lg shadow-green-700/30"
                  onPress={handleAddItem}
                >
                  <Text className="text-white font-bold text-base">Save Item</Text>
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

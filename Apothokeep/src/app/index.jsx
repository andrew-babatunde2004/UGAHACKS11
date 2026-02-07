import { View, Text, TouchableOpacity, StatusBar, ImageBackground } from "react-native";
import { Link, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Note: Ensure expo-linear-gradient is installed. If not, we fall back to a View with background color.
// If customization of LinearGradient is needed, adjustments can be made.

export default function Index() {
  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#166534', '#15803d', '#f0fdf4']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%' }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <View>
            <Text className="text-3xl font-extrabold text-white tracking-wider shadow-sm">Apothokeep</Text>
            <Text className="text-green-100 text-xs font-medium tracking-widest uppercase">Freshness Tracker</Text>
          </View>

          <TouchableOpacity className="bg-white/20 px-6 py-2.5 rounded-full border border-white/30 active:bg-white/30 backdrop-blur-md">
            <Text className="text-white font-bold text-sm">Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View className="flex-1 px-6 justify-center">
          {/* Hero Section */}
          <View className="items-center mb-12">
            <View className="bg-white p-8 rounded-full mb-8 shadow-2xl border-4 border-green-50">
              <Feather name="clock" size={80} color="#166534" />
            </View>
            <Text className="text-5xl font-black text-center text-green-900 mb-4 leading-tight">
              Food <Text className="text-green-600">Fresh.</Text>{'\n'}Waste <Text className="text-red-500">Less.</Text>
            </Text>
            <Text className="text-lg text-center text-gray-600 mb-8 font-medium leading-relaxed px-4">
              Your smart pantry assistant to track expiration dates and save money.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-5 gap-5">
            <Link href="/inventory" asChild>
              <TouchableOpacity className="bg-green-700 p-5 rounded-2xl flex-row justify-center items-center shadow-lg shadow-green-900/40 active:scale-95 transition-transform duration-100 border-b-4 border-green-900">
                <Feather name="box" size={28} color="white" className="mr-4" />
                <Text className="text-white text-xl font-bold ml-2">My Inventory</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/tracker" asChild>
              <TouchableOpacity className="bg-white p-5 rounded-2xl flex-row justify-center items-center shadow-lg shadow-gray-200/50 active:scale-95 transition-transform duration-100 border-2 border-green-100">
                <Feather name="activity" size={28} color="#15803d" className="mr-4" />
                <Text className="text-green-800 text-xl font-bold ml-2">Expiration Tracker</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center pb-8">
          <Text className="text-xs text-gray-400 font-medium">v1.0.0 • Made for UGAHacks</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

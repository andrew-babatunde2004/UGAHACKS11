import * as React from "react";
import { useRef } from "react";
import { Text, View, StyleSheet, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { cssInterop } from "react-native-css-interop";

// We wrap the camera logic to prevent top-level imports of react-native-vision-camera
// which crashes on the web even if the component isn't rendered.
const CameraView = () => {
  // Lazy load native modules
  const { Camera, useCameraDevice, useCameraPermission, useCodeScanner } = require("react-native-vision-camera");
  const { useRouter } = require("expo-router");
  const { TouchableOpacity } = require("react-native");

  cssInterop(Camera, { className: "style" });

  const camera = useRef(null);
  const { hasPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const router = useRouter();
  const [isScanning, setIsScanning] = React.useState(true);

  const takePicture = async () => {
    try {
      if (camera.current == null) throw new Error("Camera is Null");
      const photo = await camera.current.takePhoto();
      console.log(photo);
      // Logic to handle photo (e.g., save or navigate) could go here
    } catch (e) {
      console.log(e);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13"],
    onCodeScanned: (codes) => {
      if (isScanning && codes.length > 0) {
        setIsScanning(false); // Prevent multiple triggers
        console.log(`Scanned ${codes[0].value} code!`);
        router.back();
      }
    },
  });

  if (device == null) return (
    <View style={styles.container}>
      <Text>No camera device found</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      <Camera
        ref={camera}
        codeScanner={codeScanner}
        photo={true}
        className="flex-1"
        device={device}
        isActive={true}
      />

      {/* Overlay Controls */}
      <SafeAreaView className="absolute w-full h-full flex-col justify-between p-6" pointerEvents="box-none">
        {/* Top Section: Cancel Button */}
        <View className="flex-row justify-start pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom Section: Take Picture Button */}
        <View className="items-center pb-8">
          <TouchableOpacity
            onPress={takePicture}
            className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default function Index() {
  if (Platform.OS !== "ios") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0fdf4" }}>
        <Feather name="camera-off" size={64} color="#166534" style={{ marginBottom: 20 }} />
        <Text style={{ fontSize: 18, color: "#166534", fontWeight: "bold" }}>
          Camera Preview Not Available
        </Text>
        <Text style={{ color: "#4b5563", marginTop: 8 }}>
          Please use a physical iOS device for camera features.
        </Text>
      </View>
    );
  }

  return <CameraView />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS == "ios" ? StatusBar.currentHeight : 0,
  },
});

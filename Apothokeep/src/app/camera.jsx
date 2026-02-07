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
  
  cssInterop(Camera, {className: "style"});
  const camera = useRef(null);
  const { hasPermission} = useCameraPermission();
  const device = useCameraDevice("back");

  const takePicture = async () => {
    try {
      if (camera.current == null) throw new Error("Camera is Null");
      // take photo logic here
    } catch (e) {
      console.log(e);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13"],
    onCodeScanned: (codes ) => {
      for (const code of codes) {
        console.log(`Scanned ${code.value} codes!`);
      }
    },
  });

  if (device == null) return (
    <View style={styles.container}>
      <Text>No camera device found</Text>
    </View>
  );

  return (
    <>
      <SafeAreaView className="flex-1">
      
        <Camera
          ref={camera}
          codeScanner={codeScanner}
          photo={true}
          className="flex-1"
          device={device}
          isActive
        />
      
      </SafeAreaView>
      
      <View
        style={{
          flex: 1.1,
          flexDirection: "row",
          justifyContent: "space-evenly",
          alignItems: "center",
        }}
      >
        <Text>Bottom Section</Text>
      </View>
    </>
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

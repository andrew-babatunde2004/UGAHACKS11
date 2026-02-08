import * as React from "react";
import { useRef } from "react";
import { Text, View, StyleSheet, Platform, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { cssInterop } from "react-native-css-interop";
import { router } from "expo-router";

// websocket url for backend commuication (doBS)
const WS_URL = "ws://172.20.108.250:8080"; // change to laptop IP

// We wrap the camera logic to prevent top-level imports of react-native-vision-camera
// which crashes on the web even if the component isn't rendered.
const CameraView = () => {
  // Lazy load native modules
  const { Camera, useCameraDevice, useCameraPermission, useCodeScanner } = require("react-native-vision-camera");

  cssInterop(Camera, { className: "style" });
  const camera = useRef(null);
  const { hasPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const lastScannedRef = useRef(null);
  const inFlightRef = useRef(false);
  const [isActive, setIsActive] = React.useState(true);

  // websocket ref
  const wsRef = useRef(null);

  React.useEffect(() => {
    if (!WS_URL || typeof WS_URL !== "string") {
      console.log("WS_URL missing or invalid");
      return;
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log("WS open");
    ws.onmessage = (e) => console.log("WS message:", e.data);
    ws.onerror = (e) => console.log("WS error:", e?.message ?? e);
    ws.onclose = (e) => console.log("WS closed:", e.code, e.reason);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);
  // end web socket setup

  const takePicture = async () => {
    try {
      if (camera.current == null) throw new Error("Camera is Null");
    } catch (e) {
      console.log(e);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13"],
    onCodeScanned: async (codes) => {
      if (inFlightRef.current) return;
      for (const code of codes) {
        if (code.value === lastScannedRef.current) continue;

        inFlightRef.current = true;
        lastScannedRef.current = code.value;
        // send barcode to backend via websocket
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "barcode_scan", barcode: code.value, location: 0, opened: false }));

          // Wait briefly for acknowledgment, then close connection and navigate
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
            setIsActive(false);
            router.push("/inventory");
            inFlightRef.current = false;
          }, 500);
        } else {
          console.log("WS not open; readyState =", ws?.readyState);
          setIsActive(false);
          router.push("/inventory");
          inFlightRef.current = false;
        }
      }
    },
  });


  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>Camera permission not granted</Text>
      </View>
    );
  }

  if (device == null) return (
    <View style={styles.container}>
      <Text>No camera device found</Text>
    </View>
  );

  return (
    <>
      <Camera
        ref={camera}
        codeScanner={codeScanner}
        photo={true}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
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

        {/* Bottom spacer to preserve layout without a shutter button */}
        <View className="items-center pb-8" />
      </SafeAreaView>
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
    paddingTop: Platform.OS === "ios" ? 0 : (StatusBar.currentHeight ?? 0),
  },
});

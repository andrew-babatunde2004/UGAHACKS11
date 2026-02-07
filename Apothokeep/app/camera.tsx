{/* import React from "react";
import { Camera, useCameraDevice, useCameraPermission, } from "react-native-vision-camera" 
import { Text, View , StyleSheet , Platform , StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef } from "react";
import { CodeScanner, useCodeScanner } from "react-native-vision-camera";
export default function Index() {
 
const camera = React.useRef<Camera>(null)

const { hasPermission } = useCameraPermission();
const device = useCameraDevice("back");


const takePicture = async () => {
  try{
    if (camera.current = null) throw new Error("Cmaeria is Null");
  } catch (e) {
  console.log(e)
}
}

const codeScanner = useCodeScanner({
  codeTypes: ['qr', 'ean-13'],
  onCodeScanned: (codes) => {
    for (const code of codes){
    console.log(`Scanned ${code.value} codes!`)
    }
  }
})



  if (device == null) return <NoCameraDeviceError />


return (
  <>
  <SafeAreaView style ={styles.containter}>
    <Camera ref={camera} codeScanner={codeScanner} photo={true} style ={{flex:1 }} device={device} isActive />
   </SafeAreaView>
   Bottom section 
   <View
   style ={{
    flex:1.1,
    flexDirection:"row",
    justifyContent:"space-evenly",
    alignItems:"center"
   }}>

   </View>
    </>
  );
}

const styles = StyleSheet.create({
  containter : {
  flex: 1,
  paddingTop: Platform.OS == "ios" ? StatusBar.currentHeight : 0,
}
});
*/}

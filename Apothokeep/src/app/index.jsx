import { Button, Text, View } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View  style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "purple",
    }}
    >
      <Text>Welcome to ApoThoKeep</Text>
      <Link href="/inventory" push asChild>
      <Button title= "take me to Inventory" />
      </Link>
         <Link href="/tracker" push asChild>
      <Button title= "take me to tracker" />
      </Link>
    </View>
  );
}

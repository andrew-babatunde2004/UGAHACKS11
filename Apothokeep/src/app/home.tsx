import { Text, View, Button} from "react-native";
import { Link } from "expo-router";
import React from "react";


export default function Home() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Link href="/" push asChild>
        <Button title="press me" />
       </Link>
    </View>
  );
}
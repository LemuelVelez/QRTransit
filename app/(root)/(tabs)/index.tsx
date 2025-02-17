import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="font-bold text-xl my-10">Welcome to QuickRide</Text>
      <Link href="/sign-in">Sign In</Link>
      <Link href="/register">Register</Link>
      <Link href="/explore">Explore</Link>
      <Link href="/profile">Profile</Link>
      <Link href="/properties/5">Property</Link>
    </View>
  );
}

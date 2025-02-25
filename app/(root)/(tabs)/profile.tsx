import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Define your stack navigator types
type RootStackParamList = {
  "sign-in": undefined;
};

const Profile = () => {
  const navigation = useNavigation<
    NativeStackNavigationProp<RootStackParamList>
  >();

  return (
    <SafeAreaView className="flex-1 bg bg-emerald-600">
      {/* Profile Section */}
      <View className="bg-emerald-600 p-4 mt-9">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
            <Text className="text-2xl">👤</Text>
          </View>
          <View>
            <Text className="text-white font-medium">Jagdish Berondo</Text>
            <Text className="text-white text-xs">09876543210</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View className="bg-[#3FE693] flex-1 p-4">
        {/* Settings Button */}
        <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-[#4aff9b]">
          <View className="flex-row items-center gap-3">
            <Icon name="settings" size={20} color="black" />
            <Text className="text-base">Settings</Text>
          </View>
          <Icon name="chevron-right" size={20} color="black" />
        </TouchableOpacity>

        {/* Logout Button - Positioned right after Settings button */}
        <TouchableOpacity
          className="flex-row items-center justify-between py-3 border-b border-[#4aff9b] mt-30"
          onPress={() => navigation.navigate("sign-in")}
        >
          <View className="flex-row items-center gap-3">
            <Icon name="exit-to-app" size={20} color="black" />
            <Text className="text-base">Log Out</Text>
          </View>
          <Icon name="chevron-right" size={20} color="black" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Profile;

import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { Settings, LogOut, ChevronRight } from "lucide-react-native";

const Profile = () => {
  return (
    <SafeAreaView className="flex-1">
      {/* Profile Section */}
      <View className="bg-[#199256] p-4">
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
            <Settings stroke="black" width={20} height={20} />
            <Text className="text-base">Settings</Text>
          </View>
          <ChevronRight stroke="black" width={20} height={20} />
        </TouchableOpacity>

        {/* Logout Button - Positioned right after Settings button */}
        <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-[#4aff9b] mt-30">
          <View className="flex-row items-center gap-3">
            <LogOut stroke="black" width={20} height={20} />
            <Text className="text-base">Log Out</Text>
          </View>
          <ChevronRight stroke="black" width={20} height={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Profile;

import { Tabs } from "expo-router";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabIcon = ({
  focused,
  icon,
  isQR = false,
}: {
  focused: boolean;
  icon: any;
  isQR?: boolean;
}) => {
  const backgroundColor = focused ? "#3FE693" : "transparent";

  if (isQR) {
    return (
      <View className="rounded-full p-4 -mt-20 items-center justify-center">
        <Image source={icon} className="w-15 h-15" resizeMode="contain" />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center"
      style={{
        backgroundColor: "transparent",
        width: focused ? 45 : 40,
      }}
    >
      <Image
        source={icon}
        className="w-10 h-10"
        resizeMode="contain"
        style={{
          marginBottom: focused ? 0 : 0,
        }}
      />
      {focused && (
        <View
          style={{
            position: "absolute",
            bottom: -11,
            width: "100%",
            height: 48,
            backgroundColor,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            zIndex: -1,
          }}
        />
      )}
    </View>
  );
};

const TabsLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#188E54",
          position: "absolute",
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={require("../../../assets/images/Home.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={require("../../../assets/images/Inbox.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="qrcode"
        options={{
          title: "QR Code",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={require("../../../assets/images/QRcode.png")}
              isQR={true}
            />
          ),
          tabBarStyle: {
            display: "none", // Hides the tab bar when on the QR Code screen
          },
        }}
      />
      <Tabs.Screen
        name="transaction"
        options={{
          title: "Transaction",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={require("../../../assets/images/Transaction.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={require("../../../assets/images/Profile.png")}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;

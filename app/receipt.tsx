"use client"

import { View, Text, TouchableOpacity, StyleSheet, Share, Image } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { useRef } from "react"
import { captureRef } from "react-native-view-shot"

export default function ReceiptScreen() {
  const { receiptId, passengerName, fare, from, to, timestamp, passengerType, paymentMethod } = useLocalSearchParams()
  const router = useRouter()
  const receiptRef = useRef(null)

  const handleShare = async () => {
    try {
      if (receiptRef.current) {
        const uri = await captureRef(receiptRef.current, {
          format: "png",
          quality: 0.8,
        })

        await Share.share({
          url: uri,
          title: "Receipt",
          message: `Receipt for fare payment of ${fare} from ${from} to ${to}`,
        })
      }
    } catch (error) {
      console.error("Error sharing receipt:", error)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/conductor" as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Receipt Card */}
      <View style={styles.receiptContainer} ref={receiptRef}>
        <View style={styles.receiptHeader}>
          <Image source={require("@/assets/images/QuickRide.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>QuickRide</Text>
          <Text style={styles.receiptTitle}>Payment Receipt</Text>
        </View>

        <View style={styles.receiptBody}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Receipt ID:</Text>
            <Text style={styles.receiptValue}>{receiptId}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Date:</Text>
            <Text style={styles.receiptValue}>{timestamp}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Passenger:</Text>
            <Text style={styles.receiptValue}>{passengerName}</Text>
          </View>

          {passengerType && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Passenger Type:</Text>
              <Text style={styles.receiptValue}>{passengerType}</Text>
            </View>
          )}

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>From:</Text>
            <Text style={styles.receiptValue}>{from}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>To:</Text>
            <Text style={styles.receiptValue}>{to}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Method:</Text>
            <View style={styles.paymentMethodContainer}>
              <Ionicons
                name={paymentMethod === "QR" ? "qr-code" : "cash"}
                size={16}
                color="#059669"
                style={styles.paymentIcon}
              />
              <Text style={styles.receiptValue}>{paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{fare}</Text>
          </View>
        </View>

        <View style={styles.receiptFooter}>
          <Text style={styles.footerText}>Thank you for using QuickRide!</Text>
          <Text style={styles.footerSubtext}>Safe travels!</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.newTransactionButton} onPress={() => router.push("/conductor" as any)}>
          <Ionicons name="add-circle-outline" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>New Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#059669",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  shareButton: {
    padding: 8,
  },
  receiptContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 16,
    color: "#666",
  },
  receiptBody: {
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    color: "#666",
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    maxWidth: "60%",
    textAlign: "right",
  },
  paymentMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  receiptFooter: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#999",
  },
  actionButtons: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  newTransactionButton: {
    backgroundColor: "#047857",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})


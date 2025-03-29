"use client"

import { useState, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from "react-native"
import { CameraView } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { uploadPassengerPhoto } from "@/lib/image-upload-service"

interface CameraCaptureProps {
    onCapture: (uri: string) => void
    onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const [flash, setFlash] = useState(false)
    const [isTakingPicture, setIsTakingPicture] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const cameraRef = useRef<CameraView>(null)

    const toggleFlash = () => setFlash(!flash)

    const takePicture = async () => {
        if (isTakingPicture || isUploading || !cameraRef.current) return

        setIsTakingPicture(true)
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })

            // Check if photo exists and has a uri before using it
            if (photo && photo.uri) {
                setIsUploading(true)

                // Upload the photo to Appwrite storage
                const photoUrl = await uploadPassengerPhoto(photo.uri)

                if (photoUrl) {
                    console.log("Photo uploaded successfully:", photoUrl)
                    // Pass the uploaded URL to the parent component
                    onCapture(photoUrl)
                } else {
                    console.error("Failed to upload photo to Appwrite storage")
                    // Fall back to local URI if upload failed
                    onCapture(photo.uri)
                }
            } else {
                console.error("Failed to capture photo: No URI available")
            }
        } catch (error) {
            console.error("Error taking picture:", error)
        } finally {
            setIsTakingPicture(false)
            setIsUploading(false)
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <CameraView ref={cameraRef} style={styles.camera} facing="back" enableTorch={flash} autofocus="on" />

            {/* Semi-transparent overlay */}
            <View style={styles.overlay}>
                <View style={styles.overlayContent}>
                    <Text style={styles.instructionText}>Take a photo of the passenger for cash payment</Text>
                </View>
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Passenger Photo</Text>
                <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
                    <Ionicons name={flash ? "flash" : "flash-off"} size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Capture Button */}
            <View style={styles.captureContainer}>
                {isUploading ? (
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.uploadingText}>Uploading photo...</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.captureButton, isTakingPicture && styles.captureButtonDisabled]}
                        onPress={takePicture}
                        disabled={isTakingPicture || isUploading}
                    >
                        {isTakingPicture ? <View style={styles.capturingIndicator} /> : <View style={styles.captureButtonInner} />}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    overlayContent: {
        padding: 20,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.5)",
        maxWidth: "80%",
    },
    header: {
        position: "absolute",
        top: 40,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    flashButton: {
        padding: 8,
    },
    instructionText: {
        color: "white",
        textAlign: "center",
        fontSize: 16,
    },
    captureContainer: {
        position: "absolute",
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    captureButtonDisabled: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    captureButtonInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "white",
    },
    capturingIndicator: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#ff4040",
    },
    uploadingContainer: {
        alignItems: "center",
    },
    uploadingText: {
        color: "white",
        marginTop: 10,
    },
})


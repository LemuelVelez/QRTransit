import { View, Modal, TouchableWithoutFeedback } from "react-native"
import RemittanceForm from "./remittance-form"


interface RemittanceModalProps {
    visible: boolean
    busId: string
    busNumber: string
    conductorId: string
    conductorName: string
    cashRevenue: number
    onClose: () => void
    onSuccess: () => void
}

export default function RemittanceModal({
    visible,
    busId,
    busNumber,
    conductorId,
    conductorName,
    cashRevenue,
    onClose,
    onSuccess,
}: RemittanceModalProps) {
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 justify-center items-center bg-black/50">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="w-[90%] max-w-md bg-white rounded-xl p-4 shadow-xl">
                            <RemittanceForm
                                busId={busId}
                                busNumber={busNumber}
                                conductorId={conductorId}
                                conductorName={conductorName}
                                cashRevenue={cashRevenue}
                                onSuccess={onSuccess}
                                onCancel={onClose}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    )
}


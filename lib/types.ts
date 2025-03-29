// Define types for the inspector interface

export interface BusInfo {
    id: string
    busNumber: string
    conductorId: string
    conductorName: string
    from: string
    to: string
    active: boolean
    timestamp: number
  }
  
  export interface PassengerInfo {
    id: string
    name: string
    fare: string
    from: string
    to: string
    timestamp: number
    paymentMethod: string
  }
  
  export interface InspectionRecord {
    id: string
    inspectorId: string
    busId: string
    busNumber: string
    conductorId: string
    conductorName: string
    timestamp: number
    inspectionFrom: string
    inspectionTo: string
    passengerCount: number
    status: "cleared" | "pending"
  }
  
  
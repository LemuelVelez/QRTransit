// Define types for the inspector interface

export interface BusInfo {
  id: string;
  busNumber: string;
  conductorId: string;
  conductorName: string;
  from: string;
  to: string;
  active: boolean;
  timestamp: string; // Changed to string
}

export interface PassengerInfo {
  id: string;
  name: string;
  fare: string;
  from: string;
  to: string;
  timestamp: string;
  paymentMethod: string;
  passengerPhoto?: string;
  passengerType?: string;
}

export interface InspectionRecord {
  id: string;
  inspectorId: string;
  busId: string;
  busNumber: string;
  conductorId: string;
  conductorName: string;
  timestamp: string; // Changed to string
  inspectionFrom: string;
  inspectionTo: string;
  passengerCount: string;
  status: "cleared" | "pending";
}

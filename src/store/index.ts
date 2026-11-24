import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ScanItem {
  id: string;
  type: string;
  input: string;
  riskScore: number;
  classification: "SAFE" | "SUSPICIOUS" | "MALICIOUS";
  threatCategory?: string | null;
  confidence: number;
  reasons: string[];
  recommendedAction: string;
  createdAt: string;
}

interface ThreatState {
  activeTab: "URL" | "QR" | "MESSAGE" | "EMAIL";
  scans: ScanItem[];
  currentResult: ScanItem | null;
  isScanning: boolean;
}

const initialState: ThreatState = {
  activeTab: "URL",
  scans: [],
  currentResult: null,
  isScanning: false,
};

const threatSlice = createSlice({
  name: "threat",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<"URL" | "QR" | "MESSAGE" | "EMAIL">) {
      state.activeTab = action.payload;
    },
    setIsScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
    },
    setCurrentResult(state, action: PayloadAction<ScanItem | null>) {
      state.currentResult = action.payload;
    },
    setScans(state, action: PayloadAction<ScanItem[]>) {
      state.scans = action.payload;
    },
    addScan(state, action: PayloadAction<ScanItem>) {
      state.scans.unshift(action.payload);
    },
  },
});

export const { setActiveTab, setIsScanning, setCurrentResult, setScans, addScan } = threatSlice.actions;

export const store = configureStore({
  reducer: {
    threat: threatSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

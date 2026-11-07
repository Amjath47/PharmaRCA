import { configureStore } from "@reduxjs/toolkit";
import rcaReducer from "../features/rca/rcaSlice";

export const store = configureStore({
  reducer: {
    rca: rcaReducer,
  },
});
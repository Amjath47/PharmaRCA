import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  analysis: null,
  loading: false,
  error: "",
  reviewMessage: "",
  saving: false,
  saveMessage: "",
  hasSaved: false,
};

const rcaSlice = createSlice({
  name: "rca",
  initialState,
  reducers: {
    setAnalysis(state, action) {
      state.analysis = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    setReviewMessage(state, action) {
      state.reviewMessage = action.payload;
    },
    setSaving(state, action) {
      state.saving = action.payload;
    },
    setSaveMessage(state, action) {
      state.saveMessage = action.payload;
    },
    setHasSaved(state, action) {
      state.hasSaved = action.payload;
    },
    resetRca() {
      return initialState;
    },
  },
});

export const {
  setAnalysis,
  setLoading,
  setError,
  setReviewMessage,
  setSaving,
  setSaveMessage,
  setHasSaved,
  resetRca,
} = rcaSlice.actions;

export default rcaSlice.reducer;
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
}

interface UiState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  searchModalOpen: boolean;
  toasts: ToastItem[];
}

const savedTheme = (localStorage.getItem('sp_theme') as 'dark' | 'light') || 'dark';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const initialState: UiState = {
  theme: savedTheme,
  sidebarCollapsed: false,
  searchModalOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('sp_theme', state.theme);
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSearchModalOpen(state, action: PayloadAction<boolean>) {
      state.searchModalOpen = action.payload;
    },
    addToast(state, action: PayloadAction<Omit<ToastItem, 'id'>>) {
      state.toasts.push({
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...action.payload,
      });
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toggleTheme, toggleSidebar, setSearchModalOpen, addToast, dismissToast } =
  uiSlice.actions;
export default uiSlice.reducer;

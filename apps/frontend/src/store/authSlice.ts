import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUserState {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  globalRole: string;
  isEmailVerified?: boolean;
}

interface AuthState {
  user: AuthUserState | null;
  activeWorkspaceId: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  activeWorkspaceId: localStorage.getItem('sp_workspace_id'),
  isAuthenticated: Boolean(localStorage.getItem('sp_access_token')),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUserState; accessToken?: string }>,
    ) {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      if (action.payload.accessToken) {
        localStorage.setItem('sp_access_token', action.payload.accessToken);
      }
    },
    setActiveWorkspace(state, action: PayloadAction<string>) {
      state.activeWorkspaceId = action.payload;
      localStorage.setItem('sp_workspace_id', action.payload);
    },
    logoutState(state) {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('sp_access_token');
    },
  },
});

export const { setCredentials, setActiveWorkspace, logoutState } = authSlice.actions;
export default authSlice.reducer;

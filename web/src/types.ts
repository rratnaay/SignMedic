export interface CatalogItem {
  id: string;
  kategori: string;
  label: string;
  icon?: string;
}

export type TriageConfirmationStatus = 'unconfirmed' | 'confirmed';

export interface NurseMessage {
  id: string;
  text: string;
  timestamp: number;
  sender: 'nurse' | 'patient';
}

export interface TriageState {
  selectedItemIds: string[];
  confirmedItemIds: string[];
  status: TriageConfirmationStatus;
  nurseMessages: NurseMessage[];
  lastUpdated: number;
}

export type TriageAction =
  | { type: 'TOGGLE_ITEM'; payload: string }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CONFIRM_SUMMARY' }
  | { type: 'EDIT_SUMMARY' }
  | { type: 'ADD_NURSE_MESSAGE'; payload: { text: string; sender?: 'nurse' | 'patient' } }
  | { type: 'RESET_SESSION' }
  | { type: 'SYNC_STATE'; payload: TriageState };

import { TriageState, TriageAction } from '../types';

export const initialTriageState: TriageState = {
  selectedItemIds: [],
  confirmedItemIds: [],
  status: 'unconfirmed',
  nurseMessages: [],
  lastUpdated: Date.now(),
};

export function triageReducer(state: TriageState, action: TriageAction): TriageState {
  switch (action.type) {
    case 'TOGGLE_ITEM': {
      const id = action.payload;
      const isSelected = state.selectedItemIds.includes(id);
      const newSelected = isSelected
        ? state.selectedItemIds.filter((item) => item !== id)
        : [...state.selectedItemIds, id];

      // DESIGN.md Sec 11: Modifying items after confirmation invalidates confirmed status
      return {
        ...state,
        selectedItemIds: newSelected,
        status: 'unconfirmed',
        lastUpdated: Date.now(),
      };
    }

    case 'SELECT_ITEM': {
      const id = action.payload;
      if (state.selectedItemIds.includes(id)) return state;
      return {
        ...state,
        selectedItemIds: [...state.selectedItemIds, id],
        status: 'unconfirmed',
        lastUpdated: Date.now(),
      };
    }

    case 'DESELECT_ITEM':
    case 'REMOVE_ITEM': {
      const id = action.payload;
      if (!state.selectedItemIds.includes(id)) return state;
      return {
        ...state,
        selectedItemIds: state.selectedItemIds.filter((item) => item !== id),
        status: 'unconfirmed',
        lastUpdated: Date.now(),
      };
    }

    case 'CONFIRM_SUMMARY': {
      if (state.selectedItemIds.length === 0) return state;
      return {
        ...state,
        confirmedItemIds: [...state.selectedItemIds],
        status: 'confirmed',
        lastUpdated: Date.now(),
      };
    }

    case 'EDIT_SUMMARY': {
      return {
        ...state,
        status: 'unconfirmed',
        lastUpdated: Date.now(),
      };
    }

    case 'ADD_NURSE_MESSAGE': {
      const text = action.payload.text.trim();
      if (!text) return state;
      const newMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text,
        timestamp: Date.now(),
        sender: action.payload.sender || 'nurse',
      };
      return {
        ...state,
        // Newest messages first as per DESIGN.md Section 7
        nurseMessages: [newMessage, ...state.nurseMessages],
        lastUpdated: Date.now(),
      };
    }

    case 'RESET_SESSION': {
      return {
        selectedItemIds: [],
        confirmedItemIds: [],
        status: 'unconfirmed',
        nurseMessages: [],
        lastUpdated: Date.now(),
      };
    }

    case 'SYNC_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

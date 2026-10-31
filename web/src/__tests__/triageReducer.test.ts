import { describe, it, expect } from 'vitest';
import { initialTriageState, triageReducer } from '../state/triageReducer';
import { TriageState } from '../types';

describe('triageReducer unit tests', () => {
  it('should return initial state correctly', () => {
    expect(initialTriageState.selectedItemIds).toEqual([]);
    expect(initialTriageState.confirmedItemIds).toEqual([]);
    expect(initialTriageState.status).toBe('unconfirmed');
    expect(initialTriageState.nurseMessages).toEqual([]);
  });

  it('should toggle item selection (add if not present, remove if present)', () => {
    let state = triageReducer(initialTriageState, { type: 'TOGGLE_ITEM', payload: 'keluhan_sakit_nyeri' });
    expect(state.selectedItemIds).toEqual(['keluhan_sakit_nyeri']);
    expect(state.status).toBe('unconfirmed');

    // Toggle again should remove it
    state = triageReducer(state, { type: 'TOGGLE_ITEM', payload: 'keluhan_sakit_nyeri' });
    expect(state.selectedItemIds).toEqual([]);
  });

  it('should select and deselect items explicitly', () => {
    let state = triageReducer(initialTriageState, { type: 'SELECT_ITEM', payload: 'lokasi_kepala' });
    expect(state.selectedItemIds).toContain('lokasi_kepala');

    // Duplicate select shouldn't duplicate id
    state = triageReducer(state, { type: 'SELECT_ITEM', payload: 'lokasi_kepala' });
    expect(state.selectedItemIds.length).toBe(1);

    state = triageReducer(state, { type: 'DESELECT_ITEM', payload: 'lokasi_kepala' });
    expect(state.selectedItemIds).not.toContain('lokasi_kepala');
  });

  it('should remove item via REMOVE_ITEM action', () => {
    const startState: TriageState = {
      ...initialTriageState,
      selectedItemIds: ['keluhan_mual', 'lokasi_perut'],
    };
    const nextState = triageReducer(startState, { type: 'REMOVE_ITEM', payload: 'keluhan_mual' });
    expect(nextState.selectedItemIds).toEqual(['lokasi_perut']);
  });

  it('should confirm summary only when there are selected items', () => {
    // Empty state should not confirm
    const emptyConfirm = triageReducer(initialTriageState, { type: 'CONFIRM_SUMMARY' });
    expect(emptyConfirm.status).toBe('unconfirmed');
    expect(emptyConfirm.confirmedItemIds).toEqual([]);

    const stateWithItems: TriageState = {
      ...initialTriageState,
      selectedItemIds: ['keluhan_sakit_nyeri', 'lokasi_dada'],
    };
    const confirmedState = triageReducer(stateWithItems, { type: 'CONFIRM_SUMMARY' });
    expect(confirmedState.status).toBe('confirmed');
    expect(confirmedState.confirmedItemIds).toEqual(['keluhan_sakit_nyeri', 'lokasi_dada']);
  });

  it('should invalidate confirmed status if items are modified or removed (DESIGN.md Sec 11)', () => {
    const confirmedState: TriageState = {
      selectedItemIds: ['keluhan_sakit_nyeri', 'lokasi_dada'],
      confirmedItemIds: ['keluhan_sakit_nyeri', 'lokasi_dada'],
      status: 'confirmed',
      nurseMessages: [],
      lastUpdated: Date.now(),
    };

    // Modifying items after confirmation must invalidate confirmation
    const modifiedState = triageReducer(confirmedState, { type: 'TOGGLE_ITEM', payload: 'lokasi_kepala' });
    expect(modifiedState.status).toBe('unconfirmed');
    expect(modifiedState.selectedItemIds).toContain('lokasi_kepala');

    // Removing item also invalidates
    const reconfirmedState = triageReducer(modifiedState, { type: 'CONFIRM_SUMMARY' });
    expect(reconfirmedState.status).toBe('confirmed');

    const removedState = triageReducer(reconfirmedState, { type: 'REMOVE_ITEM', payload: 'keluhan_sakit_nyeri' });
    expect(removedState.status).toBe('unconfirmed');
  });

  it('should handle EDIT_SUMMARY by reverting status to unconfirmed', () => {
    const confirmedState: TriageState = {
      selectedItemIds: ['keluhan_pusing'],
      confirmedItemIds: ['keluhan_pusing'],
      status: 'confirmed',
      nurseMessages: [],
      lastUpdated: Date.now(),
    };

    const editableState = triageReducer(confirmedState, { type: 'EDIT_SUMMARY' });
    expect(editableState.status).toBe('unconfirmed');
    expect(editableState.selectedItemIds).toEqual(['keluhan_pusing']);
  });

  it('should add nurse messages with newest message first', () => {
    let state = triageReducer(initialTriageState, {
      type: 'ADD_NURSE_MESSAGE',
      payload: { text: 'Pesan pertama', sender: 'nurse' },
    });
    expect(state.nurseMessages.length).toBe(1);
    expect(state.nurseMessages[0].text).toBe('Pesan pertama');

    state = triageReducer(state, {
      type: 'ADD_NURSE_MESSAGE',
      payload: { text: 'Pesan kedua', sender: 'nurse' },
    });
    expect(state.nurseMessages.length).toBe(2);
    // Newest on top
    expect(state.nurseMessages[0].text).toBe('Pesan kedua');
    expect(state.nurseMessages[1].text).toBe('Pesan pertama');
  });

  it('should ignore empty nurse messages', () => {
    const state = triageReducer(initialTriageState, {
      type: 'ADD_NURSE_MESSAGE',
      payload: { text: '   ', sender: 'nurse' },
    });
    expect(state.nurseMessages.length).toBe(0);
  });

  it('should reset session completely', () => {
    const dirtyState: TriageState = {
      selectedItemIds: ['keluhan_sakit_nyeri'],
      confirmedItemIds: ['keluhan_sakit_nyeri'],
      customComplaints: ['Luka di siku'],
      confirmedCustomComplaints: ['Luka di siku'],
      status: 'confirmed',
      nurseMessages: [{ id: '1', text: 'Halo', timestamp: 12345, sender: 'nurse' }],
      lastUpdated: 100,
    };

    const cleanState = triageReducer(dirtyState, { type: 'RESET_SESSION' });
    expect(cleanState.selectedItemIds).toEqual([]);
    expect(cleanState.confirmedItemIds).toEqual([]);
    expect(cleanState.customComplaints).toEqual([]);
    expect(cleanState.confirmedCustomComplaints).toEqual([]);
    expect(cleanState.status).toBe('unconfirmed');
    expect(cleanState.nurseMessages).toEqual([]);
  });

  it('should add and remove custom complaints typed by patient', () => {
    let state = triageReducer(initialTriageState, {
      type: 'ADD_CUSTOM_COMPLAINT',
      payload: 'Terjatuh dari sepeda',
    });
    expect(state.customComplaints).toEqual(['Terjatuh dari sepeda']);
    expect(state.status).toBe('unconfirmed');

    // Duplicate text should not duplicate
    state = triageReducer(state, {
      type: 'ADD_CUSTOM_COMPLAINT',
      payload: 'Terjatuh dari sepeda',
    });
    expect(state.customComplaints?.length).toBe(1);

    // Confirm summary with custom complaint
    state = triageReducer(state, { type: 'CONFIRM_SUMMARY' });
    expect(state.status).toBe('confirmed');
    expect(state.confirmedCustomComplaints).toEqual(['Terjatuh dari sepeda']);

    // Remove custom complaint
    state = triageReducer(state, {
      type: 'REMOVE_CUSTOM_COMPLAINT',
      payload: 'Terjatuh dari sepeda',
    });
    expect(state.customComplaints).toEqual([]);
    expect(state.status).toBe('unconfirmed');
  });
});

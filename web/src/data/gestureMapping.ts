/**
 * SignMedic Gesture-to-Catalog Mapping Configuration
 * Separate mapping file decoupling ML model classes from catalog items.
 *
 * Dataset context: WL-BISINDO test dataset (6 benchmark classes).
 * As noted in FEATURE_SPEC.md & LIMITATIONS.md, these are proxy benchmark classes
 * mapped directly to triage catalog entries.
 */

import { CATALOG_BY_ID } from './catalog';
import { CatalogItem } from '../types';

export interface GestureDefinition {
  className: string;
  catalogId: string;
  displayLabel: string;
  description: string;
}

export const GESTURE_MAPPINGS: Record<string, GestureDefinition> = {
  Air: {
    className: 'Air',
    catalogId: 'kebutuhan_bantuan_segera',
    displayLabel: 'Butuh Bantuan Segera',
    description: 'Permintaan bantuan atau kebutuhan mendesak',
  },
  Makan: {
    className: 'Makan',
    catalogId: 'info_alergi',
    displayLabel: 'Alergi Obat / Makanan',
    description: 'Informasi terkait asupan konsumsi atau alergi makanan',
  },
  Saya: {
    className: 'Saya',
    catalogId: 'konfirmasi_ya',
    displayLabel: 'Ya (Diri Sendiri)',
    description: 'Konfirmasi identitas diri atau persetujuan',
  },
  Tuli: {
    className: 'Tuli',
    catalogId: 'kebutuhan_pendamping',
    displayLabel: 'Butuh Pendamping',
    description: 'Membutuhkan pendamping komunikasi atau penerjemah',
  },
  Maaf: {
    className: 'Maaf',
    catalogId: 'konfirmasi_belum_mengerti',
    displayLabel: 'Saya Belum Mengerti',
    description: 'Klarifikasi pesan atau belum memahami penjelasan',
  },
  'Terima kasih': {
    className: 'Terima kasih',
    catalogId: 'konfirmasi_ya',
    displayLabel: 'Ya / Mengerti',
    description: 'Apresiasi konfirmasi pesan diterima',
  },
};

/**
 * Gets the corresponding catalog item for a recognized model class name.
 */
export function getCatalogItemForGesture(className: string): CatalogItem | undefined {
  const mapping = GESTURE_MAPPINGS[className];
  if (!mapping) return undefined;
  return CATALOG_BY_ID[mapping.catalogId];
}

/**
 * Returns the list of all supported gestures for UI vocabulary display.
 */
export function getSupportedGesturesList(): GestureDefinition[] {
  return Object.values(GESTURE_MAPPINGS);
}

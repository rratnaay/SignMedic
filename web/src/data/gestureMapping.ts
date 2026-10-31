/**
 * SignMedic Gesture-to-Catalog Mapping Configuration
 * Separate mapping file decoupling ML model classes from catalog items.
 *
 * Triage catalog: 10 clinical gesture classes mapped directly to triage catalog entries.
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
  Batuk: {
    className: 'Batuk',
    catalogId: 'keluhan_batuk',
    displayLabel: 'Batuk',
    description: 'Gejala batuk terus-menerus atau batuk berdahak',
  },
  Demam: {
    className: 'Demam',
    catalogId: 'keluhan_demam',
    displayLabel: 'Demam / Panas',
    description: 'Suhu tubuh terasa panas atau demam tinggi',
  },
  Pilek: {
    className: 'Pilek',
    catalogId: 'keluhan_pilek',
    displayLabel: 'Pilek / Flu',
    description: 'Hidung tersumbat, berair, atau gejala flu',
  },
  'Sesak Nafas': {
    className: 'Sesak Nafas',
    catalogId: 'keluhan_sesak_napas',
    displayLabel: 'Sesak Napas',
    description: 'Sulit bernapas atau dada terasa sesak dan berat',
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

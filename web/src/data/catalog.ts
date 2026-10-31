import catalogRaw from '../../shared/catalog.json';
import { CatalogItem } from '../types';

export const CATALOG: CatalogItem[] = catalogRaw as CatalogItem[];

export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map((item) => [item.id, item])
);

export const CATEGORIES: string[] = [
  'Keluhan Utama',
  'Lokasi Tubuh',
  'Kebutuhan Triase',
  'Info Penting',
  'Konfirmasi Cepat',
];

export const ITEMS_BY_CATEGORY: Record<string, CatalogItem[]> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat] = CATALOG.filter((item) => item.kategori === cat);
    return acc;
  },
  {} as Record<string, CatalogItem[]>
);

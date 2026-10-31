import React from 'react';
import {
  Activity,
  AlertTriangle,
  Armchair,
  Check,
  CheckCircle2,
  CircleDot,
  Frown,
  Hand,
  Heart,
  HelpCircle,
  Pill,
  RotateCw,
  Siren,
  User,
  Users,
  Wind,
  X,
} from 'lucide-react';

export const CATALOG_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // Keluhan Utama
  keluhan_sakit_nyeri: Activity,
  keluhan_mual: Frown,
  keluhan_pusing: RotateCw,
  keluhan_sesak_napas: Wind,

  // Lokasi Tubuh
  lokasi_kepala: User,
  lokasi_dada: Heart,
  lokasi_perut: CircleDot,
  lokasi_tangan_kaki: Hand,

  // Kebutuhan Triase
  kebutuhan_bantuan_segera: Siren,
  kebutuhan_duduk_berbaring: Armchair,
  kebutuhan_pendamping: Users,

  // Info Penting
  info_alergi: AlertTriangle,
  info_obat_rutin: Pill,

  // Konfirmasi Cepat
  konfirmasi_ya: Check,
  konfirmasi_tidak: X,
  konfirmasi_belum_mengerti: HelpCircle,
};

export function getCatalogIcon(id: string): React.ComponentType<{ className?: string }> | null {
  return CATALOG_ICON_MAP[id] || null;
}

export { CheckCircle2, Siren };

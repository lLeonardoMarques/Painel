import React from "react";
import PainelGerencial from "./PainelGerencial";

export interface PainelRegionaisProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  user?: any;
  onPageChange?: (page: string) => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

/**
 * Componente PainelRegionais
 * Status Diário da Operação para Centrais de Distribuição fora do estado de São Paulo (Regionais GPA)
 * CDs Integrados:
 * - CD 409 (Rio de Janeiro / RJ)
 * - CD 1974 (Fortaleza / CE)
 * - CD 1953 (Pernambuco / PE)
 * - CD 1979 (Brasilia)
 * - CD 1984 (Pernambuco / PE)
 */
export default function PainelRegionais(props: PainelRegionaisProps) {
  return <PainelGerencial {...props} variant="regionais" />;
}

export interface Capacidade {
  id: number;
  dataMovimentacao: string; // YYYY-MM-DD
  cd: number;
  categoria: string;
  capacidadeInbound: number | null;
  capacidadeOutboundFracionado: number | null;
  capacidadeOutboundFechado: number | null;
  recebimentoRemunerado?: number | null;
}

export type UserRole = "admin" | "ppcp" | "ga";

export interface User {
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  token?: string;
}

export interface Filters {
  cd: string;
  ano: string;
  mes: string;
  categoria: string;
}

export interface DayRow {
  id: number;
  dateStr: string; // YYYY-MM-DD
  weekday: string;
  capacidadeInbound: number | null;
  capacidadeOutboundFracionado: number | null;
  capacidadeOutboundFechado: number | null;
  recebimentoRemunerado?: number | null;
  raw: Capacidade;
}

export interface WeekRow {
  weekNumber: number; // 1, 2, 3, 4, 5
  weekLabel: string; // e.g. "Semana 1 (01/06 a 07/06)"
  startDate: string;
  endDate: string;
  capacidadeInbound: number;
  capacidadeOutboundFracionado: number;
  capacidadeOutboundFechado: number;
  days: DayRow[];
}

export interface MonthRow {
  monthKey: string; // "YYYY-MM"
  monthName: string; // "Julho de 2026"
  capacidadeInbound: number;
  capacidadeOutboundFracionado: number;
  capacidadeOutboundFechado: number;
  weeks: WeekRow[];
  cd: number;
  categoria: string;
}
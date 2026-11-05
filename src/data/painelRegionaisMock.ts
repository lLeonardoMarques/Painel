import { PainelGerencialData } from "../types";

export const PAINEL_REGIONAIS_INITIAL_DATA: PainelGerencialData = {
  dataReferencia: "24/09/2026 · 07h00",
  distribuicao: "Supply Chain / Regionais Fora de SP",
  cds: [
    {
      cd: 409,
      nome: "CD 409",
      regiao: "Brasília / DF",
      statusGeral: "ATENÇÃO",
      ocupacao: {
        percentual: 82.5,
        total: 11200,
        ocupada: 9240,
        livre: 1480,
        bloqueada: 480,
        alertaCategorias: [
          { nome: "Mercearia", percentual: 89, livres: 45 },
          { nome: "Perecíveis", percentual: 84, livres: 60 },
          { nome: "FLV", percentual: 79, livres: 95 }
        ]
      },
      agendas: {
        percentual: 98,
        previstas: 147,
        capacidade: 150,
        alertaCategorias: [
          { nome: "Mercearia", percentual: 108, senhas: 24 },
          { nome: "Perecíveis", percentual: 95, senhas: 18 }
        ]
      },
      backlogRecebimento: {
        senhasAtraso: 185,
        diffDiaAnterior: 22,
        topFornecedores: [
          { nome: "Fornecedor Centro-Oeste A", senhasAtrasadas: 38 },
          { nome: "Fornecedor B", senhasAtrasadas: 26 }
        ]
      },
      backlogFaturamento: {
        percentual: 88,
        capacidade: 1600,
        backlogPrevisto14h: 1408
      }
    },
    {
      cd: 1974,
      nome: "CD 1974",
      regiao: "Fortaleza / CE",
      statusGeral: "NORMAL",
      ocupacao: {
        percentual: 68.4,
        total: 9800,
        ocupada: 6700,
        livre: 2650,
        bloqueada: 450,
        alertaCategorias: [
          { nome: "Perecíveis", percentual: 76, livres: 120 }
        ]
      },
      agendas: {
        percentual: 86,
        previstas: 120,
        capacidade: 140,
        alertaCategorias: []
      },
      backlogRecebimento: {
        senhasAtraso: 92,
        diffDiaAnterior: -14,
        topFornecedores: [
          { nome: "Fornecedor Nordeste A", senhasAtrasadas: 21 }
        ]
      },
      backlogFaturamento: {
        percentual: 71,
        capacidade: 1350,
        backlogPrevisto14h: 958
      }
    },
    {
      cd: 1953,
      nome: "CD 1953",
      regiao: "Caxias / RJ",
      statusGeral: "CRÍTICO",
      ocupacao: {
        percentual: 92.1,
        total: 14500,
        ocupada: 13355,
        livre: 745,
        bloqueada: 400,
        alertaCategorias: [
          { nome: "Mercearia", percentual: 96, livres: 32 },
          { nome: "Limpeza & Higiene", percentual: 88, livres: 78 }
        ]
      },
      agendas: {
        percentual: 114,
        previstas: 205,
        capacidade: 180,
        alertaCategorias: [
          { nome: "Mercearia", percentual: 124, senhas: 48 },
          { nome: "Bebidas", percentual: 110, senhas: 28 }
        ]
      },
      backlogRecebimento: {
        senhasAtraso: 412,
        diffDiaAnterior: 54,
        topFornecedores: [
          { nome: "Fornecedor Rio A", senhasAtrasadas: 82 },
          { nome: "Fornecedor Rio B", senhasAtrasadas: 61 }
        ]
      },
      backlogFaturamento: {
        percentual: 119,
        capacidade: 1700,
        backlogPrevisto14h: 2023
      }
    },
    {
      cd: 1979,
      nome: "CD 1979",
      regiao: "Jaboatão / PE",
      statusGeral: "ATENÇÃO",
      ocupacao: {
        percentual: 79.6,
        total: 10600,
        ocupada: 8438,
        livre: 1642,
        bloqueada: 520,
        alertaCategorias: [
          { nome: "FLV", percentual: 86, livres: 50 },
          { nome: "Perecíveis", percentual: 83, livres: 72 }
        ]
      },
      agendas: {
        percentual: 104,
        previstas: 156,
        capacidade: 150,
        alertaCategorias: [
          { nome: "Perecíveis", percentual: 109, senhas: 22 }
        ]
      },
      backlogRecebimento: {
        senhasAtraso: 215,
        diffDiaAnterior: 18,
        topFornecedores: [
          { nome: "Fornecedor Pernambuco A", senhasAtrasadas: 44 }
        ]
      },
      backlogFaturamento: {
        percentual: 94,
        capacidade: 1450,
        backlogPrevisto14h: 1363
      }
    },
    {
      cd: 1984,
      nome: "CD 1984",
      regiao: "Curitiba / PR",
      statusGeral: "NORMAL",
      ocupacao: {
        percentual: 66.8,
        total: 8900,
        ocupada: 5945,
        livre: 2625,
        bloqueada: 330,
        alertaCategorias: [
          { nome: "Congelados", percentual: 74, livres: 110 }
        ]
      },
      agendas: {
        percentual: 89,
        previstas: 116,
        capacidade: 130,
        alertaCategorias: []
      },
      backlogRecebimento: {
        senhasAtraso: 78,
        diffDiaAnterior: -8,
        topFornecedores: [
          { nome: "Fornecedor Sul A", senhasAtrasadas: 16 }
        ]
      },
      backlogFaturamento: {
        percentual: 65,
        capacidade: 1200,
        backlogPrevisto14h: 780
      }
    }
  ]
};

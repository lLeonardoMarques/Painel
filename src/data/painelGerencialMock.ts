import { PainelGerencialData } from "../types";

export const PAINEL_GERENCIAL_INITIAL_DATA: PainelGerencialData = {
  dataReferencia: "09/09/2026 · 07h00",
  distribuicao: "Supply Chain / Operações CD",
  cds: [
    {
      cd: 1965,
      nome: "CD 1965",
      regiao: "Osasco / SP",
      statusGeral: "ATENÇÃO",
      ocupacao: {
        percentual: 78.4,
        total: 12500,
        ocupada: 9800,
        livre: 2100,
        bloqueada: 600,
        alertaCategorias: [
          { nome: "Bebidas", percentual: 92, livres: 85 },
          { nome: "Hortifruti", percentual: 88, livres: 140 }
        ]
      },
      agendas: {
        percentual: 106,
        previstas: 170,
        capacidade: 160,
        alertaCategorias: [
          { nome: "Mercearia", percentual: 112, senhas: 34 },
          { nome: "Limpeza", percentual: 105, senhas: 28 }
        ]
      },
      backlogRecebimento: {
        senhasAtraso: 342,
        diffDiaAnterior: 38,
        topFornecedores: [
          { nome: "Fornecedor A", senhasAtrasadas: 58 },
          { nome: "Fornecedor B", senhasAtrasadas: 41 }
        ]
      },
      backlogFaturamento: {
        percentual: 89,
        capacidade: 1800,
        backlogPrevisto14h: 1602
      }
    },
    {
      cd: 1942,
      nome: "CD 1942",
      regiao: "Gravataí / RS",
      statusGeral: "NORMAL",
      ocupacao: {
        percentual: 64.1,
        total: 8200,
        ocupada: 5260,
        livre: 2640,
        bloqueada: 300,
        alertaCategorias: []
      },
      agendas: {
        percentual: 88,
        previstas: 105,
        capacidade: 120,
        alertaCategorias: []
      },
      backlogRecebimento: {
        senhasAtraso: 64,
        diffDiaAnterior: -12,
        topFornecedores: []
      },
      backlogFaturamento: {
        percentual: 61,
        capacidade: 1200,
        backlogPrevisto14h: 732
      }
    },
    {
      cd: 930,
      nome: "CD 930",
      regiao: "Cabo / PE",
      statusGeral: "CRÍTICO",
      ocupacao: {
        percentual: 91.2,
        total: 9600,
        ocupada: 8750,
        livre: 850,
        bloqueada: 420,
        alertaCategorias: [
          { nome: "Congelados", percentual: 97, livres: 22 },
          { nome: "Mercearia", percentual: 94, livres: 35 },
          { nome: "Bebidas", percentual: 89, livres: 48 }
        ]
      },
      agendas: {
        percentual: 118,
        previstas: 189,
        capacidade: 160,
        alertaCategorias: [
          { nome: "Congelados", percentual: 131, senhas: 41 },
          { nome: "Bebidas", percentual: 122, senhas: 37 }
        ]
      },
      backlogRecebimento: {
        senhasAtraso: 507,
        diffDiaAnterior: 91,
        topFornecedores: [
          { nome: "Fornecedor D", senhasAtrasadas: 120 },
          { nome: "Fornecedor E", senhasAtrasadas: 87 }
        ]
      },
      backlogFaturamento: {
        percentual: 124,
        capacidade: 1400,
        backlogPrevisto14h: 1736
      }
    },
    {
      cd: 7801,
      nome: "CD 7801",
      regiao: "Goiânia / GO",
      statusGeral: "NORMAL",
      ocupacao: {
        percentual: 71.3,
        total: 10400,
        ocupada: 7415,
        livre: 2985,
        bloqueada: 380,
        alertaCategorias: []
      },
      agendas: {
        percentual: 96,
        previstas: 134,
        capacidade: 140,
        alertaCategorias: []
      },
      backlogRecebimento: {
        senhasAtraso: 156,
        diffDiaAnterior: 9,
        topFornecedores: [
          { nome: "Fornecedor F", senhasAtrasadas: 29 },
          { nome: "Fornecedor G", senhasAtrasadas: 18 }
        ]
      },
      backlogFaturamento: {
        percentual: 73,
        capacidade: 1500,
        backlogPrevisto14h: 1095
      }
    }
  ]
};

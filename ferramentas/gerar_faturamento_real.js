// Converte "Faturamento real.csv" em faturamentoReal.js (módulo importado pelo App.jsx).
// Uso: node gerar_faturamento_real.js "Faturamento real.csv" faturamentoReal.js
const fs = require("fs");

const [, , entrada = "Faturamento real.csv", saida = "faturamentoReal.js"] = process.argv;

const linhas = fs.readFileSync(entrada, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
linhas.shift(); // cabeçalho: Data,CD,Categoria,Tipo Faturamento,Soma de Valor,Soma de Capacidade

const rows = linhas.map((l) => {
  const [data, cd, categoria, tipo, valor, capacidade] = l.split(",");
  return [
    data.slice(0, 10),
    Number(cd),
    categoria,
    tipo,
    Number(valor) || 0,
    capacidade === undefined || capacidade.trim() === "" ? null : Number(capacidade),
  ];
});

const corpo = rows.map((r) => "  " + JSON.stringify(r)).join(",\n");

fs.writeFileSync(
  saida,
  `// Gerado a partir de "${entrada}" — NÃO editar à mão. Para atualizar, troque o CSV e rode:
//   node gerar_faturamento_real.js "Faturamento real.csv" faturamentoReal.js
// Colunas: [data, cd, categoria, tipoFaturamento, faturado, capacidade (null = sem capacidade cadastrada)]
const RAW = [
${corpo}
];

export const FATURAMENTO_REAL = RAW.map(([data, cd, categoria, tipoFaturamento, faturado, capacidade]) => ({
  dataFaturamentoReal: data,
  cd,
  categoria,
  tipoFaturamento,
  faturado,
  capacidade,
}));
`
);

console.log(`${rows.length} linhas gravadas em ${saida}`);

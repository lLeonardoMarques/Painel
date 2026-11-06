import React, { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
// Faturamento real (set-dez/2025) vindo do CSV — enquanto não existe endpoint na API.
// Para atualizar: troque o CSV e rode, na pasta do Painel:
//   node ferramentas/gerar_faturamento_real.js "ferramentas/Faturamento real.csv" src/components/pfa/faturamentoReal.js
import { FATURAMENTO_REAL } from "./faturamentoReal";

const USE_MOCK_DATA = false;
// Caminhos relativos: passam pelo proxy /api do Vite (backend gestao-ppcp)
const API_BASE = "/api/dashboard/pfa";
const ENDPOINTS = {
  recebimento: "/recebimento",
  importacao: "/importacao",
  faturamento: "/faturamento",
  transferencia: "/transferencia",
};

// Endpoint do modo "Este Ano" (dados reais do ano corrente, mesma base do mesmo host).
// Um único endpoint retorna registros de recebimento + expedição já combinados.
// ATENÇÃO: ainda não temos endpoints de importação/transferência para este modo,
// então essas duas abas ficam escondidas enquanto viewMode === 'esteAno'.
const ESTE_ANO_ENDPOINT = "/api/capacidades";

async function fetchFromApi(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Erro ao buscar ${path}: ${res.status}`);
  return res.json();
}

// Cores no padrão do Painel (paleta slate, destaque azul), nas versões escura e clara.
// "accent" é o destaque da interface; as demais cores são das séries dos gráficos.
const TEMAS = {
  dark: {
    bg: "#070b14",
    panel: "#0f172a",
    panelAlt: "#0b1220",
    border: "#1e293b",
    borderLight: "#334155",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    textTertiary: "#64748b",
    accent: "#3b82f6",
    accentText: "#ffffff",
    barra1: "#64748b",
    barra2: "#3b82f6",
    amber: "#f59e0b",
    amberDim: "#78350f",
    teal: "#14b8a6",
    tealDim: "#134e4a",
    blue: "#60a5fa",
    blueDim: "#1e3a8a",
    violet: "#a78bfa",
    green: "#22c55e",
    red: "#ef4444",
    black: "#000000",
    cursor: "rgba(255,255,255,0.04)",
  },
  light: {
    bg: "#f8fafc",
    panel: "#ffffff",
    panelAlt: "#f1f5f9",
    border: "#e2e8f0",
    borderLight: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textTertiary: "#94a3b8",
    accent: "#2563eb",
    accentText: "#ffffff",
    barra1: "#94a3b8",
    barra2: "#2563eb",
    amber: "#d97706",
    amberDim: "#fde68a",
    teal: "#0d9488",
    tealDim: "#ccfbf1",
    blue: "#3b82f6",
    blueDim: "#dbeafe",
    violet: "#7c3aed",
    green: "#16a34a",
    red: "#dc2626",
    black: "#000000",
    cursor: "rgba(15,23,42,0.05)",
  },
};

// Tema em uso: definido pelo PainelPFA a cada renderização (os componentes abaixo leem T ao renderizar).
let T = TEMAS.dark;

/* ============================================================================
   GERAÇÃO DE DADOS MOCK — mesmo formato dos endpoints reais, agora por dia
   ========================================================================== */
const ANO = 2026;
const CDS = [930, 1942, 7801, 4521];
const CD_LABEL = { 930: "CD 930 · FLV", 1942: "CD 1942 · Perecíveis", 7801: "CD 7801 · Bazar", 4521: "CD 4521 · Seco" };
const CATEGORIAS = ["BAZAR", "FLV", "PERECIVEIS", "MERCEARIA", "BEBIDAS"];
const MESES = [
  { n: 9, nome: "Setembro" },
  { n: 10, nome: "Outubro" },
  { n: 11, nome: "Novembro" },
  { n: 12, nome: "Dezembro" },
];

// index 0 = segunda-feira ... index 5 = sábado (domingo é dia não operacional, fica de fora)
const DIAS_SEMANA = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];


// Retorna todos os dias operacionais (segunda a sábado) de um mês/ano, com data real
function diasOperacionaisDoMes(mes, ano = ANO) {
  const totalDias = new Date(ano, mes, 0).getDate();
  const dias = [];
  for (let d = 1; d <= totalDias; d++) {
    const dateObj = new Date(ano, mes - 1, d);
    const dow = dateObj.getDay(); // 0 = domingo ... 6 = sábado
    if (dow === 0) continue; // pula domingo
    dias.push({
      dateStr: `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      diaDoMes: d,
      mes,
      nomeDia: DIAS_SEMANA[dow - 1],
    });
  }
  return dias;
}

function diaLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function seeded(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

// Percentil linear (mesmo método usado no Excel/numpy "linear") — usado para os quartis
function quartil(valores, q) {
  if (!valores || !valores.length) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const resto = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + resto * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// Feriados nacionais (ajuste/complete aqui — inclua também os feriados municipais/estaduais
// relevantes para os CDs, se fizer sentido) que caem em dia de semana entre set-dez/2026.
// Datas em 'YYYY-MM-DD'. Se caírem no sábado/domingo elas já seriam excluídas de qualquer forma.
const FERIADOS = new Set([
  "2025-09-07", // Independência
  "2025-10-12", // Nossa Senhora Aparecida
  "2025-11-02", // Finados — confirmado: CD 1942 não opera
  "2025-11-20", //removido — Consciência Negra: CD 1942 opera normalmente nesse dia
  "2025-12-25", // Natal
]);

// Recebe uma data 'YYYY-MM-DD' e diz se é dia útil (não é sábado, não é domingo, não é feriado).
// Importante: construímos o Date com (ano, mês, dia) locais, NÃO com `new Date(dateStr)`,
// porque `new Date('2026-09-07')` é interpretado como UTC e em fusos negativos (Brasil, UTC-3)
// isso podia "voltar" pro dia anterior e bagunçar o dia da semana calculado.
function ehDiaUtil(dateStr) {
  if (!dateStr) return false;
  if (FERIADOS.has(dateStr)) return false;
  const [ano, mes, dia] = dateStr.split("-").map(Number);
  const dow = new Date(ano, mes - 1, dia).getDay(); // 0 = domingo ... 6 = sábado
  return dow !== 0 && dow !== 6;
}
// Corta qualquer registro anterior a setembro/2026 — a API manda o ano inteiro,
// mas o modo "Este Ano" só deve exibir dados a partir do mês 9.
const MES_MINIMO_ESTE_ANO = 9;
function filtrarApartirDeSetembro(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.filter((r) => {
    const dataStr = r.dataMovimentacao;
    if (!dataStr) return false;
    const [ano, mes] = dataStr.split("-").map(Number);
    return ano > ANO || (ano === ANO && mes >= MES_MINIMO_ESTE_ANO);
  });
}
// Conta quantos dias ÚTEIS (sem sáb/dom/feriado) existem entre as datas distintas de `rows`.
// Usamos datas distintas (não a quantidade de linhas) porque cada dia normalmente tem várias
// linhas (uma por categoria/CD/tipo de demanda) — contar linhas infla o divisor da média.
function contarDiasUteis(rows, dateField) {
  const datas = new Set(rows.map((r) => r[dateField]).filter(Boolean));
  let count = 0;
  datas.forEach((d) => {
    if (ehDiaUtil(d)) count++;
  });
  return count;
}

// Soma `campos` (ex: ['capacidade','agendados']) considerando SÓ as linhas cuja data é dia útil,
// e devolve também quantos dias distintos entraram na conta.
// IMPORTANTE: isso existe porque o "Total" do card soma TODOS os dias (inclusive sábado/feriado)
// de propósito — é o total geral, sem filtro. Mas a "Média" precisa que numerador e denominador
// usem o MESMO conjunto de dias (só dias úteis); dividir o total-com-sábado pela contagem
// sem-sábado infla a média.
function agregarDiaUtil(rows, dateField, campos) {
  const somas = {};
  campos.forEach((c) => (somas[c] = 0));
  const datas = new Set();
  rows.forEach((r) => {
    const d = r[dateField];
    if (!ehDiaUtil(d)) return;
    datas.add(d);
    campos.forEach((c) => {
      somas[c] += r[c] || 0;
    });
  });
  return { somas, dias: datas.size };
}

// Média diária por campo considerando SÓ os dias úteis em que aquele campo tem informação (> 0).
// Usado no modo "Este Ano": a API já manda o mês inteiro (dias futuros vêm zerados), então
// dividir pelo mês completo puxava a média pra baixo. Cada campo tem o seu próprio divisor —
// ex.: a capacidade pode existir pro mês todo, enquanto o realizado só vai até hoje.
function mediaDiasComDado(rows, dateField, campos) {
  const porDia = {};
  rows.forEach((r) => {
    const d = r[dateField];
    if (!ehDiaUtil(d)) return;
    porDia[d] = porDia[d] || {};
    campos.forEach((c) => {
      porDia[d][c] = (porDia[d][c] || 0) + (r[c] || 0);
    });
  });
  const medias = {};
  campos.forEach((c) => {
    const valores = Object.values(porDia).map((x) => x[c]).filter((v) => v > 0);
    medias[c] = valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : 0;
  });
  return medias;
}

function buildMockData() {
  const recebimento = [];
  const importacao = [];
  const faturamento = [];
  const transferencia = [];
  let id = 1;
  let idI = 1;
  let idF = 1;
  let idT = 1;
  const tiposDemanda = ["SEPARAÇÃO PICKING", "SEPARAÇÃO PLT FECHADO"];

  CDS.forEach((cd) => {
    CATEGORIAS.forEach((categoria) => {
      MESES.forEach(({ n: mes }) => {
        diasOperacionaisDoMes(mes).forEach(({ dateStr, nomeDia }) => {
          const rnd = seeded(`${cd}-${categoria}-${dateStr}`);

          const capacidade = Math.round(4 + rnd() * 10);
          const agendados = Math.round(capacidade * (0.6 + rnd() * 0.4));
          const recebidos = Math.round(agendados * (0.75 + rnd() * 0.3));
          const proposto = Math.round(capacidade * (0.9 + rnd() * 0.25));
          recebimento.push({
            id: id++,
            dataRecebimento: dateStr,
            categoria,
            cd,
            mes,
            nomeDia,
            capacidade,
            agendados,
            recebidos: Math.min(recebidos, capacidade + 3),
            proposto,
          });

          const qtdImportacao = Math.round(rnd() * 2);
          importacao.push({
            id: idI++,
            dataImportacao: dateStr,
            categoria,
            cd,
            mes,
            nomeDia,
            qtdImportacao,
            proposto: Math.round(qtdImportacao * (0.8 + rnd() * 0.5)),
          });

          tiposDemanda.forEach((tipoDemanda) => {
            const rnd2 = seeded(`${cd}-${categoria}-${dateStr}-${tipoDemanda}`);
            const fatCapacidade = Math.round(2000 + rnd2() * 6000);
            const fat = Math.round(2000 + rnd2() * 9000);
            faturamento.push({
              id: idF++,
              dataFaturamento: dateStr,
              categoria,
              cd,
              mes,
              nomeDia,
              faturamento: fat,
              capacidade: fatCapacidade,
              tipoDemanda,
              proposto: Math.round(fat * (0.9 + rnd2() * 0.3)),
              // mock local só pra manter o app funcional com USE_MOCK_DATA=true;
              // em produção esse campo já vem pronto da API
              acimaDaCapacidade: fat > fatCapacidade,
            });
          });
        });
      });
    });

    CDS.filter((d) => d !== cd).forEach((destino) => {
      MESES.forEach(({ n: mes }) => {
        diasOperacionaisDoMes(mes).forEach(({ dateStr, nomeDia }) => {
          const rnd = seeded(`${cd}-${destino}-${dateStr}`);
          if (rnd() > 0.55) return;
          transferencia.push({
            id: idT++,
            dataTransferencia: dateStr,
            nomeDia,
            cd,
            destino,
            mes,
            rota: Math.round(1000000 + rnd() * 200000),
            proposto: Math.round(1 + rnd() * 3),
          });
        });
      });
    });
  });
  return { recebimento, importacao, faturamento, transferencia };
}

function useDashboardData() {
  const [data, setData] = useState(() => (USE_MOCK_DATA ? buildMockData() : null));
  const [loading, setLoading] = useState(!USE_MOCK_DATA);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) return;
    setLoading(true);
    setError(null);
    try {
      const [recebimento, importacao, faturamento, transferencia] = await Promise.all([
        fetchFromApi(ENDPOINTS.recebimento),
        fetchFromApi(ENDPOINTS.importacao),
        fetchFromApi(ENDPOINTS.faturamento),
        fetchFromApi(ENDPOINTS.transferencia),
      ]);
      setData({ recebimento, importacao, faturamento, transferencia });
    } catch (e) {
      setError(e.message || "Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// Hook do modo "Este Ano" — busca o endpoint único de recebimento + expedição real.
function useEsteAnoData() {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ESTE_ANO_ENDPOINT);
      if (!res.ok) throw new Error(`Erro ao buscar ${ESTE_ANO_ENDPOINT}: ${res.status}`);
      const json = await res.json();
      const brutas = Array.isArray(json) ? json : [];
      setRows(filtrarApartirDeSetembro(brutas)); // <-- única linha nova
    } catch (e) {
      setError(e.message || "Falha ao carregar dados de Este Ano");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

/* ============================================================================
   COMPONENTES DE UI
   ========================================================================== */
function MetricCard({ label1, value1, label2, value2, sub, accent = T.teal }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        padding: "16px 18px",
        flex: "1 1 160px",
        minWidth: 150,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textSecondary, fontFamily: "var(--font-sans)", fontWeight: 500 }}>
        {label1}
      </div>
      <div style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontWeight: 600, color: T.textPrimary, marginTop: 6 }}>
        {value1}
      </div>
      <div style={{ height: 1, background: T.border, margin: "12px 0" }} />
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textSecondary, fontFamily: "var(--font-sans)", fontWeight: 500 }}>
        {label2}
      </div>
      <div style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontWeight: 600, color: T.textPrimary, marginTop: 6 }}>
        {value2}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2, fontFamily: "var(--font-sans)" }}>{sub}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
      <label style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textTertiary, fontFamily: "var(--font-sans)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: T.panelAlt,
          border: `1px solid ${T.border}`,
          borderRadius: 3,
          color: T.textPrimary,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          padding: "8px 10px",
          outline: "none",
          cursor: "pointer",
        }}
        onFocus={(e) => (e.target.style.borderColor = T.accent)}
        onBlur={(e) => (e.target.style.borderColor = T.border)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: T.panelAlt }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Dropdown com checkboxes para escolher vários valores. Lista vazia = "todos".
function MultiSelect({ label, values, onChange, options, allLabel = "Todos" }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  // fecha ao clicar fora
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v) => {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  const resumo =
    values.length === 0
      ? allLabel
      : values.length === 1
      ? options.find((o) => o.value === values[0])?.label || values[0]
      : `${values.length} selecionados`;

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 170, position: "relative" }}>
      <label style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textTertiary, fontFamily: "var(--font-sans)" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: T.panelAlt,
          border: `1px solid ${open ? T.accent : T.border}`,
          borderRadius: 3,
          color: T.textPrimary,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          padding: "8px 10px",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>{resumo}</span>
        <span style={{ color: T.textTertiary }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: T.panelAlt,
            border: `1px solid ${T.borderLight}`,
            borderRadius: 3,
            zIndex: 20,
            padding: 4,
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          }}
        >
          <div
            onClick={() => onChange([])}
            style={{ padding: "6px 8px", cursor: "pointer", fontSize: 12, color: values.length === 0 ? T.accent : T.textSecondary, fontFamily: "var(--font-sans)" }}
          >
            {allLabel}
          </div>
          {options.map((o) => (
            <label
              key={o.value}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer", fontSize: 13, color: T.textPrimary, fontFamily: "var(--font-mono)" }}
            >
              <input type="checkbox" checked={values.includes(o.value)} onChange={() => toggle(o.value)} style={{ accentColor: T.accent }} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// height: se vier um número (px), o painel usa altura fixa (bom pra gráficos que precisam de
// espaço extra, como o "Encaixe entre CDs"). Se vier null/undefined, o painel cresce (flex:1)
// pra preencher toda a altura disponível na tela — é o padrão agora, pra não sobrar tela vazia
// nem precisar rolar a página pra ver o gráfico inteiro.
function ChartPanel({ title, children, height = null, headerRight }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        padding: "18px 18px 8px",
        flex: height ? "1 1 420px" : "1 1 420px",
        minWidth: 320,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", color: T.textSecondary, fontWeight: 500 }}>
          {title}
        </div >
        {headerRight}
      </div>
      <div style={{ width: "100%", flex: 1, minHeight: height || 260 }}>{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: T.panelAlt, border: `1px solid ${T.borderLight}`, borderRadius: 3, padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 12 }}>
      <div style={{ color: T.textSecondary, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.textPrimary }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
        </div>
      ))}
    </div>
  );
}

// Legendinha manual pra explicar o significado das cores da barra de Faturado
// (dentro da capacidade vs. acima da capacidade). Usada como headerRight do painel.
function LegendaCapacidade() {
  const item = (cor, texto) => (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textSecondary, fontFamily: "var(--font-sans)" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: cor, display: "inline-block" }} />
      {texto}
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      {item(T.barra2, "Dentro da capacidade")}
      {item(T.red, "Acima da capacidade")}
    </div>
  );
}

const origemCores = () => [T.blue, T.barra1, T.amber, T.teal, T.violet, T.green];

// Tick de dois níveis para o gráfico "Encaixe entre CDs": linha de cima = Max/Média,
// linha de baixo = nome do dia da semana (só desenhada sob a barra "Max" de cada par,
// pra não repetir o nome do dia embaixo das duas barras).
function EncaixeTick({ x, y, payload }) {
  const [dia, tipo] = String(payload.value).split("__");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={14} textAnchor="middle" fill={T.textSecondary} fontSize={10} fontFamily="var(--font-mono)">
        {tipo}
      </text>
      {tipo === "Max" && (
        <text x={38} y={30} textAnchor="middle" fill={T.textTertiary} fontSize={11} fontFamily="var(--font-sans)" style={{ textTransform: "capitalize" }}>
          {dia}
        </text>
      )}
    </g>
  );
}

// Caixinha com o valor do quartil, desenhada à direita da linha de referência (estilo Excel)
function QuartilLabel({ viewBox, value, cor }) {
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  const w = 100;
  const h = 22;
  const left = x + width + 6;
  return (
    <g>
      <rect x={left} y={y - h / 2} width={w} height={h} fill={cor} rx={2} />
      <text
        x={left + w / 2}
        y={y}
        dy="0.35em"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={11}
        fontWeight={600}
        fontFamily="var(--font-sans)"
      >
        {value}
      </text>
    </g>
  );
}

const axisStyle = () => ({ fontSize: 11, fontFamily: "var(--font-mono)", fill: T.textTertiary });
const MES_NOMES = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril", 5: "Maio", 6: "Junho",
  7: "Julho", 8: "Agosto", 9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

// Eixo X "por dia" pode ter muitos pontos (até ~26 dias úteis por mês, ou ~104 com "todos os meses").
// Em vez de deixar o Recharts decidir sozinho quais rótulos ocultar (o que dava a impressão de
// "pular dia" de forma aleatória), calculamos um passo fixo: com poucos dias, mostra todos;
// com muitos, mostra 1 a cada N de forma regular e previsível.
function dayAxisProps(len) {
  const interval = len <= 31 ? 0 : Math.max(1, Math.ceil(len / 22) - 1);
  return {
    dataKey: "dia",
    tick: axisStyle(),
    axisLine: { stroke: T.border },
    tickLine: false,
    angle: -40,
    textAnchor: "end",
    height: 46,
    interval,
  };
}

/* ============================================================================
   APP
   ========================================================================== */
export const NOMES_MODO = { planejamento: "Planejamento Fim de Ano", esteAno: "Este Ano", semEdicao: "Faturamento sem Edição" };
const NOMES_ABA = { recebimento: "Recebimento", importacao: "Importação", faturamento: "Expedição", faturamentoReal: "Expedição", transferencia: "Transferência" };

/**
 * Painel PFA (planejamento de final de ano). Segue o tema claro/escuro do Painel.
 * O modo (Planejamento Fim de Ano, Este Ano, Faturamento sem Edição) e o processo
 * (Recebimento, Importação, Expedição, Transferência) são escolhidos no menu PFA do Painel.
 */
export default function PainelPFA({ theme = "dark", modo = "planejamento", aba = "recebimento" }) {
  T = TEMAS[theme === "light" ? "light" : "dark"];
  const viewMode = modo; // 'planejamento' | 'esteAno' | 'semEdicao'

  const { data, loading, error, reload } = useDashboardData();
  const { rows: esteAnoRows, loading: esteAnoLoading, error: esteAnoError, reload: esteAnoReload } = useEsteAnoData();

  const tab = aba;

  const [cd, setCd] = useState("all");
  const [categoria, setCategoria] = useState("all");
  const [mes, setMes] = useState("all");
  const [mesesTransferencia, setMesesTransferencia] = useState([]); // filtro multi-mês da aba Transferência ([] = todos)
  const [tipoDemanda, setTipoDemanda] = useState("all"); // filtro exclusivo da aba Faturamento (modo Planejamento)
  const [tipoFatReal, setTipoFatReal] = useState("all"); // filtro exclusivo da aba Faturamento Real: 'all' | 'Fracionado' | 'Fechado'


  // Junta as 4 listas (recebimento, importação, faturamento, transferência) pra descobrir
  // quais CDs, categorias e meses realmente existem no JSON retornado pelo backend.
  const todasLinhas = useMemo(
    () => [
      ...(data?.recebimento || []),
      ...(data?.importacao || []),
      ...(data?.faturamento || []),
      ...(data?.transferencia || []),
    ],
    [data]
  );

  // Linhas usadas para popular os filtros (CD/Categoria/Mês) dependem do modo ativo.
  // A aba Faturamento Real tem CDs/categorias próprios (vêm do CSV), então usa as linhas dela.
  const linhasParaFiltros =
    tab === "faturamentoReal" ? FATURAMENTO_REAL : viewMode === "esteAno" ? esteAnoRows || [] : todasLinhas;
  const cdFieldAtual = "cd";
  const categoriaLinhasAtual = tab === "faturamentoReal" ? FATURAMENTO_REAL : viewMode === "esteAno" ? esteAnoRows || [] : [
    ...(data?.recebimento || []),
    ...(data?.importacao || []),
    ...(data?.faturamento || []),
  ];

  const cdOptions = useMemo(() => {
    const unicos = Array.from(new Set(linhasParaFiltros.map((r) => r.cd))).filter((v) => v !== undefined && v !== null);
    const base = unicos.length ? unicos : CDS; // fallback pro mock enquanto não há dados
    return [
      { value: "all", label: "Todos os CDs" },
      ...base.sort((a, b) => a - b).map((c) => ({ value: String(c), label: String(c) })),
    ];
  }, [linhasParaFiltros]);

  const categoriaOptions = useMemo(() => {
    const linhasComCategoria = categoriaLinhasAtual.filter((r) => cd === "all" || String(r.cd) === cd);
    const unicas = Array.from(new Set(linhasComCategoria.map((r) => r.categoria))).filter(Boolean);
    const base = unicas.length ? unicas : CATEGORIAS; // fallback pro mock
    return [{ value: "all", label: "Todas categorias" }, ...base.sort().map((c) => ({ value: c, label: c }))];
  }, [categoriaLinhasAtual, cd]);
  React.useEffect(() => {
    if (categoria !== "all" && !categoriaOptions.some((o) => o.value === categoria)) {
      setCategoria("all");
    }
  }, [categoriaOptions, categoria]);

  // Opções do filtro "Tipo de demanda" vêm direto do JSON de faturamento (campo tipoDemanda) —
  // só existe no modo Planejamento; o endpoint de Este Ano não tem esse campo.
  const tipoDemandaOptions = useMemo(() => {
    const unicos = Array.from(new Set((data?.faturamento || []).map((r) => r.tipoDemanda))).filter(Boolean);
    return [{ value: "all", label: "Todos os tipos" }, ...unicos.sort().map((t) => ({ value: t, label: t }))];
  }, [data]);

  const mesOptions = useMemo(() => {
    const dateFieldPorLinha = (r) => r.dataMovimentacao || r.dataRecebimento || r.dataImportacao || r.dataFaturamento || r.dataTransferencia || r.dataFaturamentoReal;
    const unicos = Array.from(
      new Set(
        linhasParaFiltros.map((r) => r.mes ?? Number((dateFieldPorLinha(r) || "").split("-")[1]))
      )
    ).filter((v) => v !== undefined && v !== null && !Number.isNaN(v));
    const base = unicos.length ? unicos : MESES.map((m) => m.n); // fallback pro mock
    return [
      { value: "all", label: "Todos os meses" },
      ...base.sort((a, b) => a - b).map((m) => ({ value: String(m), label: MES_NOMES[m] || `Mês ${m}` })),
    ];
  }, [linhasParaFiltros]);

  const [filtrosPreSelecionados, setFiltrosPreSelecionados] = useState(false);
  React.useEffect(() => {
    if (!filtrosPreSelecionados && cdOptions.length > 1 && mesOptions.length > 1) {
      const cdPadrao = cdOptions.find((o) => o.value === "1965") || cdOptions[1];
      const mesPadrao = mesOptions.find((o) => o.value === "9") || mesOptions[1];
      setCd(cdPadrao.value);
      setMes(mesPadrao.value);
      setMesesTransferencia([mesPadrao.value]);
      setFiltrosPreSelecionados(true);
    }
  }, [cdOptions, mesOptions, filtrosPreSelecionados]);

  // `meses`: quando vier um array (aba Transferência), usa o filtro multi-mês no lugar do `mes` simples.
  const applyFilters = useCallback(
    (rows, { hasCategoria = true, hasTipoDemanda = false, dateField, cdField = "cd", meses = null }) => {
      if (!rows) return [];
      return rows.filter((r) => {
        if (cd !== "all" && String(r[cdField]) !== cd) return false;
        if (hasCategoria && categoria !== "all" && r.categoria !== categoria) return false;
        if (hasTipoDemanda && tipoDemanda !== "all" && r.tipoDemanda !== tipoDemanda) return false;
        const rowMes = String(r.mes ?? Number((r[dateField] || "").split("-")[1]));
        if (meses) {
          // filtro multi-mês: lista vazia = todos os meses
          if (meses.length && !meses.includes(rowMes)) return false;
        } else if (mes !== "all" && rowMes !== mes) {
          return false;
        }
        return true;
      });
    },
    [cd, categoria, mes, tipoDemanda]
  );

  const recebimentoData = useMemo(() => applyFilters(data?.recebimento, { dateField: "dataRecebimento" }), [data, applyFilters]);
  const importacaoData = useMemo(() => applyFilters(data?.importacao, { dateField: "dataImportacao" }), [data, applyFilters]);
  const faturamentoData = useMemo(
    () => applyFilters(data?.faturamento, { dateField: "dataFaturamento", hasTipoDemanda: true }),
    [data, applyFilters]
  );
  const transferenciaData = useMemo(
    () => applyFilters(data?.transferencia, { hasCategoria: false, dateField: "dataTransferencia", meses: mesesTransferencia }),
    [data, applyFilters, mesesTransferencia]
  );

  // Faturamento Real (CSV): filtros comuns (CD/Categoria/Mês) + tipo de faturamento.
  const faturamentoRealData = useMemo(
    () =>
      applyFilters(FATURAMENTO_REAL, { dateField: "dataFaturamentoReal" }).filter(
        (r) => tipoFatReal === "all" || r.tipoFaturamento === tipoFatReal
      ),
    [applyFilters, tipoFatReal]
  );

  // Dados filtrados do modo "Este Ano" (um único endpoint, com recebimento + expedição juntos)
  const esteAnoData = useMemo(
    () => applyFilters(esteAnoRows, { dateField: "dataMovimentacao" }),
    [esteAnoRows, applyFilters]
  );


  function agregarPorDia(rows, dateField, seed, acumular) {
    const map = {};
    rows.forEach((r) => {
      const key = r[dateField];
      if (!map[key]) map[key] = { dia: diaLabel(key), _sort: key, ...seed };
      acumular(map[key], r);
    });
    return Object.values(map).sort((a, b) => a._sort.localeCompare(b._sort));
  }

  const recebimentoPorDia = useMemo(
    () =>
      agregarPorDia(
        recebimentoData,
        "dataRecebimento",
        { Capacidade: 0, Agendados: 0, Recebidos: 0 },
        (acc, r) => {
          acc.Capacidade += r.capacidade;
          acc.Agendados += r.agendados;
          acc.Recebidos += r.recebidos;
        }
      ),
    [recebimentoData]
  );

  const importacaoPorDia = useMemo(
    () =>
      agregarPorDia(
        importacaoData,
        "dataImportacao",
        { Importado: 0 },
        (acc, r) => {
          acc.Importado += r.qtdImportacao;
        }
      ),
    [importacaoData]
  );

  // acimaDaCapacidade: a API manda esse booleano por registro (linha). Como o gráfico
  // agrega por dia, um dia fica marcado como "acima da capacidade" se QUALQUER
  // registro daquele dia vier com acimaDaCapacidade = true.
  const faturamentoPorDia = useMemo(
    () =>
      agregarPorDia(
        faturamentoData,
        "dataFaturamento",
        { Faturado: 0, Capacidade: 0, acimaDaCapacidade: false },
        (acc, r) => {
          acc.Faturado += r.faturamento;
          acc.Capacidade += r.capacidade || 0;
          if (r.acimaDaCapacidade) acc.acimaDaCapacidade = true;
        }
      ),
    [faturamentoData]
  );

  // KPIs extras da aba Faturamento: maior faturamento diário do período filtrado,
  // e quantos dias (dentro do filtro atual) ficaram acima da capacidade.
  const kpisFaturamentoExtra = useMemo(() => {
    const maxFaturamento = faturamentoPorDia.reduce((m, r) => Math.max(m, r.Faturado), 0);
    const diasacimaDaCapacidade = faturamentoPorDia.filter((r) => r.acimaDaCapacidade).length;
    return { maxFaturamento, diasacimaDaCapacidade };
  }, [faturamentoPorDia]);

  const transferenciaPorDia = useMemo(
    () =>
      agregarPorDia(
        transferenciaData,
        "dataTransferencia",
        { Rotas: 0 },
        (acc, r) => {
          acc.Rotas += 1;
        }
      ),
    [transferenciaData]
  );

  const faturamentoPorTipo = useMemo(() => {
    const map = {};
    faturamentoData.forEach((r) => {
      map[r.tipoDemanda] = (map[r.tipoDemanda] || 0) + r.faturamento;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [faturamentoData]);

  const transferenciaPorDestino = useMemo(() => {
    const map = {};
    transferenciaData.forEach((r) => {
      const key = CD_LABEL[r.destino] || `CD ${r.destino}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, Rotas]) => ({ name, Rotas }));
  }, [transferenciaData]);

  // ---- "Encaixe entre CDs" — para um CD destino escolhido, eixo X = dia da semana
  // (dividido em Max / Média), barras empilhadas por CD origem, e duas linhas de referência
  // com o quartil Q3 do total diário de Max e do total diário de Média. ----
  const destinoOptions = useMemo(() => {
    const unicos = Array.from(new Set((data?.transferencia || []).map((r) => r.destino))).filter((v) => v != null);
    return unicos.sort((a, b) => a - b);
  }, [data]);

  const [destinoEncaixe, setDestinoEncaixe] = useState(null);
  React.useEffect(() => {
    if ((destinoEncaixe === null || !destinoOptions.includes(destinoEncaixe)) && destinoOptions.length) {
      setDestinoEncaixe(destinoOptions[0]);
    }
  }, [destinoOptions, destinoEncaixe]);

  const encaixeData = useMemo(() => {
    if (destinoEncaixe == null) return { rows: [], q3Max: 0, q3Media: 0, origens: [] };
    const rows = transferenciaData.filter((r) => r.destino === destinoEncaixe);
    const origens = Array.from(new Set(rows.map((r) => r.cd))).sort((a, b) => a - b);

    // origem -> diaSemana -> { data -> quantidade naquele dia }
    const porOrigemDia = {};
    rows.forEach((r) => {
      porOrigemDia[r.cd] = porOrigemDia[r.cd] || {};
      porOrigemDia[r.cd][r.nomeDia] = porOrigemDia[r.cd][r.nomeDia] || {};
      porOrigemDia[r.cd][r.nomeDia][r.dataTransferencia] = (porOrigemDia[r.cd][r.nomeDia][r.dataTransferencia] || 0) + 1;
    });

    const rowsPorTipo = { Max: {}, Media: {} };
    const chartRows = [];
    DIAS_SEMANA.forEach((dia) => {
      const maxRow = { grupo: `${dia}__Max`, dia, tipo: "Max" };
      const mediaRow = { grupo: `${dia}__Media`, dia, tipo: "Media" };
      let totalMax = 0;
      let totalMedia = 0;
      origens.forEach((origem) => {
        const porData = (porOrigemDia[origem] || {})[dia] || {};
        const valores = Object.values(porData);
        const max = valores.length ? Math.max(...valores) : 0;
        const media = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
        const mediaArred = Math.round(media * 10) / 10;
        maxRow[String(origem)] = max;
        mediaRow[String(origem)] = mediaArred;
        totalMax += max;
        totalMedia += mediaArred;
      });
      rowsPorTipo.Max[dia] = totalMax;
      rowsPorTipo.Media[dia] = totalMedia;
      chartRows.push(maxRow, mediaRow);
    });

    const q3Max = quartil(Object.values(rowsPorTipo.Max), 0.75);
    const q3Media = quartil(Object.values(rowsPorTipo.Media), 0.75);

    return { rows: chartRows, q3Max, q3Media, origens };
  }, [transferenciaData, destinoEncaixe]);

  const PIE_COLORS = [T.amber, T.teal, T.blue, T.violet, T.green];

  /* ---- Este Ano: agregações por dia (Recebimento e Expedição) ---- */
  const esteAnoRecebimentoPorDia = useMemo(
    () =>
      agregarPorDia(
        esteAnoData,
        "dataMovimentacao",
        { CapacidadeInbound: 0, RecebimentoRemunerado: 0, RealizadoInbound: 0 },
        (acc, r) => {
          acc.CapacidadeInbound += r.capacidadeInbound || 0;
          acc.RecebimentoRemunerado += r.recebimentoRemunerado || 0;
          acc.RealizadoInbound += r.realizadoInbound || 0;
        }
      ),
    [esteAnoData]
  );

  // Antecipação é específica do faturamento fracionado (picking), por isso entra
  // como linha aqui na Expedição, e não mais no gráfico de Recebimento.
  const esteAnoExpedicaoPorDia = useMemo(
    () =>
      agregarPorDia(
        esteAnoData,
        "dataMovimentacao",
        { Fracionado: 0, PltFechado: 0, Antecipacao: 0, RealizadoFracionado: 0, RealizadoFechado: 0 },
        (acc, r) => {
          acc.Fracionado += r.capacidadeOutboundFracionado || 0;
          acc.PltFechado += r.capacidadeOutboundFechado || 0;
          acc.Antecipacao += r.antecipacao || 0;
          acc.RealizadoFracionado += r.realizadoFracionado || 0;
          acc.RealizadoFechado += r.realizadoFechada || 0;
        }
      ),
    [esteAnoData]
  );

  /* ---- KPIs ---- */
  const kpisRecebimento = useMemo(() => {
    const capacidade = recebimentoData.reduce((s, r) => s + r.capacidade, 0);
    const agendados = recebimentoData.reduce((s, r) => s + r.agendados, 0);
    const recebidos = recebimentoData.reduce((s, r) => s + r.recebidos, 0);

    const { somas, dias } = agregarDiaUtil(recebimentoData, "dataRecebimento", [
      "capacidade",
      "agendados",
      "recebidos",
    ]);
    const mediaCapacidade = dias ? Math.round(somas.capacidade / dias) : 0;
    const mediaAgendados = dias ? Math.round(somas.agendados / dias) : 0;
    const mediaRecebidos = dias ? Math.round(somas.recebidos / dias) : 0;

    return { capacidade, recebidos, agendados, mediaCapacidade, mediaAgendados, mediaRecebidos };
  }, [recebimentoData]);

  const kpisImportacao = useMemo(() => {
    const total = importacaoData.reduce((s, r) => s + r.qtdImportacao, 0);

    const { somas, dias } = agregarDiaUtil(importacaoData, "dataImportacao", ["qtdImportacao"]);
    const mediaImportacao = dias ? Math.round(somas.qtdImportacao / dias) : 0;

    return { total, registros: importacaoData.length, mediaImportacao };
  }, [importacaoData]);

  // Faturamento agora em QUANTIDADE (não R$)
  const kpisFaturamento = useMemo(() => {
    const total = faturamentoData.reduce((s, r) => s + r.faturamento, 0);
    const capacidade = faturamentoData.reduce((s, r) => s + (r.capacidade || 0), 0);

    const { somas, dias } = agregarDiaUtil(faturamentoData, "dataFaturamento", [
      "faturamento",
      "capacidade",
    ]);
    const mediaFaturado = dias ? Math.round(somas.faturamento / dias) : 0;
    const mediaCapacidade = dias ? Math.round(somas.capacidade / dias) : 0;

    return { total, mediaFaturado, capacidade, mediaCapacidade };
  }, [faturamentoData]);

  const kpisTransferencia = useMemo(() => {
    const rotas = transferenciaData.length;
    const destinos = new Set(transferenciaData.map((r) => r.destino)).size;
    const origens = new Set(transferenciaData.map((r) => r.cd)).size;

    const rotasDiaUtil = transferenciaData.filter((r) => ehDiaUtil(r.dataTransferencia));
    const diasUteis = new Set(rotasDiaUtil.map((r) => r.dataTransferencia)).size;
    const mediaTransferencia = diasUteis ? Math.round(rotasDiaUtil.length / diasUteis) : 0;

    return { rotas, destinos, origens, mediaTransferencia };
  }, [transferenciaData]);

  // KPIs do modo Este Ano
  const kpisEsteAnoRecebimento = useMemo(() => {
    const { somas, dias } = agregarDiaUtil(esteAnoData, "dataMovimentacao", [
      "capacidadeInbound",
      "recebimentoRemunerado",
      "realizadoInbound",
    ]);
    const totalCapacidade = esteAnoData.reduce((s, r) => s + (r.capacidadeInbound || 0), 0);
    const totalRemunerado = esteAnoData.reduce((s, r) => s + (r.recebimentoRemunerado || 0), 0);
    const totalRealizado = esteAnoData.reduce((s, r) => s + (r.realizadoInbound || 0), 0);
    return {
      totalCapacidade,
      mediaCapacidade: dias ? Math.round(somas.capacidadeInbound / dias) : 0,
      totalRemunerado,
      mediaRemunerado: dias ? Math.round(somas.recebimentoRemunerado / dias) : 0,
      totalRealizado,
      mediaRealizado: dias ? Math.round(somas.realizadoInbound / dias) : 0,
    };
  }, [esteAnoData]);

  const [tipoDemandaEsteAno, setTipoDemandaEsteAno] = useState("all"); // 'all' | 'fracionado' | 'pltFechado'
  const tipoDemandaEsteAnoOptions = [
    { value: "all", label: "Todos os tipos" },
    { value: "fracionado", label: "Picking Fracionado" },
    { value: "pltFechado", label: "Plt Fechado" },
  ];

  // Gráfico da Expedição (Este Ano) no mesmo formato do modo Planejamento: uma barra de Realizado
  // e uma linha de Capacidade. Com "Todos os tipos", fracionado + plt fechado são somados.
  const esteAnoExpedicaoChart = useMemo(
    () =>
      esteAnoExpedicaoPorDia.map((d) => {
        const Realizado =
          (tipoDemandaEsteAno !== "pltFechado" ? d.RealizadoFracionado : 0) +
          (tipoDemandaEsteAno !== "fracionado" ? d.RealizadoFechado : 0);
        const Capacidade =
          (tipoDemandaEsteAno !== "pltFechado" ? d.Fracionado : 0) +
          (tipoDemandaEsteAno !== "fracionado" ? d.PltFechado : 0);
        return { dia: d.dia, _sort: d._sort, Realizado, Capacidade, acimaDaCapacidade: Realizado > Capacidade };
      }),
    [esteAnoExpedicaoPorDia, tipoDemandaEsteAno]
  );

  // Cards da Expedição (Este Ano) no mesmo formato do modo Planejamento, já respeitando o filtro
  // de tipo de demanda (somam fracionado + plt fechado em "Todos os tipos").
  // Total = todos os dias; Média = só dias úteis em que o campo tem informação (> 0).
  const kpisEsteAnoExpedicaoResumo = useMemo(() => {
    const totalRealizado = esteAnoExpedicaoChart.reduce((s, r) => s + r.Realizado, 0);
    const totalCapacidade = esteAnoExpedicaoChart.reduce((s, r) => s + r.Capacidade, 0);
    const medias = mediaDiasComDado(esteAnoExpedicaoChart, "_sort", ["Realizado", "Capacidade"]);
    const maxRealizado = esteAnoExpedicaoChart.reduce((m, r) => Math.max(m, r.Realizado), 0);
    const diasAcimaDaCapacidade = esteAnoExpedicaoChart.filter((r) => r.acimaDaCapacidade).length;
    return {
      totalRealizado,
      mediaRealizado: medias.Realizado,
      totalCapacidade,
      mediaCapacidade: medias.Capacidade,
      maxRealizado,
      diasAcimaDaCapacidade,
    };
  }, [esteAnoExpedicaoChart]);

  /* ---- Faturamento Real (CSV): mesmo formato da Expedição — barra Faturado + linha Capacidade ---- */
  const tipoFatRealOptions = [
    { value: "all", label: "Todos os tipos" },
    { value: "Fracionado", label: "Fracionado" },
    { value: "Fechado", label: "Fechado" },
  ];

  // Dia marcado como "acima da capacidade" só quando existe capacidade cadastrada (> 0) —
  // algumas linhas do CSV vêm sem capacidade (ex.: Laticínios no CD 930) e não podem virar alerta falso.
  const faturamentoRealPorDia = useMemo(
    () =>
      agregarPorDia(
        faturamentoRealData,
        "dataFaturamentoReal",
        { Faturado: 0, Capacidade: 0 },
        (acc, r) => {
          acc.Faturado += r.faturado || 0;
          acc.Capacidade += r.capacidade || 0;
        }
      ).map((d) => ({ ...d, acimaDaCapacidade: d.Capacidade > 0 && d.Faturado > d.Capacidade })),
    [faturamentoRealData]
  );

  // Total = todos os dias; Média = só dias úteis em que o campo tem informação (> 0).
  const kpisFaturamentoReal = useMemo(() => {
    const totalFaturado = faturamentoRealPorDia.reduce((s, r) => s + r.Faturado, 0);
    const totalCapacidade = faturamentoRealPorDia.reduce((s, r) => s + r.Capacidade, 0);
    const medias = mediaDiasComDado(faturamentoRealPorDia, "_sort", ["Faturado", "Capacidade"]);
    const maxFaturado = faturamentoRealPorDia.reduce((m, r) => Math.max(m, r.Faturado), 0);
    const diasAcimaDaCapacidade = faturamentoRealPorDia.filter((r) => r.acimaDaCapacidade).length;
    return {
      totalFaturado,
      mediaFaturado: medias.Faturado,
      totalCapacidade,
      mediaCapacidade: medias.Capacidade,
      maxFaturado,
      diasAcimaDaCapacidade,
    };
  }, [faturamentoRealPorDia]);

  const fmt = (n) => n.toLocaleString("pt-BR");

  const isEsteAno = viewMode === "esteAno";
  const isSemEdicao = viewMode === "semEdicao"; // dados vêm do CSV local: não há carregamento nem erro de API
  const activeLoading = isSemEdicao ? false : isEsteAno ? esteAnoLoading : loading;
  const activeError = isSemEdicao ? null : isEsteAno ? esteAnoError : error;
  const activeReload = isEsteAno ? esteAnoReload : reload;

  if (activeLoading) {
    return (
      <div style={{ background: T.bg, color: T.textSecondary, padding: 40, fontFamily: "var(--font-sans)", textAlign: "center" }}>
        Carregando dados...
      </div>
    );
  }
  if (activeError) {
    return (
      <div style={{ background: T.bg, color: T.red, padding: 40, fontFamily: "var(--font-sans)" }}>
        <p>Erro ao carregar dados: {activeError}</p>
        <button onClick={activeReload} style={{ marginTop: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.textPrimary, padding: "8px 14px", borderRadius: 3, cursor: "pointer" }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const temFiltroAtivo =
    cd !== "all" ||
    categoria !== "all" ||
    mes !== "all" ||
    tipoDemanda !== "all" ||
    tipoDemandaEsteAno !== "all" ||
    tipoFatReal !== "all" ||
    mesesTransferencia.length > 0;
  const semMesSelecionado = tab === "transferencia" ? mesesTransferencia.length === 0 : mes === "all";

  return (
    <div style={{ background: T.bg, height: "100%", minHeight: 640, width:"100%", fontFamily: "var(--font-sans)", display: "flex", overflow: "hidden", boxSizing: "border-box" }}>


      {/* CONTEÚDO PRINCIPAL — coluna de altura total: filtros ficam com altura natural (flexShrink: 0)
          e o wrapper logo abaixo (flex: 1) ocupa todo o espaço restante da tela, empurrando o
          gráfico a esticar até a borda inferior em vez de sobrar área vazia ou precisar rolar. */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", padding: "22px 28px 20px", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" }}>
        {/* TÍTULO */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: T.textPrimary,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Planejamento de final de ano
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textSecondary }}>
            PFA · {NOMES_MODO[viewMode]} · {NOMES_ABA[tab]}
          </p>
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 4, padding: "14px 18px", marginBottom: 18, flexShrink: 0 }}>
          <Select label="Centro de distribuição" value={cd} onChange={setCd} options={cdOptions} />
          <Select
            label="Categoria"
            value={tab === "transferencia" ? "all" : categoria}
            onChange={setCategoria}
            options={categoriaOptions}
          />
          {!isEsteAno && tab === "faturamento" && (
            <Select label="Tipo de demanda" value={tipoDemanda} onChange={setTipoDemanda} options={tipoDemandaOptions} />
          )}
          {isEsteAno && tab === "faturamento" && (
            <Select label="Tipo de demanda" value={tipoDemandaEsteAno} onChange={setTipoDemandaEsteAno} options={tipoDemandaEsteAnoOptions} />
          )}
          {isSemEdicao && tab === "faturamentoReal" && (
            <Select label="Tipo de faturamento" value={tipoFatReal} onChange={setTipoFatReal} options={tipoFatRealOptions} />
          )}
          {tab === "transferencia" ? (
            <MultiSelect
              label="Meses"
              values={mesesTransferencia}
              onChange={setMesesTransferencia}
              options={mesOptions.filter((o) => o.value !== "all")}
              allLabel="Todos os meses"
            />
          ) : (
            <Select label="Mês" value={mes} onChange={setMes} options={mesOptions} />
          )}
          {temFiltroAtivo && (
            <button
              onClick={() => {
                setCd("all");
                setCategoria("all");
                setMes("all");
                setMesesTransferencia([]);
                setTipoDemanda("all");
                setTipoDemandaEsteAno("all");
                setTipoFatReal("all");
              }}
              style={{
                alignSelf: "flex-end",
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.textSecondary,
                borderRadius: 3,
                padding: "8px 12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Limpar filtros
            </button>
          )}
          {semMesSelecionado && (
            <div style={{ alignSelf: "flex-end", fontSize: 11, color: T.textTertiary, fontFamily: "var(--font-sans)", paddingBottom: 8 }}>
              Dica: selecione um mês para ver os dias com mais detalhe.
            </div>
          )}
        </div>

        {/* ===================== RECEBIMENTO — MODO ESTE ANO ===================== */}
        {isEsteAno && tab === "recebimento" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Capacidade Média" value1={fmt(kpisEsteAnoRecebimento.mediaCapacidade)} label2="Capacidade Total" value2={fmt(kpisEsteAnoRecebimento.totalCapacidade)} accent={T.teal} />
              <MetricCard label1="Recebimento Remunerado Médio" value1={fmt(kpisEsteAnoRecebimento.mediaRemunerado)} label2="Recebimento Remunerado Total" value2={fmt(kpisEsteAnoRecebimento.totalRemunerado)} accent={T.amber} />
              <MetricCard label1="Realizado Médio" value1={fmt(kpisEsteAnoRecebimento.mediaRealizado)} label2="Realizado Total" value2={fmt(kpisEsteAnoRecebimento.totalRealizado)} accent={T.amber} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>
              <ChartPanel title="Capacidade vs. recebimento remunerado, por dia">
                <ResponsiveContainer>
                  <ComposedChart data={esteAnoRecebimentoPorDia} barGap={1}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis {...dayAxisProps(esteAnoRecebimentoPorDia.length)} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.cursor }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-sans)", color: T.textSecondary }} />
                    <Bar dataKey="CapacidadeInbound" name="Capacidade" stackId="capacidade" fill={T.barra1}>
                    <LabelList dataKey="CapacidadeInbound" position="center" fill={T.black} fontSize={11}
                      formatter={(v) => Number(v).toLocaleString("pt-BR")} angle={-90}/>
                    </Bar>
                    <Bar dataKey="RecebimentoRemunerado" name="Recebimento Remunerado" stackId="capacidade" fill={T.barra2} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="RecebimentoRemunerado" position="center" fill={T.black} fontSize={11}
                      formatter={(v) => Number(v).toLocaleString("pt-BR")}  angle={-90}/>
                    </Bar>
                    <Bar dataKey="RealizadoInbound" name="Realizado" fill={T.amber} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="RealizadoInbound" position="center" fill={T.black} fontSize={11}
                      formatter={(v) => Number(v).toLocaleString("pt-BR")} angle={-90}/>
                  </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}

        {/* ===================== EXPEDIÇÃO — MODO ESTE ANO ===================== */}
        {isEsteAno && tab === "faturamento" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Capacidade Média" value1={fmt(kpisEsteAnoExpedicaoResumo.mediaCapacidade)} label2="Capacidade Total" value2={fmt(kpisEsteAnoExpedicaoResumo.totalCapacidade)} accent={T.amber} />
              <MetricCard label1="Realizado Médio" value1={fmt(kpisEsteAnoExpedicaoResumo.mediaRealizado)} label2="Realizado Total" value2={fmt(kpisEsteAnoExpedicaoResumo.totalRealizado)} accent={T.teal} />
              <MetricCard
                label1="Realizado Máximo"
                value1={fmt(kpisEsteAnoExpedicaoResumo.maxRealizado)}
                label2="Dias acima da capacidade"
                value2={fmt(kpisEsteAnoExpedicaoResumo.diasAcimaDaCapacidade)}
                accent={T.red}
              />
          </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>
              <ChartPanel title="Expedição realizada vs. capacidade, por dia" headerRight={<LegendaCapacidade />}>
                <ResponsiveContainer>
                  <ComposedChart data={esteAnoExpedicaoChart}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis {...dayAxisProps(esteAnoExpedicaoChart.length)} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.cursor }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-sans)", color: T.textSecondary }} />
                    <Bar dataKey="Realizado" fill={T.barra2} radius={[3, 3, 0, 0]}>
                      <LabelList
                        dataKey="Realizado"
                        position="center"
                        fill={T.textPrimary}
                        fontSize={13}
                        angle={-90}
                        formatter={(v) => Number(v).toLocaleString("pt-BR")}
                      />
                      {esteAnoExpedicaoChart.map((entry, index) => (
                        <Cell key={`cell-exp-${index}`} fill={entry.acimaDaCapacidade ? T.red : T.barra2} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="Capacidade" stroke={T.amber} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}

        {/* ===================== RECEBIMENTO — MODO PLANEJAMENTO ===================== */}
        {!isEsteAno && tab === "recebimento" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Capacidade Média" value1={fmt(kpisRecebimento.mediaCapacidade)} label2="Capacidade total" value2={fmt(kpisRecebimento.capacidade)} accent={T.teal} />
              <MetricCard label1="Agendamento Médio" value1={fmt(kpisRecebimento.mediaAgendados)} label2="Agendados" value2={fmt(kpisRecebimento.agendados)} accent={T.amber} />
              <MetricCard label1="Recebimento Médio" value1={fmt(kpisRecebimento.mediaRecebidos)} label2="Recebidos" value2={fmt(kpisRecebimento.recebidos)} accent={T.blue} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>
              <ChartPanel title="Capacidade vs. agendado vs. recebido, por dia">
                <ResponsiveContainer>
                  <ComposedChart data={recebimentoPorDia} barGap={1}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis {...dayAxisProps(recebimentoPorDia.length)} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.cursor }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-sans)", color: T.textSecondary }} />
                    <Line type="monotone" dataKey="Capacidade" stroke={T.amber} strokeWidth={2} dot={false} />
                    <Bar dataKey="Agendados" fill={T.barra1} radius={[3, 3, 0, 0]}><LabelList dataKey="Agendados" position="top" fill={T.barra1} fontSize={13}/></Bar>
                    <Bar dataKey="Recebidos" fill={T.barra2} radius={[3, 3, 0, 0]}><LabelList dataKey="Recebidos" position="top" fill={T.barra2} fontSize={13}/></Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}

        {/* ===================== IMPORTAÇÃO ===================== */}
        {!isEsteAno && tab === "importacao" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Media Importado" value1={fmt(kpisImportacao.mediaImportacao)} label2="Total Importado" value2={fmt(kpisImportacao.total)} accent={T.teal} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>
              <ChartPanel title="Quantidade importada, por dia">
                <ResponsiveContainer>
                  <ComposedChart data={importacaoPorDia}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis {...dayAxisProps(importacaoPorDia.length)} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.cursor }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-sans)", color: T.textSecondary }} />
                    <Bar dataKey="Importado" fill={T.barra2} radius={[3, 3, 0, 0]}><LabelList dataKey="Importado" position="top" fill={T.textPrimary} fontSize={13}/></Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}

        {/* ===================== EXPEDIÇÃO / FATURAMENTO — MODO PLANEJAMENTO ===================== */}
        {!isEsteAno && tab === "faturamento" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Capacidade Média" value1={fmt(kpisFaturamento.mediaCapacidade)} label2="Capacidade Total" value2={fmt(kpisFaturamento.capacidade)} accent={T.amber} />
              <MetricCard label1="Faturamento Médio" value1={fmt(kpisFaturamento.mediaFaturado)} label2="Faturamento Total" value2={fmt(kpisFaturamento.total)} accent={T.teal} />
              <MetricCard
                label1="Faturamento Máximo"
                value1={fmt(kpisFaturamentoExtra.maxFaturamento)}
                label2="Dias acima da capacidade"
                value2={fmt(kpisFaturamentoExtra.diasacimaDaCapacidade)}
                accent={T.red}
              />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>
              <ChartPanel title="Faturamento, por dia (quantidade)" headerRight={<LegendaCapacidade />}>
                <ResponsiveContainer>
                  <ComposedChart data={faturamentoPorDia}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis {...dayAxisProps(faturamentoPorDia.length)} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.cursor }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-sans)", color: T.textSecondary }} />
                    <Bar dataKey="Faturado" radius={[3, 3, 0, 0]}>
                      <LabelList
                        dataKey="Faturado"
                        position="center"
                        fill={T.textPrimary}
                        fontSize={13}
                        angle={-90}
                        formatter={(value) => Number(value).toLocaleString("pt-BR")}
                      />
                      {faturamentoPorDia.map((entry, index) => (
                        <Cell key={`cell-fat-${index}`} fill={entry.acimaDaCapacidade ? T.red : T.barra2} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="Capacidade" stroke={T.amber} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}

        {/* ===================== FATURAMENTO SEM EDIÇÃO — EXPEDIÇÃO (CSV) ===================== */}
        {isSemEdicao && tab === "faturamentoReal" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Capacidade Média" value1={fmt(kpisFaturamentoReal.mediaCapacidade)} label2="Capacidade Total" value2={fmt(kpisFaturamentoReal.totalCapacidade)} accent={T.amber} />
              <MetricCard label1="Faturamento Médio" value1={fmt(kpisFaturamentoReal.mediaFaturado)} label2="Faturamento Total" value2={fmt(kpisFaturamentoReal.totalFaturado)} accent={T.teal} />
              <MetricCard
                label1="Faturamento Máximo"
                value1={fmt(kpisFaturamentoReal.maxFaturado)}
                label2="Dias acima da capacidade"
                value2={fmt(kpisFaturamentoReal.diasAcimaDaCapacidade)}
                accent={T.red}
              />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>
              <ChartPanel title="Expedição — faturamento sem edição, por dia (quantidade)" headerRight={<LegendaCapacidade />}>
                <ResponsiveContainer>
                  <ComposedChart data={faturamentoRealPorDia}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis {...dayAxisProps(faturamentoRealPorDia.length)} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: T.cursor }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-sans)", color: T.textSecondary }} />
                    <Bar dataKey="Faturado" radius={[3, 3, 0, 0]}>
                      <LabelList
                        dataKey="Faturado"
                        position="center"
                        fill={T.textPrimary}
                        fontSize={13}
                        angle={-90}
                        formatter={(value) => Number(value).toLocaleString("pt-BR")}
                      />
                      {faturamentoRealPorDia.map((entry, index) => (
                        <Cell key={`cell-fatreal-${index}`} fill={entry.acimaDaCapacidade ? T.red : T.barra2} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="Capacidade" stroke={T.amber} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}

        {/* ===================== TRANSFERÊNCIA ===================== */}
        {!isEsteAno && tab === "transferencia" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, flexShrink: 0 }}>
              <MetricCard label1="Média Transferencia" value1={fmt(kpisTransferencia.mediaTransferencia)} label2="Total Transferencia" value2={fmt(kpisTransferencia.rotas)} accent={T.teal} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1, minHeight: 0 }}>

              {/* Encaixe entre CDs — por destino, dia da semana (Max/Média) empilhado por origem */}
              <ChartPanel
                title={`Encaixe entre CDs — Destino ${destinoEncaixe != null ? (CD_LABEL[destinoEncaixe] || `CD ${destinoEncaixe}`) : ""}`}
                headerRight={
                  destinoOptions.length > 1 && (
                    <select
                      value={destinoEncaixe ?? ""}
                      onChange={(e) => setDestinoEncaixe(Number(e.target.value))}
                      style={{
                        background: T.panelAlt,
                        border: `1px solid ${T.border}`,
                        borderRadius: 3,
                        color: T.textPrimary,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        padding: "5px 8px",
                        cursor: "pointer",
                      }}
                    >
                      {destinoOptions.map((d) => (
                        <option key={d} value={d}>
                          {CD_LABEL[d] || `CD ${d}`}
                        </option>
                      ))}
                    </select>
                  )
                }
              >
                <ResponsiveContainer>
                  <BarChart data={encaixeData.rows} barGap={0} barCategoryGap="18%" margin={{ top: 8, right: 115, bottom: 60 }}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis dataKey="grupo" tick={<EncaixeTick />} axisLine={{ stroke: T.border }} tickLine={false} interval={0} />
                    <YAxis tick={axisStyle()} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: T.cursor }}
                      labelFormatter={(label) => String(label).split("__").reverse().join(" — ")}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-sans)", color: T.textSecondary, paddingTop: 15,}}
                      formatter={(value) => (value === "Mx" || value === "Media" ? value : CD_LABEL[value] || `CD ${value}`)}
                    />
                    {encaixeData.origens.map((origem, i) => (
                      <Bar
                        key={origem}
                        dataKey={String(origem)}
                        name={String(origem)}
                        stackId="stack"
                        fill={origemCores()[i % origemCores().length]}
                      >
                        <LabelList dataKey={String(origem)} position="inside" fill={T.textPrimary} fontSize={10} formatter={(v) => v != null ? Math.round(Number(v)) : ""} />
                      </Bar>
                    ))}
                    <ReferenceLine
                      y={encaixeData.q3Max}
                      stroke={T.red}
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={<QuartilLabel value={`${encaixeData.q3Max.toFixed(0)} (3ºQ Máx.)`} cor={T.red} />}
                    />
                    <ReferenceLine
                      y={encaixeData.q3Media}
                      stroke={T.violet}
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={<QuartilLabel value={`${encaixeData.q3Media.toFixed(0)} (3ºQ Méd.)`} cor={T.violet} />}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

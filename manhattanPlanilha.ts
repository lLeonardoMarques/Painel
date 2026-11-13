/**
 * Planilha de capacidade por horário (Manhattan Capacidades).
 *
 * Lê a planilha mais recente "capacidade_cd_categorias_*.xlsx" da pasta de Agendamento e entrega
 * os dados em JSON para a tela. Como quem serve o sistema é este computador, todos que acessam
 * pelo navegador (http://10.210.2.131:3000) veem a mesma informação, sem precisar de banco de dados.
 *
 * Para usar outra pasta, defina a variável de ambiente MANHATTAN_PLANILHA_DIR.
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export const PASTA_PLANILHA = process.env.MANHATTAN_PLANILHA_DIR || "C:\\Users\\5316790\\Desktop\\Agendamento";
const PADRAO_ARQUIVO = /^capacidade_cd_categorias.*\.xlsx$/i;

export interface LinhaPlanilha {
  cd: string;
  categoria: string;
  /** hora inicial da faixa (0 a 23) */
  hora: number;
  periodo: string;
  /** Domingo, Segunda, Terça, Quarta, Quinta, Sexta, Sábado */
  dias: number[];
}

export interface RespostaPlanilha {
  arquivo: string;
  pasta: string;
  atualizadoEm: string;
  linhas: LinhaPlanilha[];
  falhas: { cd: string; categoria: string; erro: string }[];
}

let cache: { chave: string; dados: RespostaPlanilha } | null = null;

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Arquivo mais recente da pasta (ignora arquivos temporários "~$" do Excel aberto). */
function arquivoMaisRecente(): { caminho: string; nome: string; mtime: number } | null {
  if (!fs.existsSync(PASTA_PLANILHA)) return null;
  const arquivos = fs
    .readdirSync(PASTA_PLANILHA)
    .filter((n) => PADRAO_ARQUIVO.test(n) && !n.startsWith("~$"))
    .map((nome) => {
      const caminho = path.join(PASTA_PLANILHA, nome);
      return { caminho, nome, mtime: fs.statSync(caminho).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return arquivos[0] || null;
}

export function lerPlanilhaManhattan(): RespostaPlanilha {
  const arq = arquivoMaisRecente();
  if (!arq) {
    throw new Error(`Nenhuma planilha "capacidade_cd_categorias*.xlsx" encontrada em ${PASTA_PLANILHA}`);
  }
  const chave = `${arq.caminho}|${arq.mtime}`;
  if (cache?.chave === chave) return cache.dados;

  const wb = XLSX.read(fs.readFileSync(arq.caminho), { type: "buffer" });

  // Aba "Consolidado": CD | Categoria | Periodo | Domingo..Sábado. Sem ela, junta as abas "CD_*".
  const abas = wb.SheetNames.includes("Consolidado")
    ? ["Consolidado"]
    : wb.SheetNames.filter((n) => /^CD_/i.test(n));

  const linhas: LinhaPlanilha[] = [];
  for (const nomeAba of abas) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, raw: false, defval: "" });
    rows.slice(1).forEach((r) => {
      const cd = String(r[0] ?? "").trim();
      const periodo = String(r[2] ?? "").trim();
      const hora = parseInt(periodo, 10);
      if (!cd || !periodo || Number.isNaN(hora)) return;
      linhas.push({
        cd,
        categoria: String(r[1] ?? "").trim(),
        hora,
        periodo,
        dias: [3, 4, 5, 6, 7, 8, 9].map((i) => num(r[i])),
      });
    });
  }

  // Aba "Falhas": CDs/categorias que não puderam ser coletados na última extração
  const falhas: RespostaPlanilha["falhas"] = [];
  if (wb.SheetNames.includes("Falhas")) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Falhas"], { header: 1, raw: false, defval: "" });
    rows.slice(1).forEach((r) => {
      if (String(r[0] ?? "").trim()) {
        falhas.push({ cd: String(r[0]).trim(), categoria: String(r[1] ?? "").trim(), erro: String(r[2] ?? "").split("\n")[0].slice(0, 200) });
      }
    });
  }

  const dados: RespostaPlanilha = {
    arquivo: arq.nome,
    pasta: PASTA_PLANILHA,
    atualizadoEm: new Date(arq.mtime).toISOString(),
    linhas,
    falhas,
  };
  cache = { chave, dados };
  return dados;
}

/** Middleware (Express ou Vite/connect) para GET /api/manhattan/planilha. */
export function rotaPlanilhaManhattan(_req: unknown, res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    res.end(JSON.stringify(lerPlanilhaManhattan()));
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ erro: e?.message || "Erro ao ler a planilha" }));
  }
}

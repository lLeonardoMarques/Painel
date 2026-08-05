import React, { useState, useEffect, useMemo } from "react";
import { 
  Building, Edit2, RefreshCw, Info, Package, Sparkles
} from "lucide-react";

interface CDSummaryTableProps {
  currentUser: { role: string; name: string };
  showNotification: (msg: string) => void;
}

const CD_LIST = [
  { cd: "1965", group: "SP" },
  { cd: "941", group: "SP" },
  { cd: "7801", group: "SP" },
  { cd: "930", group: "SP" },
  { cd: "1942", group: "SP" },
  { cd: "409", group: "REG" },
  { cd: "1953", group: "REG" },
  { cd: "1984", group: "REG" },
  { cd: "1974", group: "REG" },
  { cd: "1979", group: "REG" },
];

export default function CDSummaryTable({ currentUser, showNotification }: CDSummaryTableProps) {
  const [capacities, setCapacities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: "fracJul" | "fracAgo" | "fechJul" | "fechAgo";
    value: string;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/capacidades");
      if (response.ok) {
        const json = await response.json();
        console.log("✅ CDSummary: Dados carregados:", json.length, "registros");
        setCapacities(json);
      } else {
        console.error("Erro HTTP:", response.status);
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatVal = (val: number) => val.toLocaleString("pt-BR");

  const startEditing = (rowId: string, field: "fracJul" | "fracAgo" | "fechJul" | "fechAgo", currentVal: number) => {
    if (currentUser.role !== "admin") {
      showNotification("Apenas Administradores podem editar.");
      return;
    }
    setEditingCell({ rowId, field, value: String(currentVal) });
  };

  const saveCell = async () => {
    if (!editingCell) return;
    const { rowId, field, value } = editingCell;
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    if (isNaN(parsed) || parsed < 0) return;

    const targetRow = computedRows.find(r => r.id === rowId);
    if (!targetRow) return;

    const isJul = field === "fracJul" || field === "fechJul";
    const mes = isJul ? 7 : 8;
    const cd = Number(targetRow.cd);

    setEditingCell(null);
    setIsLoading(true);

    try {
      const allMonth = capacities.filter(
        r => r.cd === cd && r.dataMovimentacao && r.dataMovimentacao.startsWith(`2026-${String(mes).padStart(2, "0")}`)
      );
      
      for (const item of allMonth) {
        await fetch(`/api/capacidades/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            capacidadeOutboundFracionado: field.includes("Frac") ? parsed : item.capacidadeOutboundFracionado,
            capacidadeOutboundFechado: field.includes("Fech") ? parsed : item.capacidadeOutboundFechado,
          }),
        });
      }
      
      showNotification(`✅ CD ${cd} atualizado!`);
      await fetchData();
    } catch (err) {
      showNotification("❌ Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const computedRows = useMemo(() => {
    return CD_LIST.map((cdItem) => {
      const cdNum = Number(cdItem.cd);
      const julRecords = capacities.filter(r => r.cd === cdNum && r.dataMovimentacao?.startsWith("2026-07"));
      const agoRecords = capacities.filter(r => r.cd === cdNum && r.dataMovimentacao?.startsWith("2026-08"));

      const fracJul = julRecords.length > 0 ? Math.max(...julRecords.map(r => r.capacidadeOutboundFracionado || 0)) : 0;
      const fracAgo = agoRecords.length > 0 ? Math.max(...agoRecords.map(r => r.capacidadeOutboundFracionado || 0)) : 0;
      const fechJul = julRecords.length > 0 ? Math.max(...julRecords.map(r => r.capacidadeOutboundFechado || 0)) : 0;
      const fechAgo = agoRecords.length > 0 ? Math.max(...agoRecords.map(r => r.capacidadeOutboundFechado || 0)) : 0;
      const categoria = julRecords[0]?.categoria || agoRecords[0]?.categoria || "-";

      return { id: cdItem.cd, cd: cdItem.cd, group: cdItem.group, fracJul, fracAgo, fechJul, fechAgo, categoria };
    });
  }, [capacities]);

  const spRows = computedRows.filter(r => r.group === "SP");
  const regRows = computedRows.filter(r => r.group === "REG");

  const RenderTable = ({ title, color, fieldFrac, fieldFech, rows, spTotal, regTotal, grandTotal }: any) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Package className={`w-5 h-5 text-${color}-600`} />
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      </div>
      <div className="overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <th className="p-3 pl-6">CD</th>
              <th className="p-3 text-center">Categoria</th>
              <th className="p-3 text-right">JUL-26</th>
              <th className="p-3 text-right">AGO-26</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            <tr className="bg-slate-50/70"><td colSpan={5} className="p-2 pl-6 font-bold text-[10px] uppercase">São Paulo (SP)</td></tr>
            {spRows.map((row: any) => (
              <tr key={row.id} className="hover:bg-slate-50/40 group">
                <td className="p-3 pl-6 font-semibold">CD {row.cd}</td>
                <td className="p-3 text-center text-[11px]">{row.categoria}</td>
                <td onClick={() => startEditing(row.id, "fracJul", row.fracJul)} className="p-3 text-right font-mono cursor-pointer hover:bg-indigo-50">
                  {formatVal(row.fracJul)}
                </td>
                <td onClick={() => startEditing(row.id, "fracAgo", row.fracAgo)} className="p-3 text-right font-mono cursor-pointer hover:bg-indigo-50">
                  {formatVal(row.fracAgo)}
                </td>
                <td className="p-3 text-right font-bold">{formatVal(row.fracJul + row.fracAgo)}</td>
              </tr>
            ))}
            <tr className="bg-indigo-50/20 font-bold"><td className="p-3 pl-6">SUBTOTAL SP</td><td className="p-3 text-center">--</td><td className="p-3 text-right">{formatVal(spTotal.jul)}</td><td className="p-3 text-right">{formatVal(spTotal.ago)}</td><td className="p-3 text-right">{formatVal(spTotal.jul + spTotal.ago)}</td></tr>
            <tr className="bg-slate-50/70"><td colSpan={5} className="p-2 pl-6 font-bold text-[10px] uppercase">Regional (REG)</td></tr>
            {regRows.map((row: any) => (
              <tr key={row.id} className="hover:bg-slate-50/40 group">
                <td className="p-3 pl-6 font-semibold">CD {row.cd}</td>
                <td className="p-3 text-center text-[11px]">{row.categoria}</td>
                <td onClick={() => startEditing(row.id, "fracJul", row.fracJul)} className="p-3 text-right font-mono cursor-pointer hover:bg-indigo-50">
                  {formatVal(row.fracJul)}
                </td>
                <td onClick={() => startEditing(row.id, "fracAgo", row.fracAgo)} className="p-3 text-right font-mono cursor-pointer hover:bg-indigo-50">
                  {formatVal(row.fracAgo)}
                </td>
                <td className="p-3 text-right font-bold">{formatVal(row.fracJul + row.fracAgo)}</td>
              </tr>
            ))}
            <tr className="bg-indigo-50/20 font-bold"><td className="p-3 pl-6">SUBTOTAL REG</td><td className="p-3 text-center">--</td><td className="p-3 text-right">{formatVal(regTotal.jul)}</td><td className="p-3 text-right">{formatVal(regTotal.ago)}</td><td className="p-3 text-right">{formatVal(regTotal.jul + regTotal.ago)}</td></tr>
            <tr className="bg-slate-900 text-white font-extrabold text-xs"><td className="p-4 pl-6 uppercase">TOTAL GERAL</td><td className="p-4 text-center">TOTAL</td><td className="p-4 text-right">{formatVal(grandTotal.jul)}</td><td className="p-4 text-right">{formatVal(grandTotal.ago)}</td><td className="p-4 text-right text-emerald-400">{formatVal(grandTotal.jul + grandTotal.ago)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const subtotalSPFrac = { jul: spRows.reduce((a, c) => a + c.fracJul, 0), ago: spRows.reduce((a, c) => a + c.fracAgo, 0) };
  const subtotalREGFrac = { jul: regRows.reduce((a, c) => a + c.fracJul, 0), ago: regRows.reduce((a, c) => a + c.fracAgo, 0) };
  const grandTotalFrac = { jul: subtotalSPFrac.jul + subtotalREGFrac.jul, ago: subtotalSPFrac.ago + subtotalREGFrac.ago };
  const subtotalSPFech = { jul: spRows.reduce((a, c) => a + c.fechJul, 0), ago: spRows.reduce((a, c) => a + c.fechAgo, 0) };
  const subtotalREGFech = { jul: regRows.reduce((a, c) => a + c.fechJul, 0), ago: regRows.reduce((a, c) => a + c.fechAgo, 0) };
  const grandTotalFech = { jul: subtotalSPFech.jul + subtotalREGFech.jul, ago: subtotalSPFech.ago + subtotalREGFech.ago };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-50 text-violet-600 border border-violet-100 rounded-2xl"><Building className="w-6 h-6" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Consolidado de CDs</h3>
            <p className="text-xs text-slate-500">Dados de <span className="font-mono text-violet-600">/api/capacidades</span></p>
          </div>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border rounded-xl text-xs font-semibold flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sincronizar
        </button>
      </div>

      {isLoading && capacities.length === 0 ? (
        <div className="flex items-center justify-center p-20 bg-white rounded-2xl border">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <RenderTable title="1. Capacidade Outbound - Fracionado" color="indigo" rows={spRows} spTotal={subtotalSPFrac} regTotal={subtotalREGFrac} grandTotal={grandTotalFrac} />
          <RenderTable title="2. Capacidade Outbound - Fechado" color="blue" rows={spRows} spTotal={subtotalSPFech} regTotal={subtotalREGFech} grandTotal={grandTotalFech} />
        </div>
      )}
    </div>
  );
}
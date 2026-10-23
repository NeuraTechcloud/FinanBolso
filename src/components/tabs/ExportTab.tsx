import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  Share2,
  Calendar
} from 'lucide-react';
import { Transaction, Category, SavingsGoal } from '../../types/finance';
import { ExportService, formatBRL } from '../../services/exportService';
import { StorageService } from '../../services/storage';
import { PWAInstallButton } from '../PWAInstallButton';

interface ExportTabProps {
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  selectedMonth: string;
  onRefreshData: () => void;
}

export const ExportTab: React.FC<ExportTabProps> = React.memo(({
  transactions,
  categories,
  savingsGoals,
  selectedMonth,
  onRefreshData,
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const activeMonthParam = exportScope === 'current' ? selectedMonth : 'all';

  // Export to Excel
  const handleExportExcel = () => {
    try {
      ExportService.exportToExcel(transactions, categories, {
        monthFilter: activeMonthParam,
      });
      showFeedback('success', 'Planilha Excel (.xlsx) gerada e baixada com sucesso!');
    } catch (e) {
      console.error(e);
      showFeedback('error', 'Falha ao gerar arquivo Excel.');
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      ExportService.exportToPDF(transactions, categories, {
        monthFilter: activeMonthParam,
        periodLabel: exportScope === 'current' && selectedMonth !== 'all' ? `Competência ${selectedMonth}` : 'Histórico Consolidado',
      });
      showFeedback('success', 'Relatório PDF gerado e baixado com sucesso!');
    } catch (e) {
      console.error(e);
      showFeedback('error', 'Falha ao gerar relatório PDF.');
    }
  };

  // Download JSON Backup
  const handleDownloadBackup = () => {
    try {
      const jsonStr = StorageService.exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinanBolso_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('success', 'Arquivo de backup JSON gerado com sucesso!');
    } catch (e) {
      console.error(e);
      showFeedback('error', 'Falha ao exportar backup.');
    }
  };

  // Trigger File Input for Restore
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Import JSON Backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = StorageService.importBackupJSON(content);
        if (ok) {
          onRefreshData();
          showFeedback('success', 'Backup restaurado com sucesso no celular!');
        } else {
          showFeedback('error', 'Arquivo de backup inválido.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };



  // Clear All Data
  const handleClearAll = () => {
    setConfirmAction({
      title: 'Zerar Todos os Dados',
      message: 'ATENÇÃO: Deseja apagar TODOS os lançamentos e começar com a base totalmente zerada?',
      confirmLabel: 'Sim, Apagar Tudo',
      isDestructive: true,
      onConfirm: () => {
        StorageService.clearAllData();
        StorageService.saveTransactions([]);
        onRefreshData();
        showFeedback('success', 'Base de dados zerada com sucesso.');
        setConfirmAction(null);
      },
    });
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in">
      {/* Feedback Alert Toast */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 shadow-lg ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border border-red-500/40'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Scope Selector: Selected month vs All history */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Período da Exportação
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {exportScope === 'current' ? `Mês: ${selectedMonth}` : 'Todos os meses'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setExportScope('current')}
            className={`py-2 rounded-xl font-semibold transition ${
              exportScope === 'current'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mês Ativo ({selectedMonth})
          </button>
          <button
            onClick={() => setExportScope('all')}
            className={`py-2 rounded-xl font-semibold transition ${
              exportScope === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todo o Histórico
          </button>
        </div>
      </div>

      {/* Primary Export Cards (Excel & PDF) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* EXCEL EXPORT */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Exportar para Excel (.xlsx)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gera planilha compatível com Microsoft Excel, Google Planilhas e LibreOffice com abas de lançamentos e resumos.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Baixar Planilha Excel</span>
          </button>
        </div>

        {/* PDF EXPORT */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-red-500/50 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between transition">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center">
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Exportar para PDF (.pdf)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Relatório executivo completo pronto para impressão ou compartilhamento via WhatsApp com KPIs e extrato.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            className="w-full py-3 px-4 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Baixar Relatório PDF</span>
          </button>
        </div>
      </div>



      {/* PWA Install Block */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Instalação no Aparelho
        </h4>
        <PWAInstallButton variant="settings" />
      </div>

      {/* Offline Storage Status & JSON Backup */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Armazenamento Offline do Celular</h4>
              <p className="text-[11px] text-slate-400">Totalmente privado, sem envio para servidores externos</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {transactions.length} registros
          </span>
        </div>

        {/* Hidden file input for restore */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Criar Backup JSON</span>
          </button>

          <button
            onClick={handleTriggerFileInput}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restaurar Backup</span>
          </button>
        </div>

        {/* Data Maintenance */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end text-xs">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Todos os Dados</span>
          </button>
        </div>
      </div>

      {/* Privacy & Offline Guarantee Box */}
      <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 space-y-2">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-300">Garantia de Privacidade & Offline Total</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Seus dados financeiros residem exclusivamente no armazenamento do seu aparelho. 
              Não há contas na nuvem, logins obrigatórios ou rastreadores. Você tem posse integral dos seus arquivos e relatórios.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Identificação do Aparelho:</span>
          <strong className="text-emerald-400">{StorageService.getDeviceId()}</strong>
        </div>
      </div>

      {/* In-app Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-white mb-2">{confirmAction.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{confirmAction.message}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAction.onConfirm}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-md transition active:scale-95 ${
                  confirmAction.isDestructive
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ExportTab.displayName = 'ExportTab';

import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Trash2, 
  Search, 
  Landmark, 
  Filter, 
  FileText, 
  Sparkles,
  ClipboardList,
  Check
} from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types/finance';
import { formatBRL } from '../services/exportService';
import { 
  parseBankStatementFile, 
  ParsedBankTransaction, 
  BankStatementParseResult 
} from '../services/bankStatementParser';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingTransactions: Transaction[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
}

const SUPPORTED_BANKS = [
  'Nubank', 'Banco Inter', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'C6 Bank', 'Banco do Brasil', 'BTG'
];

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingTransactions,
  onImportTransactions,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<BankStatementParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const result = parseBankStatementFile(text, file.name, categories, existingTransactions);

      if (!result.success || result.transactions.length === 0) {
        setErrorMessage(result.error || 'Nenhuma transação identificada no arquivo.');
        setParseResult(null);
      } else {
        setParseResult(result);
        setSuccessMessage(`✓ ${result.transactions.length} transações identificadas no extrato (${result.bankName})!`);
      }
    } catch (err: any) {
      setErrorMessage(`Erro ao ler arquivo: ${err.message || 'Arquivo inválido'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = parseBankStatementFile(pastedText, 'extrato_colado.csv', categories, existingTransactions);
      if (!result.success || result.transactions.length === 0) {
        setErrorMessage(result.error || 'Nenhum lançamento legível identificado no texto colado.');
        setParseResult(null);
      } else {
        setParseResult(result);
        setSuccessMessage(`✓ ${result.transactions.length} transações identificadas!`);
      }
    } catch (err: any) {
      setErrorMessage('Falha ao processar texto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map(t => ({
        ...t,
        selected: checked,
      })),
    });
  };

  const handleToggleSelectOne = (id: string) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map(t => 
        t.id === id ? { ...t, selected: !t.selected } : t
      ),
    });
  };

  const handleUpdateCategory = (id: string, newCategory: string) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map(t => 
        t.id === id ? { ...t, category: newCategory } : t
      ),
    });
  };

  const handleUpdateType = (id: string, newType: TransactionType) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map(t => 
        t.id === id ? { ...t, type: newType } : t
      ),
    });
  };

  const filteredTransactions = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.transactions.filter(t => {
      if (hideDuplicates && t.isDuplicate) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.date.includes(query) ||
          t.amount.toString().includes(query)
        );
      }
      return true;
    });
  }, [parseResult, hideDuplicates, searchQuery]);

  const selectedCount = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.transactions.filter(t => t.selected).length;
  }, [parseResult]);

  const handleConfirmImport = () => {
    if (!parseResult) return;
    const selected = parseResult.transactions.filter(t => t.selected);
    if (selected.length === 0) return;

    const payload: Omit<Transaction, 'id' | 'createdAt'>[] = selected.map(item => ({
      amount: item.amount,
      description: item.description,
      type: item.type,
      category: item.category,
      date: item.date,
      paymentMethod: item.paymentMethod,
      isPaid: true,
      notes: `Importado de extrato bancário (${parseResult.bankName})`,
    }));

    onImportTransactions(payload);
    onClose();
  };

  const handleReset = () => {
    setParseResult(null);
    setPastedText('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Importador de Extrato Bancário
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  OFX & CSV
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Lê extratos de qualquer banco brasileiro e categoriza automaticamente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 mobile-scroll">
          
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && !parseResult && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Initial View: Upload or Paste */}
          {!parseResult && (
            <div className="space-y-4">
              
              {/* Format Tabs */}
              <div className="flex p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    activeTab === 'upload'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Arquivo (OFX / CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    activeTab === 'paste'
                      ? 'bg-slate-800 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Colar Texto do Extrato</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-800/20 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ofx,.csv,.txt"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Arraste ou clique para selecionar o extrato
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Suporta arquivos padrão <strong>.OFX</strong> e <strong>.CSV</strong> exportados pelo aplicativo do seu banco ou internet banking.
                  </p>
                  <span className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                    Procurar no Celular / Computador
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Cole aqui o conteúdo do extrato copiado do seu banco ou internet banking (linhas de data, descrição e valor)..."
                    className="w-full h-44 bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-500 outline-none font-mono resize-none"
                  />
                  <button
                    type="button"
                    disabled={!pastedText.trim() || isProcessing}
                    onClick={handleProcessPastedText}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Processar e Analisar Extrato</span>
                  </button>
                </div>
              )}

              {/* Supported Banks Badges */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Bancos & Carteiras Compatíveis
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_BANKS.map((b) => (
                    <span 
                      key={b}
                      className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[10px] font-medium text-slate-300"
                    >
                      {b}
                    </span>
                  ))}
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800/40 text-[10px] font-medium text-slate-500">
                    + Qualquer banco via OFX
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Results Preview */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Identificado</span>
                  <p className="text-xs font-bold text-white truncate">{parseResult.bankName}</p>
                  <span className="text-[9px] text-slate-400 font-mono">{parseResult.format}</span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[9px] font-bold text-emerald-500 uppercase block mb-0.5">Entradas</span>
                  <p className="text-xs font-bold text-emerald-400">{formatBRL(parseResult.totalIncome)}</p>
                  <span className="text-[9px] text-slate-400">
                    {parseResult.transactions.filter(t => t.type === 'income').length} lançamentos
                  </span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[9px] font-bold text-red-500 uppercase block mb-0.5">Saídas</span>
                  <p className="text-xs font-bold text-red-400">{formatBRL(parseResult.totalExpense)}</p>
                  <span className="text-[9px] text-slate-400">
                    {parseResult.transactions.filter(t => t.type === 'expense').length} lançamentos
                  </span>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[9px] font-bold text-amber-500 uppercase block mb-0.5">Duplicados</span>
                  <p className="text-xs font-bold text-amber-400">{parseResult.duplicatesCount}</p>
                  <span className="text-[9px] text-slate-400">Desmarcados por padrão</span>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition"
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition"
                  >
                    Desmarcar
                  </button>
                  {parseResult.duplicatesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setHideDuplicates(!hideDuplicates)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold border transition ${
                        hideDuplicates 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {hideDuplicates ? 'Mostrando Apenas Novos' : `Ocultar Duplicados (${parseResult.duplicatesCount})`}
                    </button>
                  )}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar nos lançamentos..."
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* Transactions List */}
              <div className="border border-slate-800 rounded-2xl divide-y divide-slate-800/80 max-h-80 overflow-y-auto bg-slate-950/40 mobile-scroll">
                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Nenhum lançamento corresponde ao filtro.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <div 
                        key={tx.id} 
                        className={`p-3 flex items-start gap-3 transition ${
                          tx.selected ? 'bg-slate-900/60' : 'opacity-60 bg-slate-950/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={tx.selected}
                          onChange={() => handleToggleSelectOne(tx.id)}
                          className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {tx.description}
                            </span>
                            <span className={`text-xs font-extrabold tabular-nums shrink-0 ${
                              isIncome ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {isIncome ? '+' : '-'}{formatBRL(tx.amount)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="text-slate-400 font-mono">{tx.date}</span>
                            
                            {/* Type badge / selector */}
                            <button
                              type="button"
                              onClick={() => handleUpdateType(tx.id, isIncome ? 'expense' : 'income')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                                isIncome 
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }`}
                            >
                              {isIncome ? 'Receita' : 'Despesa'}
                            </button>

                            {/* Category Selector */}
                            <select
                              value={tx.category}
                              onChange={(e) => handleUpdateCategory(tx.id, e.target.value)}
                              className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                            >
                              {categories
                                .filter(c => c.type === tx.type)
                                .map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>

                            {/* Duplicate Warning */}
                            {tx.isDuplicate && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                                Possível duplicado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reset to upload another */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Escolher outro arquivo / limpar</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancelar
          </button>

          {parseResult && (
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Importar {selectedCount} Lançamento{selectedCount === 1 ? '' : 's'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Tag, 
  FileText, 
  Check, 
  Trash2,
  Mic,
  MicOff,
  Sparkles,
  ClipboardPaste,
  HelpCircle,
  Plus
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  PaymentMethod, 
  Category, 
  PAYMENT_METHOD_LABELS,
  DEFAULT_QUICK_PRESETS,
  QuickPreset
} from '../types/finance';
import { motion } from 'motion/react';
import { parseFinancialText } from '../services/voiceParser';
import { formatBRL } from '../services/exportService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'>, existingId?: string) => void;
  onDelete?: (id: string) => void;
  categories: Category[];
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories,
  editingTransaction,
  initialType = 'expense',
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechSupported, setVoiceSpeechSupported] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // Smart Paste panel state
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const recognitionRef = useRef<any>(null);

  // Parse Voice or Pasted Text
  const handleApplyParsedText = (text: string) => {
    const parsed = parseFinancialText(text, categories);
    setType(parsed.type);
    if (parsed.amount) {
      setAmountStr(String(parsed.amount));
    }
    if (parsed.description) {
      setDescription(parsed.description);
    }
    if (parsed.category) {
      setCategory(parsed.category);
    }
    if (parsed.paymentMethod) {
      setPaymentMethod(parsed.paymentMethod);
    }
  };

  const handleApplyParsedTextRef = useRef(handleApplyParsedText);
  useEffect(() => {
    handleApplyParsedTextRef.current = handleApplyParsedText;
  });

  // Only check if SpeechRecognition API exists in window, WITHOUT instantiating or requesting mic
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      setVoiceSpeechSupported(hasSpeech);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setDescription(editingTransaction.description);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNotes(editingTransaction.notes || '');
    } else {
      setType(initialType);
      setAmountStr('');
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('pix');
      setNotes('');
      setErrorMsg('');
      setVoiceFeedback(null);
      setShowPastePanel(false);
      const defaultCat = categories.find(c => c.type === initialType);
      if (defaultCat) setCategory(defaultCat.name);
    }
    setIsConfirmingDelete(false);
  }, [editingTransaction, isOpen, categories, initialType]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);

  // Quick Preset Click
  const handleApplyPreset = (preset: QuickPreset) => {
    setType(preset.type);
    setDescription(preset.title);
    setCategory(preset.category);
    setPaymentMethod(preset.paymentMethod);
    if (preset.defaultAmount && !amountStr) {
      setAmountStr(String(preset.defaultAmount));
    }
  };

  // Toggle Voice Recognition - strictly on user click
  const toggleVoiceRecognition = async () => {
    // If currently listening, stop it
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined') return;

    // Check if running in restricted iframe or if browser supports getUserMedia
    const inIframe = window.self !== window.top;

    // Attempt to prompt the user's browser with the native microphone permission dialog
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission was granted! Release stream tracks so recognition engine can take over
        stream.getTracks().forEach(t => t.stop());
      } catch (mediaErr: any) {
        setIsListening(false);
        if (inIframe) {
          setVoiceFeedback('Microfone bloqueado pelo navegador dentro da prévia (iframe). Abra o link direto ou use o microfone do teclado do celular ao tocar na descrição.');
        } else if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          setVoiceFeedback('Permissão negada. Toque no ícone de 🔒 na barra do seu navegador e mude Microfone para "Permitir".');
        } else {
          setVoiceFeedback('Microfone não acessível. Dica: use o microfone do teclado do seu celular!');
        }
        setTimeout(() => setVoiceFeedback(null), 6000);
        return;
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFeedback('Navegador não possui reconhecimento de fala contínuo. Use o microfone do seu teclado (Gboard / iOS) ao tocar na caixa de texto!');
      setTimeout(() => setVoiceFeedback(null), 5000);
      return;
    }

    try {
      // Create instance ONLY when the user clicks the button
      const recog = new SpeechRecognition();
      recog.lang = 'pt-BR';
      recog.continuous = false;
      recog.interimResults = false;

      recog.onstart = () => {
        setIsListening(true);
        setVoiceFeedback('Ouvindo... Fale por exemplo: "Almoço 35 no débito"');
      };

      recog.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && handleApplyParsedTextRef.current) {
          handleApplyParsedTextRef.current(transcript);
        }
        setIsListening(false);
        setVoiceFeedback(`✓ Reconhecido: "${transcript}"`);
        setTimeout(() => setVoiceFeedback(null), 4000);
      };

      recog.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceFeedback('Microfone bloqueado. Permita no 🔒 do navegador ou use o botão de microfone do teclado do celular.');
        } else if (event.error === 'no-speech') {
          setVoiceFeedback('Nenhuma fala detectada. Toque no botão para tentar novamente.');
        } else {
          setVoiceFeedback('Gravação finalizada. Dica: teste os botões rápidos de exemplo abaixo.');
        }
        setTimeout(() => setVoiceFeedback(null), 5000);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
      recog.start();
    } catch (e) {
      setIsListening(false);
      setVoiceFeedback('Não foi possível iniciar o microfone. Use os botões de exemplo ou o microfone do teclado.');
      setTimeout(() => setVoiceFeedback(null), 5000);
    }
  };

  // Add quick amount (+5, +10, +50, +100)
  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amountStr.replace(',', '.')) || 0;
    setAmountStr(String(current + val));
  };

  // Date Presets
  const setDatePreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setDate(d.toISOString().slice(0, 10));
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amountStr.replace(',', '.'));

    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Informe uma descrição do lançamento.');
      return;
    }

    if (!category) {
      setErrorMsg('Selecione uma categoria.');
      return;
    }

    onSave({
      type,
      amount: cleanAmount,
      description: description.trim(),
      category,
      date,
      paymentMethod,
      notes: notes.trim() ? notes.trim() : undefined,
    }, editingTransaction ? editingTransaction.id : undefined);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <motion.div 
        initial={{ y: '100%', opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden gpu-layer"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                100% Offline
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Preenchimento super rápido com voz e atalhos</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with min-h-0 and mobile-scroll */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto min-h-0 mobile-scroll space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Quick Voice & Paste Tooling Bar */}
          {!editingTransaction && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Voice button */}
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                    isListening
                      ? 'bg-red-500 text-white border-red-400 animate-pulse'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                  title="Falar lançamento por voz"
                >
                  {isListening ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  <span>{isListening ? 'Ouvindo... Toque p/ parar' : 'Preencher por Voz'}</span>
                </button>

                {/* Paste notification button */}
                <button
                  type="button"
                  onClick={() => setShowPastePanel(!showPastePanel)}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    showPastePanel
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Colar notificação bancária"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-blue-400" />
                  <span>Colar Pix/SMS</span>
                </button>
              </div>

              {/* Voice Feedback text */}
              {voiceFeedback && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>{voiceFeedback}</span>
                  </div>
                  {/* Quick test phrases that work even if mic is disabled in browser/iframe */}
                  <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Testar por texto:</span>
                    {[
                      'Almoço 35 no débito',
                      'Uber 24 no pix',
                      'Supermercado 150 no crédito',
                      'Salário 3800'
                    ].map((phrase) => (
                      <button
                        key={phrase}
                        type="button"
                        onClick={() => {
                          handleApplyParsedText(phrase);
                          setVoiceFeedback(`✓ Aplicado: "${phrase}"`);
                          setTimeout(() => setVoiceFeedback(null), 3000);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 transition"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paste Notification Input Box */}
              {showPastePanel && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 animate-in fade-in">
                  <p className="text-[11px] text-slate-400">
                    Cole uma mensagem de compra (ex: *"Você pagou R$ 42,90 no Pix para Posto Ipiranga"*):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cole aqui o texto da notificação ou recibo..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (pastedText.trim()) {
                          handleApplyParsedText(pastedText);
                          setShowPastePanel(false);
                          setPastedText('');
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                    >
                      Processar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Frequent Presets Carousel */}
          {!editingTransaction && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Lançamentos Frequentes (1 toque preenche tudo):
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {DEFAULT_QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 text-[11px] text-slate-300 transition whitespace-nowrap active:scale-95"
                  >
                    <span>{preset.title}</span>
                    {preset.defaultAmount && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        R${preset.defaultAmount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type Toggle: Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const defaultCat = categories.find(c => c.type === 'expense');
                if (defaultCat) setCategory(defaultCat.name);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const defaultCat = categories.find(c => c.type === 'income');
                if (defaultCat) setCategory(defaultCat.name);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Receita</span>
            </button>
          </div>

          {/* Amount input & Quick Sum Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={`w-full bg-slate-950 border pl-12 pr-4 py-2.5 rounded-2xl text-xl font-bold text-white focus:outline-none transition ${
                  type === 'expense'
                    ? 'border-red-500/40 focus:border-red-500 text-red-400'
                    : 'border-emerald-500/40 focus:border-emerald-500 text-emerald-400'
                }`}
              />
            </div>

            {/* Fast numeric addition chips */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500">Adicionar:</span>
              {[5, 10, 20, 50, 100].map((addVal) => (
                <button
                  key={addVal}
                  type="button"
                  onClick={() => handleAddQuickAmount(addVal)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition active:scale-95"
                >
                  +{addVal}
                </button>
              ))}
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="px-2 py-0.5 rounded-lg text-slate-500 hover:text-slate-300 text-[10px] underline ml-auto"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder={type === 'expense' ? 'Ex: Almoço, Supermercado, Gasolina' : 'Ex: Salário da Empresa, Venda Extra'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                Categoria
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Selecionada: <strong className="text-white">{category}</strong>
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {filteredCategories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition border ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 text-white font-semibold'
                        : 'bg-slate-900/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Fast Date Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Data
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDatePreset(0)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset(1)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Ontem
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, item]) => (
                  <option key={key} value={key} className="bg-slate-900 text-white">
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Almoço de domingo em família..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {isConfirmingDelete ? (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                  <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Excluir este lançamento permanentemente?</span>
                </div>
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTransaction && onDelete) {
                        onDelete(editingTransaction.id);
                        onClose();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                  >
                    Sim, Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {editingTransaction && onDelete && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="py-3 px-3.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition active:scale-95 flex items-center gap-1.5"
                    title="Excluir Lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Apagar</span>
                  </button>
                )}

                <button
                  type="submit"
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg ${
                    type === 'expense'
                      ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingTransaction ? 'Salvar Alterações' : 'Salvar no Celular'}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

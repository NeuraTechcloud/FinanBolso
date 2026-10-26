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
  Plus,
  Percent,
  Calculator,
  Repeat,
  Layers,
  Clock,
  Camera,
  Loader2,
  ShieldCheck,
  AlertCircle,
  RotateCcw
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
import { motion, AnimatePresence } from 'motion/react';
import { parseFinancialText } from '../services/voiceParser';
import { formatBRL, formatDateBR } from '../services/exportService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'> | Array<Omit<Transaction, 'id' | 'createdAt'>>, existingId?: string) => void;
  onDelete?: (id: string, deleteEntireGroup?: boolean) => void;
  categories: Category[];
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
  isPro?: boolean;
  onOpenSubscription?: () => void;
}

// Calculate month-by-month dates accurately handling month-end boundaries
export const addMonthsToDate = (isoDateStr: string, monthsToAdd: number): string => {
  const [yearStr, monthStr, dayStr] = isoDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const targetDate = new Date(year, month + monthsToAdd, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const finalDay = Math.min(day, daysInTargetMonth);

  const finalYearStr = String(targetYear);
  const finalMonthStr = String(targetMonth + 1).padStart(2, '0');
  const finalDayStr = String(finalDay).padStart(2, '0');

  return `${finalYearStr}-${finalMonthStr}-${finalDayStr}`;
};

// Ephemeral in-memory client-side image compression for rapid OCR transmission without saving files
const compressReceiptImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler a foto do comprovante.'));
    reader.onload = (e) => {
      const img = new (window as any).Image();
      img.onerror = () => reject(new Error('Formato de imagem não suportado.'));
      img.onload = () => {
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const original = (e.target?.result as string) || '';
          resolve({
            base64: original,
            mimeType: file.type || 'image/jpeg',
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          base64: compressedDataUrl,
          mimeType: 'image/jpeg',
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories,
  editingTransaction,
  initialType = 'expense',
  isPro = false,
  onOpenSubscription,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteEntireGroup, setDeleteEntireGroup] = useState(false);

  // Recurrence / Monthly duration state
  const [recurrenceMode, setRecurrenceMode] = useState<'single' | 'duration' | 'installments' | 'indefinite'>('single');
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechSupported, setVoiceSpeechSupported] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // Smart Paste & Photo Pix/SMS panel state
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pastePanelMode, setPastePanelMode] = useState<'photo' | 'text'>('photo');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const lastReceiptFileRef = useRef<File | null>(null);

  // Subvalue & Tax/Fee Calculator state
  const [showFeeCalculator, setShowFeeCalculator] = useState(false);
  const [subAmountStr, setSubAmountStr] = useState('');
  const [feePercentStr, setFeePercentStr] = useState('3.5');
  const [fixedFeeStr, setFixedFeeStr] = useState('');
  const [feeMode, setFeeMode] = useState<'percent' | 'fixed'>('percent');

  const recognitionRef = useRef<any>(null);

  // Ephemeral OCR: processes the receipt photo in-memory to autofill fields, and strictly DISCARDS the photo without saving it.
  const handleProcessReceiptPhoto = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setPhotoFeedback({ text: 'Por favor, envie um arquivo de imagem válido (JPG, PNG ou WebP).', isError: true });
      return;
    }

    lastReceiptFileRef.current = file;
    setIsProcessingPhoto(true);
    setPhotoFeedback({ text: '🔍 Lendo dados do comprovante...' });

    try {
      // 1. Client-side lightweight in-memory compression
      const { base64, mimeType } = await compressReceiptImage(file);

      let extracted: any = null;

      // 2. Try server-side OCR first (if fullstack dev server is running)
      try {
        const res = await fetch('/api/ai/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType,
            categories: categories.map((c) => c.name),
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (json.success && json.data) {
            extracted = json.data;
          }
        }
      } catch {
        // Server unreachable or static host (e.g. Vercel)
      }

      // 3. Fallback to client-side in-browser OCR if server route is unavailable (e.g. on Vercel)
      if (!extracted) {
        setPhotoFeedback({ text: '🔍 Processando leitura do comprovante...' });
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker(['por', 'eng']);
        const ocrResult = await worker.recognize(base64);
        await worker.terminate();
        const ocrText = ocrResult?.data?.text || '';
        const { parseReceiptOcrText } = await import('../services/receiptParser');
        extracted = parseReceiptOcrText(ocrText, categories);
      }

      if (!extracted) {
        throw new Error('Não foi possível ler as informações do comprovante.');
      }

      // 4. Automatically populate the form fields
      if (extracted.type === 'income' || extracted.type === 'expense') {
        setType(extracted.type);
      }
      if (extracted.amount && !isNaN(Number(extracted.amount))) {
        setAmountStr(String(extracted.amount));
      }
      if (extracted.description && typeof extracted.description === 'string') {
        setDescription(extracted.description);
      }
      if (extracted.category) {
        const match = categories.find((c) => c.name.toLowerCase() === extracted.category.toLowerCase()) ||
          categories.find((c) => c.type === (extracted.type || type));
        if (match) {
          setCategory(match.name);
        } else {
          setCategory(extracted.category);
        }
      }
      if (extracted.paymentMethod) {
        setPaymentMethod(extracted.paymentMethod);
      }
      if (extracted.date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date)) {
        setDate(extracted.date);
      }
      if (extracted.notes) {
        setNotes(extracted.notes);
      }

      // 5. Strict Zero-Storage enforcement: clear file input and discard reference immediately
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }

      setPhotoFeedback({
        text: '✓ Dados do comprovante preenchidos com sucesso!',
        isError: false,
      });

      setTimeout(() => {
        setPhotoFeedback(null);
        setShowPastePanel(false);
      }, 3500);
    } catch (err: any) {
      console.error('Erro ao processar foto do comprovante:', err);
      let cleanMsg = err?.message || 'Tente novamente ou cole o texto do comprovante.';
      try {
        if (cleanMsg.includes('{') && cleanMsg.includes('}')) {
          const start = cleanMsg.indexOf('{');
          const end = cleanMsg.lastIndexOf('}');
          const parsed = JSON.parse(cleanMsg.slice(start, end + 1));
          if (parsed?.error?.message) {
            cleanMsg = parsed.error.message;
          } else if (parsed?.error && typeof parsed.error === 'string') {
            cleanMsg = parsed.error;
          }
        }
      } catch {}

      setPhotoFeedback({
        text: cleanMsg,
        isError: true,
      });
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    } finally {
      setIsProcessingPhoto(false);
    }
  };

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
    if (parsed.notes) {
      setNotes(parsed.notes);
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
      setIsPaid(Boolean(editingTransaction.isPaid));
      setRecurrenceMode(editingTransaction.isRecurring ? 'indefinite' : 'single');
    } else {
      setType(initialType);
      setAmountStr('');
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('pix');
      setNotes('');
      setIsPaid(false);
      setErrorMsg('');
      setVoiceFeedback(null);
      setPhotoFeedback(null);
      setShowPastePanel(false);
      setPastePanelMode('photo');
      if (photoInputRef.current) photoInputRef.current.value = '';
      setRecurrenceMode('single');
      setDurationMonths(6);
      setInstallmentCount(3);
      const defaultCat = categories.find(c => c.type === initialType);
      if (defaultCat) setCategory(defaultCat.name);
    }
    setIsConfirmingDelete(false);
    setDeleteEntireGroup(false);
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

  // Toggle Voice Recognition - strictly on user click and gated for Pro
  const toggleVoiceRecognition = async () => {
    if (!isPro) {
      if (onOpenSubscription) onOpenSubscription();
      setVoiceFeedback('🎙️ A adição por voz via Inteligência Artificial é exclusiva do Plano Pro VIP!');
      setTimeout(() => setVoiceFeedback(null), 5000);
      return;
    }

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

    if (editingTransaction) {
      onSave({
        type,
        amount: cleanAmount,
        description: description.trim(),
        category,
        date,
        paymentMethod,
        notes: notes.trim() ? notes.trim() : undefined,
        isRecurring: editingTransaction.isRecurring,
        installmentNumber: editingTransaction.installmentNumber,
        installmentsTotal: editingTransaction.installmentsTotal,
        recurringGroupId: editingTransaction.recurringGroupId,
        isPaid,
      }, editingTransaction.id);
      onClose();
      return;
    }

    // Creating new transaction:
    if (recurrenceMode === 'duration' && durationMonths > 1) {
      const groupId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const items: Array<Omit<Transaction, 'id' | 'createdAt'>> = [];
      for (let i = 1; i <= durationMonths; i++) {
        items.push({
          type,
          amount: cleanAmount,
          description: `${description.trim()} (${i}/${durationMonths})`,
          category,
          date: addMonthsToDate(date, i - 1),
          paymentMethod,
          notes: notes.trim() ? `${notes.trim()} • Mensalidade ${i} de ${durationMonths}` : `Mensalidade ${i} de ${durationMonths}`,
          isRecurring: true,
          installmentNumber: i,
          installmentsTotal: durationMonths,
          recurringGroupId: groupId,
          isPaid: i === 1 ? isPaid : false,
        });
      }
      onSave(items);
    } else if (recurrenceMode === 'installments' && installmentCount > 1) {
      const groupId = `parc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const items: Array<Omit<Transaction, 'id' | 'createdAt'>> = [];
      const installmentVal = Math.round((cleanAmount / installmentCount) * 100) / 100;
      const totalCalculated = installmentVal * installmentCount;
      const diff = Math.round((cleanAmount - totalCalculated) * 100) / 100;

      for (let i = 1; i <= installmentCount; i++) {
        const currentAmount = i === installmentCount ? installmentVal + diff : installmentVal;
        items.push({
          type,
          amount: currentAmount,
          description: `${description.trim()} (${i}/${installmentCount})`,
          category,
          date: addMonthsToDate(date, i - 1),
          paymentMethod,
          notes: notes.trim() ? `${notes.trim()} • Parcela ${i} de ${installmentCount}` : `Parcela ${i} de ${installmentCount}`,
          isRecurring: false,
          installmentNumber: i,
          installmentsTotal: installmentCount,
          recurringGroupId: groupId,
          isPaid: i === 1 ? isPaid : false,
        });
      }
      onSave(items);
    } else if (recurrenceMode === 'indefinite') {
      onSave({
        type,
        amount: cleanAmount,
        description: description.trim(),
        category,
        date,
        paymentMethod,
        notes: notes.trim() ? notes.trim() : undefined,
        isRecurring: true,
        isPaid,
      });
    } else {
      onSave({
        type,
        amount: cleanAmount,
        description: description.trim(),
        category,
        date,
        paymentMethod,
        notes: notes.trim() ? notes.trim() : undefined,
        isRecurring: false,
        isPaid,
      });
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 gpu-layer">
          <motion.div 
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden gpu-layer"
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

        {/* Modal Body with min-h-0 and nested-scroll */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto min-h-0 nested-scroll space-y-4 flex-1">
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

                {/* Paste notification or Photo Pix button */}
                <button
                  type="button"
                  onClick={() => setShowPastePanel(!showPastePanel)}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                    showPastePanel
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Foto do Pix ou colar SMS/notificação"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Foto Pix / SMS</span>
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

              {/* Paste Notification & Photo Pix/SMS Panel */}
              {showPastePanel && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in">
                  {/* Mode switch */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Captura Pix / Comprovante
                    </span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPastePanelMode('photo')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition ${
                          pastePanelMode === 'photo'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Foto Pix / Recibo
                      </button>
                      <button
                        type="button"
                        onClick={() => setPastePanelMode('text')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition ${
                          pastePanelMode === 'text'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Colar Texto SMS
                      </button>
                    </div>
                  </div>

                  {pastePanelMode === 'photo' ? (
                    <div className="space-y-2">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProcessReceiptPhoto(file);
                        }}
                      />

                      {isProcessingPhoto ? (
                        <div className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-blue-600/15 border border-blue-500/40 text-blue-300 text-xs font-semibold animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          <span>Lendo dados do comprovante...</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
                        >
                          <Camera className="w-4 h-4 text-white" />
                          <span>Enviar Foto do Comprovante</span>
                        </button>
                      )}

                      {/* Zero Storage Privacy Notice */}
                      <div className="flex items-start gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-300 leading-relaxed">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-emerald-200">Privacidade Garantida:</strong> A foto é lida em tempo real apenas para preencher os campos e descartada da memória imediatamente. A imagem <span className="underline font-bold">NÃO é salva</span> nem armazenada no seu dispositivo.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400">
                        Cole uma mensagem de compra (ex: *"Você pagou R$ 42,90 no Pix para Posto Ipiranga"*):
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Cole aqui o texto da notificação ou SMS..."
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

                  {/* Feedback display */}
                  {photoFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] border animate-in fade-in space-y-2 ${
                        photoFeedback.isError
                          ? 'bg-red-500/15 border-red-500/30 text-red-300'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {photoFeedback.isError ? (
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                        ) : (
                          <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        )}
                        <span className="leading-snug">{photoFeedback.text}</span>
                      </div>

                      {photoFeedback.isError && (
                        <div className="flex items-center gap-2 pt-1 border-t border-red-500/20">
                          {lastReceiptFileRef.current && (
                            <button
                              type="button"
                              onClick={() => {
                                if (lastReceiptFileRef.current) {
                                  handleProcessReceiptPhoto(lastReceiptFileRef.current);
                                }
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[10px] transition active:scale-95 shadow"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Tentar Novamente</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] border border-slate-700 transition"
                          >
                            <Camera className="w-3 h-3 text-slate-400" />
                            <span>Outra foto</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Valor Final (R$)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!showFeeCalculator) {
                    setSubAmountStr(amountStr || '');
                  }
                  setShowFeeCalculator(!showFeeCalculator);
                }}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                  showFeeCalculator
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:border-slate-600'
                }`}
                title="Calcular valor base com taxa de cartão, entrega ou juros"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>Calcular com Taxa</span>
              </button>
            </div>

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

            {/* Subvalue and Tax Calculator Breakdown */}
            {showFeeCalculator && (
              <div className="mt-2.5 p-3.5 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    Cálculo de Subvalor Real & Taxa
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFeeMode('percent')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${feeMode === 'percent' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                    >
                      % Percentual
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeMode('fixed')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${feeMode === 'fixed' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                    >
                      R$ Fixo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Subvalor Real (Base):</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        value={subAmountStr}
                        onChange={(e) => setSubAmountStr(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">
                      {feeMode === 'percent' ? 'Taxa / Acréscimo (%):' : 'Taxa Fixa (R$):'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                        {feeMode === 'percent' ? '%' : 'R$'}
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder={feeMode === 'percent' ? '3.5' : '5.00'}
                        value={feeMode === 'percent' ? feePercentStr : fixedFeeStr}
                        onChange={(e) => {
                          if (feeMode === 'percent') setFeePercentStr(e.target.value);
                          else setFixedFeeStr(e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick fee percent pills */}
                {feeMode === 'percent' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Taxas comuns:</span>
                    {['1.99', '2.5', '3.5', '4.99', '10'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFeePercentStr(p)}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-[10px] text-slate-300 font-mono"
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                )}

                {/* Calculation summary */}
                {(() => {
                  const subVal = parseFloat(subAmountStr.replace(',', '.')) || 0;
                  const feeVal = feeMode === 'percent' 
                    ? subVal * ((parseFloat(feePercentStr.replace(',', '.')) || 0) / 100)
                    : (parseFloat(fixedFeeStr.replace(',', '.')) || 0);
                  const totalWithFee = subVal + feeVal;

                  return (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">
                          Subvalor: <strong className="text-white">{formatBRL(subVal)}</strong> + Taxa: <strong className="text-amber-400">{formatBRL(feeVal)}</strong>
                        </div>
                        <div className="text-xs font-bold text-emerald-400">
                          Total Calculado: {formatBRL(totalWithFee)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (totalWithFee > 0) {
                            setAmountStr(totalWithFee.toFixed(2));
                            const noteDetail = `Subvalor real: ${formatBRL(subVal)} | Taxa: ${formatBRL(feeVal)}`;
                            setNotes(prev => prev ? `${prev} • ${noteDetail}` : noteDetail);
                            setShowFeeCalculator(false);
                          }
                        }}
                        disabled={totalWithFee <= 0}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow active:scale-95"
                      >
                        Aplicar
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

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

          {/* Recurrence & Duration Section (Monthly / Installments) */}
          {!editingTransaction ? (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-blue-400" />
                  Repetição & Duração Mensal
                </label>
                {recurrenceMode !== 'single' && (
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    Ativado
                  </span>
                )}
              </div>

              {/* Recurrence Mode Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setRecurrenceMode('single')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                    recurrenceMode === 'single'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Único
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceMode('duration')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                    recurrenceMode === 'duration'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Por X Meses
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceMode('installments')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                    recurrenceMode === 'installments'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Parcelado
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceMode('indefinite')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                    recurrenceMode === 'indefinite'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fixo Contínuo
                </button>
              </div>

              {/* Mode: Duração Mensal (Por X Meses) */}
              {recurrenceMode === 'duration' && (
                <div className="space-y-2.5 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Quantidade de meses:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-xs text-white"
                      />
                      <span className="text-slate-400 text-xs">meses</span>
                    </div>
                  </div>

                  {/* Quick chip buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 mr-1">Atalhos:</span>
                    {[2, 3, 6, 12, 18, 24, 36].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMonths(m)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                          durationMonths === m
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {m} meses
                      </button>
                    ))}
                  </div>

                  {/* Real-time projection card */}
                  {(() => {
                    const val = parseFloat(amountStr.replace(',', '.')) || 0;
                    const total = val * durationMonths;
                    const endDate = addMonthsToDate(date, durationMonths - 1);
                    return (
                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-blue-300">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            {durationMonths} lançamentos mensais de {formatBRL(val)}
                          </span>
                          <span className="font-extrabold text-white tabular-nums">Total: {formatBRL(total)}</span>
                        </div>
                        <p className="text-[10px] text-blue-300/80">
                          Período: {formatDateBR(date)} até {formatDateBR(endDate)} (1 lançamento a cada mês).
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Mode: Parcelado */}
              {recurrenceMode === 'installments' && (
                <div className="space-y-2.5 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Número de parcelas:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-xs text-white"
                      />
                      <span className="text-slate-400 text-xs">vezes</span>
                    </div>
                  </div>

                  {/* Quick chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 mr-1">Atalhos:</span>
                    {[2, 3, 4, 5, 6, 10, 12, 18, 24].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setInstallmentCount(p)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                          installmentCount === p
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {p}x
                      </button>
                    ))}
                  </div>

                  {/* Projection card */}
                  {(() => {
                    const val = parseFloat(amountStr.replace(',', '.')) || 0;
                    const instVal = installmentCount > 0 ? val / installmentCount : 0;
                    const endDate = addMonthsToDate(date, installmentCount - 1);
                    return (
                      <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-purple-300">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            {installmentCount}x de {formatBRL(instVal)}
                          </span>
                          <span className="font-extrabold text-white tabular-nums">Total: {formatBRL(val)}</span>
                        </div>
                        <p className="text-[10px] text-purple-300/80">
                          1ª parcela em {formatDateBR(date)} • Última parcela em {formatDateBR(endDate)}.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Mode: Fixo Indefinido */}
              {recurrenceMode === 'indefinite' && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1 animate-in fade-in">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Lançamento Fixo Contínuo
                  </span>
                  <p className="text-[10px] text-emerald-300/80">
                    Ideal para despesas mensais sem data de término (ex: Aluguel, Luz, Internet, Assinatura anual).
                  </p>
                </div>
              )}
            </div>
          ) : (
            editingTransaction?.installmentsTotal && editingTransaction.installmentsTotal > 1 ? (
              <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>
                    Parcela <strong>{editingTransaction.installmentNumber || 1}</strong> de <strong>{editingTransaction.installmentsTotal}</strong> deste grupo
                  </span>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                  {editingTransaction.recurringGroupId ? 'Vinculado' : 'Parcela'}
                </span>
              </div>
            ) : null
          )}

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

          {/* Payment Status Toggle (for expenses) */}
          {type === 'expense' && (
            <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2">
                <Check className={`w-4 h-4 ${isPaid ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Já foi pago?</p>
                  <p className="text-[10px] text-slate-500">Marque se a conta já foi quitada ou liquidada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaid(!isPaid)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                  isPaid 
                    ? 'bg-emerald-500 text-slate-950 shadow-md' 
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                {isPaid ? '✓ Quitado / Pago' : 'Pendente'}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {isConfirmingDelete ? (
              <div className="p-3.5 bg-red-950/50 border border-red-500/50 rounded-2xl flex flex-col gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                  <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Excluir este lançamento permanentemente?</span>
                </div>

                {editingTransaction?.recurringGroupId && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteEntireGroup}
                      onChange={(e) => setDeleteEntireGroup(e.target.checked)}
                      className="rounded border-slate-700 text-red-500 focus:ring-0"
                    />
                    <span>Excluir todas as parcelas deste grupo ({editingTransaction.installmentsTotal || 'recorrentes'})</span>
                  </label>
                )}

                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTransaction && onDelete) {
                        onDelete(editingTransaction.id, deleteEntireGroup);
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
          <div className="h-8 shrink-0" /> {/* Extra bottom padding for mobile scroll */}
        </form>
      </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

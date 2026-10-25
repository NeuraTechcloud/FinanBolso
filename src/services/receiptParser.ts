import { TransactionType, PaymentMethod, Category } from '../types/finance';

export interface ParsedReceiptData {
  amount?: number;
  type: TransactionType;
  description?: string;
  category?: string;
  paymentMethod: PaymentMethod;
  date?: string; // YYYY-MM-DD
  notes?: string;
  rawText?: string;
}

/**
 * Deterministic, offline parser for Brazilian bank receipts (Pix, slips, cards, tax receipts)
 * Works 100% locally without AI, eliminating rate limits and external service errors.
 */
export function parseReceiptOcrText(
  rawText: string,
  categories: Category[] = []
): ParsedReceiptData {
  const text = rawText || '';
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lower = text.toLowerCase();

  // 1. Detect Type (Income vs Expense)
  let type: TransactionType = 'expense';
  if (
    lower.includes('pix recebido') ||
    lower.includes('transferência recebida') ||
    lower.includes('transferencia recebida') ||
    lower.includes('você recebeu') ||
    lower.includes('voce recebeu') ||
    lower.includes('recebido de') ||
    lower.includes('crédito em conta') ||
    lower.includes('credito em conta') ||
    lower.includes('depósito recebido') ||
    lower.includes('deposito recebido') ||
    lower.includes('recebimento') ||
    lower.includes('salário') ||
    lower.includes('estorno')
  ) {
    type = 'income';
  }

  // 2. Extract Amount (Valor)
  let amount: number | undefined;

  // Strategy A: Look specifically for lines with "valor", "total", "pago", "r$", etc.
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (
      lineLower.includes('valor') ||
      lineLower.includes('total') ||
      lineLower.includes('pago') ||
      lineLower.includes('líquido') ||
      lineLower.includes('r$') ||
      lineLower.includes('rs')
    ) {
      // Find currency number format (e.g. 1.250,50 or 45,90 or 45.90)
      const m = line.match(/(?:r\$\s*|rs\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/i);
      if (m && m[1]) {
        const normalized = m[1].replace(/\./g, '').replace(',', '.');
        const num = parseFloat(normalized);
        if (!isNaN(num) && num > 0) {
          amount = num;
          break;
        }
      }
    }
  }

  // Strategy B: If not found near labels, scan entire text for all amounts and pick the most prominent
  if (!amount) {
    const allMatches = Array.from(text.matchAll(/(?:r\$\s*|rs\s*)(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/gi));
    if (allMatches.length > 0) {
      for (const m of allMatches) {
        const normalized = m[1].replace(/\./g, '').replace(',', '.');
        const num = parseFloat(normalized);
        if (!isNaN(num) && num > 0) {
          amount = num;
          break;
        }
      }
    }
  }

  // Strategy C: Plain numbers matching decimal currency pattern
  if (!amount) {
    const matchSimple = text.match(/\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/);
    if (matchSimple && matchSimple[1]) {
      const normalized = matchSimple[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(normalized);
      if (!isNaN(num) && num > 0) {
        amount = num;
      }
    }
  }

  // 3. Extract Description / Recipient / Establishment
  let description: string | undefined;

  // Look for target recipient labels typical in Brazilian bank receipts
  const targetLabelPatterns = [
    /(?:para|destinatário|destinatario|favorecido|beneficiário|beneficiario|nome do recebedor|recebedor|recebido de|pago a)\s*[:\-]?\s*([^\n\r]+)/i,
    /(?:estabelecimento|loja|empresa|razão social|razao social)\s*[:\-]?\s*([^\n\r]+)/i,
    /(?:origem|de|pagador)\s*[:\-]?\s*([^\n\r]+)/i,
  ];

  for (const regex of targetLabelPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      let candidate = match[1].trim();
      // Clean candidate of subsequent labels
      candidate = candidate.replace(/\b(cpf|cnpj|chave|instituição|instituicao|banco|data|valor|agência|conta).*/i, '').trim();
      if (candidate.length >= 3 && !candidate.toLowerCase().includes('comprovante')) {
        description = candidate;
        break;
      }
    }
  }

  // If still no description, look for common store/commercial names in lines
  if (!description) {
    const storeKeywords = [
      'posto', 'supermercado', 'mercado', 'padaria', 'farmacia', 'drogaria', 'restaurante',
      'lanchonete', 'pizzaria', 'açougue', 'acougue', 'lojas', 'magazine', 'shopping',
      'ifood', 'uber', '99', 'smart fit', 'academia', 'ltda', 'eireli', 'me'
    ];
    for (const line of lines) {
      const lineLow = line.toLowerCase();
      if (storeKeywords.some((kw) => lineLow.includes(kw)) && line.length < 50) {
        description = line.replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }

  // 4. Extract Date
  let date: string | undefined;
  // Match standard Brazilian date format DD/MM/YYYY or DD-MM-YYYY
  const dateMatch = text.match(/\b([0-3]?\d)[\/\-.]([0-1]?\d)[\/\-.](20\d{2}|\d{2})\b/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    // Validate bounds
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
      date = `${year}-${month}-${day}`;
    }
  }
  if (!date) {
    date = new Date().toISOString().slice(0, 10);
  }

  // 5. Detect Payment Method
  let paymentMethod: PaymentMethod = 'pix';
  if (lower.includes('pix') || lower.includes('chave') || lower.includes('endtoend') || lower.includes('qr code')) {
    paymentMethod = 'pix';
  } else if (lower.includes('crédito') || lower.includes('credito') || lower.includes('mastercard') || lower.includes('visa') || lower.includes('elo')) {
    paymentMethod = 'credit_card';
  } else if (lower.includes('débito') || lower.includes('debito')) {
    paymentMethod = 'debit_card';
  } else if (lower.includes('dinheiro') || lower.includes('espécie') || lower.includes('especie')) {
    paymentMethod = 'cash';
  } else if (lower.includes('ted') || lower.includes('doc') || lower.includes('transferência') || lower.includes('transferencia')) {
    paymentMethod = 'bank_transfer';
  }

  // 6. Match Category
  let matchedCategory: string | undefined;
  const keywordMap: Record<string, string[]> = {
    'Alimentação': ['almoço', 'almoco', 'jantar', 'lanche', 'comida', 'restaurante', 'ifood', 'padaria', 'mercado', 'supermercado', 'feira', 'pizza', 'café', 'cafe', 'hambúrguer', 'acougue', 'açougue', 'hortifruti', 'mcdonalds', 'burger', 'bar', 'churrasco'],
    'Moradia & Contas': ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'energia', 'enel', 'sabesp', 'cpfl', 'copel', 'iptu', 'gás', 'gas', 'internet', 'claro', 'vivo', 'tim', 'oi'],
    'Transporte & Combustível': ['uber', '99', 'gasolina', 'combustível', 'combustivel', 'etanol', 'posto', 'ipiranga', 'shell', 'br', 'estacionamento', 'pedágio', 'pedagio', 'metrô', 'onibus', 'ônibus', 'passagem', 'ipva', 'mecânico', 'oficina'],
    'Saúde & Farmácia': ['farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico', 'consulta', 'dentista', 'exame', 'drogaria', 'raia', 'drogasil', 'pague menos', 'hospital', 'psicólogo', 'vitamina', 'laboratório'],
    'Lazer & Viagens': ['cinema', 'show', 'viagem', 'hotel', 'praia', 'festa', 'passeio', 'ingressos', 'parque', 'teatro'],
    'Educação & Cursos': ['curso', 'livro', 'faculdade', 'escola', 'mensalidade', 'apostila', 'workshop', 'aula'],
    'Compras & Vestuário': ['roupa', 'sapato', 'tênis', 'loja', 'shopee', 'shein', 'amazon', 'mercado livre', 'shopping', 'magalu', 'magazine'],
    'Assinaturas & Serviços': ['netflix', 'spotify', 'prime', 'hbo', 'disney', 'academia', 'smart fit', 'assinatura', 'youtube', 'apple'],
    'Salário & Pro-labore': ['salário', 'salario', 'adiantamento', 'holerite', 'pro-labore', 'empresa', 'pagamento clt', 'quinzena'],
    'Freelance & Projetos': ['freelance', 'projeto', 'consultoria', 'cliente', 'serviço prestado', 'job'],
    'Rendimentos & Dividendos': ['dividendo', 'rendimento', 'juros', 'fii', 'ações', 'selic', 'cdi'],
  };

  const textToCheck = `${description || ''} ${text}`.toLowerCase();
  for (const [catName, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => textToCheck.includes(kw))) {
      matchedCategory = catName;
      break;
    }
  }

  if (!matchedCategory) {
    const defaultCat = categories.find((c) => c.type === type);
    if (defaultCat) {
      matchedCategory = defaultCat.name;
    }
  }

  // 7. Extract Notes (Pix ID or Authentication)
  let notes: string | undefined;
  const pixIdMatch = text.match(/\b(E\d{30,34})\b/i) || text.match(/(?:autenticação|id da transação|código|transação)\s*[:\-]?\s*([a-zA-Z0-9\.\-]+)/i);
  if (pixIdMatch && pixIdMatch[1]) {
    notes = `Comprovante: ${pixIdMatch[1].trim()}`.slice(0, 80);
  }

  // Clean description final pass
  if (!description || description.trim().length === 0) {
    description = matchedCategory || (type === 'income' ? 'Pix Recebido' : 'Comprovante Pix');
  }

  return {
    amount,
    type,
    description: description.slice(0, 60),
    category: matchedCategory,
    paymentMethod,
    date,
    notes,
    rawText: text.slice(0, 300),
  };
}

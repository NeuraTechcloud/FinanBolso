import { TransactionType, PaymentMethod, Category } from '../types/finance';

export interface ParsedFinancialInput {
  amount?: number;
  type: TransactionType;
  category?: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  notes?: string;
}

/**
 * Intelligent parser for voice transcripts and bank notifications/receipts
 */
export function parseFinancialText(
  rawText: string, 
  categories: Category[]
): ParsedFinancialInput {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Detect Type (Income vs Expense)
  let type: TransactionType = 'expense';
  if (
    lower.includes('recebi') ||
    lower.includes('recebimento') ||
    lower.includes('salário') ||
    lower.includes('salario') ||
    lower.includes('entrada') ||
    lower.includes('pix recebido') ||
    lower.includes('depósito recebido') ||
    lower.includes('venda') ||
    lower.includes('rendimento') ||
    lower.includes('dividendos') ||
    lower.includes('receita')
  ) {
    type = 'income';
  }

  // 2. Extract Amount
  // Matches: R$ 123,45 | 123.45 | 123,45 | 50 reais | 50 conto
  let amount: number | undefined;

  // Regex pattern for numeric money
  const moneyMatch = text.match(/(?:r\$\s*|rs\s*|valor:\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real|conto))?/i);
  if (moneyMatch && moneyMatch[1]) {
    const rawVal = moneyMatch[1].replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 3. Detect Payment Method
  let paymentMethod: PaymentMethod | undefined;
  if (lower.includes('pix')) {
    paymentMethod = 'pix';
  } else if (lower.includes('crédito') || lower.includes('credito')) {
    paymentMethod = 'credit_card';
  } else if (lower.includes('débito') || lower.includes('debito')) {
    paymentMethod = 'debit_card';
  } else if (lower.includes('boleto')) {
    paymentMethod = 'boleto';
  } else if (lower.includes('ticket') || lower.includes('vr') || lower.includes('va') || lower.includes('vale')) {
    paymentMethod = 'ticket';
  } else if (lower.includes('dinheiro') || lower.includes('em espécie') || lower.includes('especie') || lower.includes('troco')) {
    paymentMethod = 'cash';
  } else if (lower.includes('ted') || lower.includes('doc') || lower.includes('transferência') || lower.includes('transferencia')) {
    paymentMethod = 'bank_transfer';
  }

  // 4. Match Category
  let matchedCategory: string | undefined;

  // Keyword dictionary for automatic categorization
  const keywordMap: Record<string, string[]> = {
    'Alimentação': ['almoço', 'almoco', 'jantar', 'lanche', 'comida', 'restaurante', 'ifood', 'padaria', 'mercado', 'supermercado', 'feira', 'pizza', 'café', 'cafe', 'hambúrguer', 'acougue', 'açougue', 'hortifruti', 'mcdonalds', 'burger'],
    'Moradia & Contas': ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'energia', 'enel', 'sabesp', 'iptu', 'gás', 'gas', 'internet', 'claro', 'vivo', 'tim'],
    'Transporte & Combustível': ['uber', '99', 'gasolina', 'combustível', 'combustivel', 'etanol', 'posto', 'estacionamento', 'pedágio', 'pedagio', 'metrô', 'onibus', 'ônibus', 'passagem', 'ipva', 'mecânico'],
    'Saúde & Farmácia': ['farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico', 'consulta', 'dentista', 'exame', 'drogaria', 'hospital', 'psicólogo', 'vitamina'],
    'Lazer & Viagens': ['cinema', 'show', 'viagem', 'hotel', 'praia', 'bar', 'festa', 'passeio', 'churrasco', 'ingressos', 'parque'],
    'Educação & Cursos': ['curso', 'livro', 'faculdade', 'escola', 'mensalidade', 'apostila', 'workshop', 'aula'],
    'Compras & Vestuário': ['roupa', 'sapato', 'tênis', 'loja', 'shopee', 'shein', 'amazon', 'mercado livre', 'shopping'],
    'Assinaturas & Serviços': ['netflix', 'spotify', 'prime', 'hbo', 'disney', 'academia', 'smart fit', 'assinatura', 'youtube'],
    'Salário & Pro-labore': ['salário', 'salario', 'adiantamento', 'holerite', 'pro-labore', 'empresa', 'pagamento clt', 'quinzena'],
    'Freelance & Projetos': ['freelance', 'projeto', 'consultoria', 'cliente', 'serviço prestado', 'job'],
    'Rendimentos & Dividendos': ['dividendo', 'rendimento', 'juros', 'fii', 'ações', 'selic', 'cdi'],
  };

  for (const [catName, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matchedCategory = catName;
      break;
    }
  }

  // Fallback category if none matched directly
  if (!matchedCategory) {
    const defaultCat = categories.find(c => c.type === type);
    if (defaultCat) {
      matchedCategory = defaultCat.name;
    }
  }

  // 5. Clean Description
  // Remove currency numbers, "reais", "no pix", "no cartao" from the raw text to leave a neat description
  let cleanDesc = text
    .replace(/(?:r\$\s*|rs\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais|real|conto)?/gi, '')
    .replace(/\b(no\s+pix|pelo\s+pix|via\s+pix|no\s+crédito|no\s+credito|no\s+débito|no\s+debito|no\s+dinheiro|em\s+dinheiro|reais|real)\b/gi, '')
    .replace(/\b(você\s+pagou|compra\s+aprovada\s+em|pagamento\s+de|recebido\s+de|transferência\s+recebida\s+de)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  if (cleanDesc.length > 0) {
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  } else {
    cleanDesc = matchedCategory || (type === 'income' ? 'Receita' : 'Despesa');
  }

  return {
    amount,
    type,
    category: matchedCategory,
    paymentMethod,
    description: cleanDesc,
  };
}

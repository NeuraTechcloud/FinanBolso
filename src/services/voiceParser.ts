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
 * Portuguese spoken numbers to digit converter helper
 */
const SPOKEN_NUMBERS: Record<string, number> = {
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5,
  'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13,
  'quatorze': 14, 'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
  'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50, 'sessenta': 60, 'setenta': 70,
  'oitenta': 80, 'noventa': 90, 'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300,
  'quatrocentos': 400, 'quinhentos': 500, 'seiscentos': 600, 'setecentos': 700, 'oitocentos': 800,
  'novecentos': 900, 'mil': 1000
};

function extractAmountFromText(text: string): number | undefined {
  // 1. Direct regex for numeric digits like 120, 120,50, R$ 50, 50.00
  const moneyMatch = text.match(/(?:r\$\s*|rs\s*|valor:\s*|de\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real|conto|pau))?/i);
  if (moneyMatch && moneyMatch[1]) {
    const rawVal = moneyMatch[1].replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 2. Fallback: Parse spoken numbers like "cinquenta reais", "cem reais", "vinte e cinco"
  const words = text.toLowerCase().split(/\s+/);
  let total = 0;
  let currentWordVal = 0;
  let foundNumber = false;

  for (const w of words) {
    const cleanW = w.replace(/[^a-z0-9]/g, '');
    if (SPOKEN_NUMBERS[cleanW] !== undefined) {
      foundNumber = true;
      const val = SPOKEN_NUMBERS[cleanW];
      if (val === 1000) {
        total = (total || 1) * 1000;
      } else {
        total += val;
      }
    }
  }

  if (foundNumber && total > 0) {
    return total;
  }

  return undefined;
}

/**
 * Intelligent voice & receipt transcript parser with smart noise stripping
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
    lower.includes('receita') ||
    lower.includes('ganhei')
  ) {
    type = 'income';
  }

  // 2. Extract Amount
  const amount = extractAmountFromText(text);

  // 3. Detect Payment Method
  let paymentMethod: PaymentMethod | undefined;
  if (lower.includes('pix') || lower.includes('pelo pix') || lower.includes('via pix')) {
    paymentMethod = 'pix';
  } else if (lower.includes('débito') || lower.includes('debito') || lower.includes('cartão de débito') || lower.includes('cartao de debito')) {
    paymentMethod = 'debit_card';
  } else if (lower.includes('crédito') || lower.includes('credito') || lower.includes('cartão de crédito') || lower.includes('cartao de credito') || lower.includes('parcelado')) {
    paymentMethod = 'credit_card';
  } else if (lower.includes('boleto') || lower.includes('carnê') || lower.includes('carne') || lower.includes('fatura')) {
    paymentMethod = 'boleto';
  } else if (lower.includes('ticket') || lower.includes('vr') || lower.includes('va') || lower.includes('vale') || lower.includes('alelo') || lower.includes('sodexo')) {
    paymentMethod = 'ticket';
  } else if (lower.includes('dinheiro') || lower.includes('em espécie') || lower.includes('especie') || lower.includes('troco') || lower.includes('nota')) {
    paymentMethod = 'cash';
  } else if (lower.includes('ted') || lower.includes('doc') || lower.includes('transferência') || lower.includes('transferencia')) {
    paymentMethod = 'bank_transfer';
  }

  // 4. Match Category
  let matchedCategory: string | undefined;
  for (const cat of categories) {
    if (cat.keywords && cat.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      matchedCategory = cat.name;
      break;
    }
  }

  if (!matchedCategory) {
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
  }

  if (!matchedCategory) {
    const defaultCat = categories.find(c => c.type === type);
    if (defaultCat) {
      matchedCategory = defaultCat.name;
    }
  }

  // 5. Clean Description (Keep ONLY the account/merchant/item name)
  // Strips out payment action words, payment methods, numbers, and currency terms
  let cleanDesc = text
    // Remove numbers and currency words
    .replace(/(?:r\$\s*|rs\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais|real|conto|pau)?/gi, '')
    // Remove spoken number words
    .replace(/\b(um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|cem|cento|duzentos|trezentos|quinhentos|mil)\s+(reais|real|conto)\b/gi, '')
    // Remove payment action phrases
    .replace(/\b(pagamento\s+de|pagamento\s+da|pagamento\s+do|pagamento|paguei\s+a|paguei\s+o|paguei|conta\s+de|conta\s+da|conta\s+do|conta|compra\s+de|compra\s+da|compra\s+do|compra\s+no|compra\s+na|compra\s+em|compra|gastei\s+com|gastei\s+em|gastei|recebi\s+de|recebi\s+do|recebi\s+da|recebi|valor\s+de|valor)\b/gi, '')
    // Remove payment method phrases
    .replace(/\b(no\s+débito|no\s+debito|pelo\s+débito|pelo\s+debito|via\s+débito|via\s+debito|débito|debito|cartão\s+de\s+débito|cartao\s+de\s+debito|no\s+crédito|no\s+credito|pelo\s+crédito|pelo\s+credito|via\s+crédito|via\s+credito|crédito|credito|cartão\s+de\s+crédito|cartao\s+de\s+credito|no\s+pix|pelo\s+pix|via\s+pix|pix|em\s+dinheiro|no\s+dinheiro|dinheiro|no\s+boleto|via\s+boleto|boleto|no\s+ticket|no\s+vale|reais|real)\b/gi, '')
    .replace(/\b(você\s+pagou|compra\s+aprovada\s+em|recebido\s+de|transferência\s+recebida\s+de)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize clean description
  if (cleanDesc.length > 0) {
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  } else {
    cleanDesc = matchedCategory || (type === 'income' ? 'Receita' : 'Despesa');
  }

  // 6. Notes: Record full original voice input context
  const notes = `Lançamento por voz: "${text}"`;

  return {
    amount,
    type,
    category: matchedCategory,
    paymentMethod,
    description: cleanDesc,
    notes,
  };
}

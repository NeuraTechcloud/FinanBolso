import { Category, PaymentMethod, Transaction, TransactionType } from '../types/finance';

export interface ParsedBankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
  rawText?: string;
}

export interface BankStatementParseResult {
  success: boolean;
  bankName: string;
  format: 'OFX' | 'CSV' | 'TEXT';
  transactions: ParsedBankTransaction[];
  totalIncome: number;
  totalExpense: number;
  duplicatesCount: number;
  error?: string;
}

/**
 * Intelligent category matching based on Brazilian bank memo keywords
 */
export function autoCategorizeMemo(memo: string, type: TransactionType, categories: Category[]): string {
  const upper = memo.toUpperCase();

  // Find exact type categories first
  const validCategories = categories.filter(c => c.type === type);
  const findCat = (keywords: string[], fallbackName: string): string => {
    const matched = validCategories.find(c => 
      keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase()))
    );
    if (matched) return matched.name;
    const general = categories.find(c => 
      keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase()))
    );
    return general ? general.name : fallbackName;
  };

  if (type === 'income') {
    if (upper.includes('SALARIO') || upper.includes('SALÁRIO') || upper.includes('FOLHA') || upper.includes('REMUNERA') || upper.includes('PROVENTOS')) {
      return findCat(['Salário', 'Salario'], 'Salário Normal (Conta)');
    }
    if (upper.includes('REND') || upper.includes('DIVIDEND') || upper.includes('JUROS') || upper.includes('CDB') || upper.includes('INVEST') || upper.includes('APLICACAO')) {
      return findCat(['Rendimento', 'Investimento', 'Dividendos'], 'Rendimentos & Dividendos');
    }
    if (upper.includes('VR') || upper.includes('VA') || upper.includes('TICKET') || upper.includes('ALELO') || upper.includes('SODEXO') || upper.includes('BENEFICIO')) {
      return findCat(['Ticket', 'Benefício'], 'Ticket & Benefícios (VR/VA)');
    }
    if (upper.includes('FREELA') || upper.includes('PROJETO') || upper.includes('CLIENTE') || upper.includes('SERVICO') || upper.includes('SERVIÇO')) {
      return findCat(['Freelance', 'Projeto'], 'Freelance & Projetos');
    }
    return findCat(['Outras Entradas', 'Outros'], validCategories[0]?.name || 'Outras Entradas');
  }

  // Expenses
  if (upper.includes('IFOOD') || upper.includes('PADARIA') || upper.includes('MERCADO') || upper.includes('SUPERMERCADO') || 
      upper.includes('ACOUGUE') || upper.includes('AÇOUGUE') || upper.includes('BURGER') || upper.includes('RESTAURANTE') || 
      upper.includes('LANCHONETE') || upper.includes('PIZZARIA') || upper.includes('ATACADAO') || upper.includes('CARREFOUR') || 
      upper.includes('ASSAI') || upper.includes('PAO DE ACUCAR') || upper.includes('PAÇO')) {
    return findCat(['Alimentação', 'Alimentacao'], 'Alimentação');
  }

  if (upper.includes('UBER') || upper.includes('99APP') || upper.includes('POSTO') || upper.includes('GASOLINA') || 
      upper.includes('COMBUSTIVEL') || upper.includes('IPVA') || upper.includes('PEDAGIO') || upper.includes('ESTACIONAMENTO') || 
      upper.includes('AUTO') || upper.includes('SHELL') || upper.includes('IPIRANGA')) {
    return findCat(['Transporte', 'Combustível'], 'Transporte & Combustível');
  }

  if (upper.includes('FARMACIA') || upper.includes('FARMÁCIA') || upper.includes('DROGARIA') || upper.includes('DROGASIL') || 
      upper.includes('DROGA RAIA') || upper.includes('PAGUE MENOS') || upper.includes('HOSPITAL') || upper.includes('MEDICO') || 
      upper.includes('CONSULTA') || upper.includes('EXAME') || upper.includes('DENTISTA') || upper.includes('UNIMED')) {
    return findCat(['Saúde', 'Saude', 'Farmácia'], 'Saúde & Farmácia');
  }

  if (upper.includes('LUZ') || upper.includes('AGUA') || upper.includes('ÁGUA') || upper.includes('ENEL') || 
      upper.includes('CPFL') || upper.includes('SABESP') || upper.includes('CONDOMINIO') || upper.includes('CONDOMÍNIO') || 
      upper.includes('ALUGUEL') || upper.includes('INTERNET') || upper.includes('CLARO') || upper.includes('VIVO') || 
      upper.includes('TIM') || upper.includes('IPTU') || upper.includes('GAS') || upper.includes('GÁS')) {
    return findCat(['Moradia', 'Contas'], 'Moradia & Contas');
  }

  if (upper.includes('NETFLIX') || upper.includes('SPOTIFY') || upper.includes('CINEMA') || upper.includes('STEAM') || 
      upper.includes('PLAYSTATION') || upper.includes('PRIME VIDEO') || upper.includes('YOUTUBE') || upper.includes('SHOW') || 
      upper.includes('INGRESSO') || upper.includes('DISNEY') || upper.includes('BAR') || upper.includes('CHOPP')) {
    return findCat(['Lazer', 'Entretenimento'], 'Lazer & Entretenimento');
  }

  if (upper.includes('CURSO') || upper.includes('FACULDADE') || upper.includes('LIVRO') || upper.includes('UDEMY') || 
      upper.includes('ESCOLA') || upper.includes('ALURA') || upper.includes('COLÉGIO')) {
    return findCat(['Educação', 'Educacao', 'Cursos'], 'Educação & Cursos');
  }

  return findCat(['Outros Gastos', 'Outros'], validCategories[0]?.name || 'Outros Gastos');
}

/**
 * Detect Payment Method from bank transaction description
 */
export function detectPaymentMethod(memo: string): PaymentMethod {
  const upper = memo.toUpperCase();
  if (upper.includes('PIX')) return 'pix';
  if (upper.includes('CARTAO DE CREDITO') || upper.includes('COMPRA NO CREDITO') || upper.includes('FATURA')) return 'credit_card';
  if (upper.includes('CARTAO DE DEBITO') || upper.includes('COMPRA NO DEBITO') || upper.includes('DEBITO')) return 'debit_card';
  if (upper.includes('BOLETO') || upper.includes('TITULO') || upper.includes('COBRANCA') || upper.includes('CONVENIO')) return 'boleto';
  if (upper.includes('TED') || upper.includes('DOC') || upper.includes('TRANSF')) return 'bank_transfer';
  if (upper.includes('VR') || upper.includes('VA') || upper.includes('TICKET') || upper.includes('ALELO') || upper.includes('SODEXO')) return 'ticket';
  if (upper.includes('SAQUE') || upper.includes('ESPECIE') || upper.includes('DINHEIRO')) return 'cash';
  return 'other';
}

/**
 * Format string date into ISO YYYY-MM-DD
 */
function cleanIsoDate(raw: string): string {
  const trimmed = raw.trim();

  // Format: YYYYMMDD... (OFX standard, e.g. 20261027120000[-03:EST])
  if (/^\d{8}/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0');
    const m = brMatch[2].padStart(2, '0');
    const y = brMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fallback to today
  return new Date().toISOString().slice(0, 10);
}

/**
 * Clean Brazilian formatted number string into valid float
 * Handles "-1.250,50", "45,90", "-45.90", "R$ 150,00"
 */
function parseBrazilianNumber(valStr: string): number {
  if (!valStr) return 0;
  let clean = valStr.trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');

  const isNegative = clean.startsWith('-') || clean.endsWith('-') || (clean.startsWith('(') && clean.endsWith(')'));
  clean = clean.replace(/[\(\)\-]/g, '');

  // If contains both . and , (e.g. 1.250,50)
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Only comma (e.g. 45,90)
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
}

/**
 * Clean description text removing excessive bank prefixes and symbols
 */
function cleanDescription(raw: string): string {
  let text = raw
    .replace(/^COMPRA A VISTA\s*-\s*/i, '')
    .replace(/^COMPRA PARCELADA\s*-\s*/i, '')
    .replace(/^PAGTO ELETRON COBRANCA\s*/i, 'Boleto: ')
    .replace(/^PAGAMENTO DE BOLETO\s*/i, 'Boleto: ')
    .replace(/^PIX TRANSF\s*/i, 'Pix: ')
    .replace(/^PIX RECEBIDO\s*/i, 'Pix: ')
    .replace(/^TRANSFERENCIA PIX\s*/i, 'Pix: ')
    .replace(/^PAGAMENTO PIX\s*/i, 'Pix: ')
    .replace(/^COMPRA NO DEBITO\s*/i, '')
    .replace(/^COMPRA NO CREDITO\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If text is in all-caps, make title case for better readability
  if (text.length > 3 && text === text.toUpperCase()) {
    text = text.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
  }

  return text || 'Lançamento Bancário';
}

/**
 * Parse standard OFX files (SGML or XML)
 */
export function parseOFX(content: string, categories: Category[], existingTxs: Transaction[]): BankStatementParseResult {
  try {
    // Extract bank name if present
    let bankName = 'Extrato OFX';
    const orgMatch = content.match(/<ORG>(.*?)(?:<\/ORG>|\r?\n)/i);
    if (orgMatch && orgMatch[1]) {
      bankName = orgMatch[1].trim();
    } else {
      const fidMatch = content.match(/<FID>(.*?)(?:<\/FID>|\r?\n)/i);
      if (fidMatch && fidMatch[1]) bankName = `Banco (${fidMatch[1].trim()})`;
    }

    // Match each <STMTTRN> block
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    const rawBlocks: string[] = [];

    while ((match = trnRegex.exec(content)) !== null) {
      rawBlocks.push(match[1]);
    }

    // Fallback if unclosed tags (older SGML OFX)
    if (rawBlocks.length === 0) {
      const splitBlocks = content.split(/<STMTTRN>/i);
      if (splitBlocks.length > 1) {
        for (let i = 1; i < splitBlocks.length; i++) {
          const blockContent = splitBlocks[i].split(/<\/STMTTRN>|<STMTTRN>/i)[0];
          rawBlocks.push(blockContent);
        }
      }
    }

    const transactions: ParsedBankTransaction[] = [];

    rawBlocks.forEach((block, index) => {
      const typeMatch = block.match(/<TRNTYPE>(.*?)(?:<\/TRNTYPE>|\r?\n)/i);
      const dateMatch = block.match(/<DTPOSTED>(.*?)(?:<\/DTPOSTED>|\r?\n)/i);
      const amtMatch = block.match(/<TRNAMT>(.*?)(?:<\/TRNAMT>|\r?\n)/i);
      const memoMatch = block.match(/<MEMO>(.*?)(?:<\/MEMO>|\r?\n)/i);
      const nameMatch = block.match(/<NAME>(.*?)(?:<\/NAME>|\r?\n)/i);

      if (!amtMatch || !dateMatch) return;

      const rawAmt = parseFloat(amtMatch[1].trim().replace(',', '.'));
      if (isNaN(rawAmt)) return;

      const dateStr = cleanIsoDate(dateMatch[1]);
      const rawDesc = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Transação')).trim();
      const description = cleanDescription(rawDesc);

      // Determine type based on amount sign and TRNTYPE
      let type: TransactionType = rawAmt < 0 ? 'expense' : 'income';
      if (typeMatch) {
        const trnType = typeMatch[1].trim().toUpperCase();
        if (trnType === 'DEBIT') type = 'expense';
        if (trnType === 'CREDIT') type = 'income';
      }

      const positiveAmount = Math.abs(rawAmt);
      const category = autoCategorizeMemo(rawDesc, type, categories);
      const paymentMethod = detectPaymentMethod(rawDesc);

      // Deduplication check: same date and amount within +/- 0.01
      const isDuplicate = existingTxs.some(ex => {
        const dateMatch = ex.date === dateStr;
        const amountMatch = Math.abs(ex.amount - positiveAmount) < 0.01;
        const typeMatch = ex.type === type;
        return dateMatch && amountMatch && typeMatch;
      });

      transactions.push({
        id: `parsed-${Date.now()}-${index}`,
        date: dateStr,
        amount: positiveAmount,
        description,
        type,
        category,
        paymentMethod,
        isDuplicate,
        duplicateReason: isDuplicate ? 'Lançamento similar já existe na base' : undefined,
        selected: !isDuplicate, // uncheck duplicates by default
        rawText: block.replace(/\s+/g, ' ').slice(0, 100),
      });
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let duplicatesCount = 0;

    transactions.forEach(t => {
      if (t.isDuplicate) duplicatesCount++;
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    return {
      success: transactions.length > 0,
      bankName,
      format: 'OFX',
      transactions,
      totalIncome,
      totalExpense,
      duplicatesCount,
      error: transactions.length === 0 ? 'Nenhuma transação encontrada no arquivo OFX.' : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      bankName: 'OFX',
      format: 'OFX',
      transactions: [],
      totalIncome: 0,
      totalExpense: 0,
      duplicatesCount: 0,
      error: `Erro ao interpretar arquivo OFX: ${err.message || 'Arquivo corrompido'}`,
    };
  }
}

/**
 * Parse CSV Bank Statement (Nubank, Inter, Itaú, Bradesco, C6, etc.)
 */
export function parseCSV(content: string, categories: Category[], existingTxs: Transaction[]): BankStatementParseResult {
  try {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return {
        success: false,
        bankName: 'CSV',
        format: 'CSV',
        transactions: [],
        totalIncome: 0,
        totalExpense: 0,
        duplicatesCount: 0,
        error: 'Arquivo CSV vazio ou sem dados suficientes.',
      };
    }

    // Detect delimiter (; or , or \t)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && (firstLine.split(';').length >= firstLine.split(',').length)) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/["']/g, ''));

    // Find column indexes
    let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date') || h.includes('dt'));
    let amountIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('quantia'));
    let descIdx = headers.findIndex(h => h.includes('descri') || h.includes('memo') || h.includes('hist') || h.includes('identificador') || h.includes('título') || h.includes('estabelecimento'));
    let catIdx = headers.findIndex(h => h.includes('categoria') || h.includes('category'));

    // If headers didn't match standard names, try positional fallback
    if (dateIdx === -1) dateIdx = 0;
    if (amountIdx === -1) amountIdx = headers.length >= 2 ? 1 : -1;
    if (descIdx === -1) descIdx = headers.length >= 3 ? 2 : 1;

    // Detect Bank
    let bankName = 'Extrato CSV';
    if (content.toLowerCase().includes('nubank') || headers.includes('identificador')) {
      bankName = 'Nubank';
    } else if (content.toLowerCase().includes('inter')) {
      bankName = 'Banco Inter';
    } else if (content.toLowerCase().includes('itau') || content.toLowerCase().includes('itaú')) {
      bankName = 'Itaú Unibanco';
    } else if (content.toLowerCase().includes('bradesco')) {
      bankName = 'Bradesco';
    } else if (content.toLowerCase().includes('c6')) {
      bankName = 'C6 Bank';
    } else if (content.toLowerCase().includes('santander')) {
      bankName = 'Santander';
    }

    const transactions: ParsedBankTransaction[] = [];

    // Parse each line starting after header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Safe CSV split respecting quotes without risky regex
      const cells: string[] = [];
      let currentCell = '';
      let insideQuotes = '';
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          if (!insideQuotes) {
            insideQuotes = char;
          } else if (insideQuotes === char) {
            insideQuotes = '';
          } else {
            currentCell += char;
          }
        } else if (char === delimiter && !insideQuotes) {
          cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));

      if (cells.length < 2) continue;

      const rawDate = cells[dateIdx] || cells[0];
      const rawAmt = cells[amountIdx] || cells[1];
      const rawDesc = descIdx !== -1 && cells[descIdx] ? cells[descIdx] : (cells[2] || 'Lançamento');
      const rawCat = catIdx !== -1 && cells[catIdx] ? cells[catIdx] : null;

      if (!rawDate || !rawAmt) continue;

      const dateStr = cleanIsoDate(rawDate);
      const parsedNum = parseBrazilianNumber(rawAmt);
      if (parsedNum === 0 && !rawAmt.includes('0')) continue;

      // Determine income vs expense
      // In bank statements, negative values are expenses, positive values are income
      let type: TransactionType = parsedNum < 0 ? 'expense' : 'income';

      // Check if line indicates Entrada / Saída
      const lineUpper = line.toUpperCase();
      if (lineUpper.includes('ENTRADA') || lineUpper.includes('CRÉDITO') || lineUpper.includes('CREDITO')) {
        type = 'income';
      } else if (lineUpper.includes('SAÍDA') || lineUpper.includes('SAIDA') || lineUpper.includes('DÉBITO') || lineUpper.includes('DEBITO')) {
        type = 'expense';
      }

      const positiveAmount = Math.abs(parsedNum);
      const description = cleanDescription(rawDesc);
      const category = rawCat ? autoCategorizeMemo(rawCat, type, categories) : autoCategorizeMemo(rawDesc, type, categories);
      const paymentMethod = detectPaymentMethod(rawDesc);

      // Deduplication
      const isDuplicate = existingTxs.some(ex => {
        return ex.date === dateStr && Math.abs(ex.amount - positiveAmount) < 0.01 && ex.type === type;
      });

      transactions.push({
        id: `csv-${Date.now()}-${i}`,
        date: dateStr,
        amount: positiveAmount,
        description,
        type,
        category,
        paymentMethod,
        isDuplicate,
        duplicateReason: isDuplicate ? 'Lançamento similar já existe na base' : undefined,
        selected: !isDuplicate,
        rawText: line.slice(0, 80),
      });
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let duplicatesCount = 0;

    transactions.forEach(t => {
      if (t.isDuplicate) duplicatesCount++;
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    return {
      success: transactions.length > 0,
      bankName,
      format: 'CSV',
      transactions,
      totalIncome,
      totalExpense,
      duplicatesCount,
      error: transactions.length === 0 ? 'Nenhuma transação válida identificada nas colunas do CSV.' : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      bankName: 'CSV',
      format: 'CSV',
      transactions: [],
      totalIncome: 0,
      totalExpense: 0,
      duplicatesCount: 0,
      error: `Erro ao processar CSV: ${err.message || 'Formato não reconhecido'}`,
    };
  }
}

/**
 * Universal Entrypoint: Detects file type (OFX, CSV or plain text) and parses accordingly
 */
export function parseBankStatementFile(
  content: string, 
  filename: string, 
  categories: Category[], 
  existingTxs: Transaction[]
): BankStatementParseResult {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.pdf') || content.startsWith('%PDF')) {
    return {
      success: false,
      bankName: 'PDF',
      format: 'TEXT',
      transactions: [],
      totalIncome: 0,
      totalExpense: 0,
      duplicatesCount: 0,
      error: 'Arquivos PDF em formato de documento visual não são importados diretamente. Para importar extratos do Santander, utilize arquivos em formato .OFX ou use a aba "Colar Texto do Extrato" copiando e colando as linhas do extrato.',
    };
  }

  const isOfx = lowerName.endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>');
  if (isOfx) {
    return parseOFX(content, categories, existingTxs);
  }
  return parseCSV(content, categories, existingTxs);
}

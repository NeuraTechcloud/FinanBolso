import { Transaction, Category } from '../types/finance';

export type AIClusterType = 'priority_debts' | 'fixed_essential' | 'variable_lifestyle' | 'income_sources';

export interface AICluster {
  id: AIClusterType;
  title: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  items: Transaction[];
  totalAmount: number;
}

export interface AICategorySuggestion {
  transactionId: string;
  description: string;
  currentCategory: string;
  suggestedCategory: string;
  reason: string;
}

export interface AIOrganizationResult {
  clusters: AICluster[];
  categorySuggestions: AICategorySuggestion[];
  insights: {
    essentialRatioPercent: number;
    variableRatioPercent: number;
    debtRatioPercent: number;
    savingsPotentialEstimate: number;
    summaryText: string;
  };
  taggedTransactions: Map<string, string[]>; // transactionId -> tags
}

/**
 * Portable AI Organization & Classification Engine for Expenses & Income
 * Runs 100% client-side with 0 external API key dependencies (Vercel compliant)
 */
export function organizeTransactionsWithAI(
  transactions: Transaction[],
  categories: Category[]
): AIOrganizationResult {
  const priorityDebtsItems: Transaction[] = [];
  const fixedEssentialItems: Transaction[] = [];
  const variableLifestyleItems: Transaction[] = [];
  const incomeItems: Transaction[] = [];

  const categorySuggestions: AICategorySuggestion[] = [];
  const taggedMap = new Map<string, string[]>();

  let totalExpense = 0;
  let totalIncome = 0;
  let essentialTotal = 0;
  let variableTotal = 0;
  let debtTotal = 0;

  for (const t of transactions) {
    const descLower = t.description.toLowerCase();
    const catLower = t.category.toLowerCase();
    const tags: string[] = [];

    if (t.type === 'income') {
      incomeItems.push(t);
      totalIncome += t.amount;
      if (descLower.includes('dividendo') || descLower.includes('fii') || descLower.includes('rendimento')) {
        tags.push('Renda Passiva');
      } else {
        tags.push('Renda Ativa');
      }
      taggedMap.set(t.id, tags);
      continue;
    }

    totalExpense += t.amount;

    // Detect Priority 1 Debts & Cards
    const isDebtOrCard = 
      catLower.includes('cartão') || catLower.includes('cartao') || catLower.includes('banco') ||
      catLower.includes('empréstimo') || catLower.includes('emprestimo') || catLower.includes('financiamento') ||
      descLower.includes('fatura') || descLower.includes('cheque especial') || descLower.includes('juros') || descLower.includes('empréstimo');

    // Detect Fixed Essential Contas
    const isFixedEssential = 
      catLower.includes('moradia') || catLower.includes('contas') || catLower.includes('saúde') || catLower.includes('saude') ||
      catLower.includes('educação') || catLower.includes('educacao') || catLower.includes('transporte') ||
      descLower.includes('aluguel') || descLower.includes('condomínio') || descLower.includes('condominio') ||
      descLower.includes('luz') || descLower.includes('água') || descLower.includes('agua') || descLower.includes('gás') || descLower.includes('gas') ||
      descLower.includes('internet') || descLower.includes('iptu') || descLower.includes('faculdade') || descLower.includes('escola');

    if (isDebtOrCard) {
      priorityDebtsItems.push(t);
      debtTotal += t.amount;
      tags.push('Prioridade Alta');
      if (t.installmentsTotal && t.installmentsTotal > 1) {
        tags.push(`Parcela ${t.installmentNumber}/${t.installmentsTotal}`);
      }
    } else if (isFixedEssential) {
      fixedEssentialItems.push(t);
      essentialTotal += t.amount;
      tags.push('Essencial Fixo');
    } else {
      variableLifestyleItems.push(t);
      variableTotal += t.amount;
      tags.push('Variável Otimizável');
    }

    if (t.isRecurring) {
      tags.push('Recorrente');
    }

    taggedMap.set(t.id, tags);

    // AI Category Auto-Correction Check
    if (descLower.includes('ifood') || descLower.includes('mcdonalds') || descLower.includes('padaria') || descLower.includes('restaurante')) {
      if (!catLower.includes('alimentação') && !catLower.includes('alimentacao')) {
        categorySuggestions.push({
          transactionId: t.id,
          description: t.description,
          currentCategory: t.category,
          suggestedCategory: 'Alimentação',
          reason: 'Lançamento identificado como gasto alimentício.',
        });
      }
    } else if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('gasolina') || descLower.includes('posto')) {
      if (!catLower.includes('transporte') && !catLower.includes('combustível')) {
        categorySuggestions.push({
          transactionId: t.id,
          description: t.description,
          currentCategory: t.category,
          suggestedCategory: 'Transporte & Combustível',
          reason: 'Lançamento identificado como transporte ou mobilidade.',
        });
      }
    } else if (descLower.includes('farmácia') || descLower.includes('farmacia') || descLower.includes('drogaria')) {
      if (!catLower.includes('saúde') && !catLower.includes('farmácia')) {
        categorySuggestions.push({
          transactionId: t.id,
          description: t.description,
          currentCategory: t.category,
          suggestedCategory: 'Saúde & Farmácia',
          reason: 'Lançamento de saúde ou produtos farmacêuticos.',
        });
      }
    }
  }

  const essentialRatioPercent = totalExpense > 0 ? Math.round((essentialTotal / totalExpense) * 100) : 0;
  const variableRatioPercent = totalExpense > 0 ? Math.round((variableTotal / totalExpense) * 100) : 0;
  const debtRatioPercent = totalExpense > 0 ? Math.round((debtTotal / totalExpense) * 100) : 0;
  const savingsPotentialEstimate = Math.round(variableTotal * 0.15);

  let summaryText = 'Suas finanças estão equilibradas neste período.';
  if (debtRatioPercent > 35) {
    summaryText = `Atenção: ${debtRatioPercent}% das suas despesas estão concentradas em dívidas e cartões. Foque na quitação prioritária.`;
  } else if (variableRatioPercent > 45) {
    summaryText = `Você possui um potencial de economia estimado em R$ ${savingsPotentialEstimate} reduzindo 15% das despesas variáveis.`;
  } else if (essentialRatioPercent > 60) {
    summaryText = `Seus custos fixos essenciais comprometem ${essentialRatioPercent}% das despesas. Mantenha os custos essenciais sob controle.`;
  }

  const clusters: AICluster[] = [
    {
      id: 'priority_debts',
      title: 'Dívidas & Cartões (Prioridade Alta)',
      badge: 'Juros / Cartão',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      description: 'Débitos com potencial de juros ou vencimentos imediatos',
      items: priorityDebtsItems,
      totalAmount: debtTotal,
    },
    {
      id: 'fixed_essential',
      title: 'Contas Fixas & Essenciais',
      badge: 'Manutenção da Vida',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Moradia, serviços públicos, saúde e compromissos fixos',
      items: fixedEssentialItems,
      totalAmount: essentialTotal,
    },
    {
      id: 'variable_lifestyle',
      title: 'Despesas Variáveis & Otimizáveis',
      badge: 'Potencial de Economia',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      description: 'Alimentação fora, compras, lazer e estio de vida',
      items: variableLifestyleItems,
      totalAmount: variableTotal,
    },
    {
      id: 'income_sources',
      title: 'Entradas & Fontes de Renda',
      badge: 'Receitas',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      description: 'Salário, pro-labore, trabalhos extras e dividendos',
      items: incomeItems,
      totalAmount: totalIncome,
    },
  ];

  return {
    clusters,
    categorySuggestions,
    insights: {
      essentialRatioPercent,
      variableRatioPercent,
      debtRatioPercent,
      savingsPotentialEstimate,
      summaryText,
    },
    taggedTransactions: taggedMap,
  };
}

import { Transaction, Category } from '../types/finance';
import { formatBRL } from './exportService';

export interface FinancialTip {
  title: string;
  category: string;
  description: string;
  estimatedMonthlySavings: number;
  impact: 'Alto' | 'Médio' | 'Baixo';
}

export interface FinancialTipsResult {
  summaryText: string;
  totalPotentialSavings: number;
  tips: FinancialTip[];
}

/**
 * Generates personalized, deterministic financial tips directly in the client browser.
 * Works seamlessly offline, on static deployments like Vercel, and on mobile.
 */
export function generateFinancialTips(
  transactions: Transaction[],
  categories: Category[],
  _selectedMonth?: string
): FinancialTipsResult {
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const incomeTransactions = transactions.filter((t) => t.type === 'income');

  const totalExpense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const tips: FinancialTip[] = [];

  // Group expenses by category
  const expenseByCategory: Record<string, { total: number; count: number }> = {};
  for (const t of expenseTransactions) {
    if (!expenseByCategory[t.category]) {
      expenseByCategory[t.category] = { total: 0, count: 0 };
    }
    expenseByCategory[t.category].total += t.amount;
    expenseByCategory[t.category].count += 1;
  }

  const sortedCategories = Object.entries(expenseByCategory).sort(
    (a, b) => b[1].total - a[1].total
  );

  // 1. Tip on Top Spending Category
  if (sortedCategories.length > 0 && totalExpense > 0) {
    const [topCatName, topCatData] = sortedCategories[0];
    const percentage = Math.round((topCatData.total / totalExpense) * 100);

    if (percentage >= 25) {
      const suggestedSaving = Math.max(30, Math.round(topCatData.total * 0.12));
      tips.push({
        title: `Otimização em ${topCatName}`,
        category: 'Corte Estratégico',
        description: `A categoria "${topCatName}" representa ${percentage}% de todas as suas despesas (${formatBRL(
          topCatData.total
        )}). Uma redução de 12% nela pouparia ${formatBRL(suggestedSaving)} por mês sem sacrificar seu conforto.`,
        estimatedMonthlySavings: suggestedSaving,
        impact: 'Alto',
      });
    }
  }

  // 2. Tip on Net Balance & Budget Health
  if (totalIncome > 0) {
    const savingsRate = Math.round((netBalance / totalIncome) * 100);

    if (netBalance > 0 && savingsRate >= 15) {
      const suggestedInvestment = Math.round(netBalance * 0.4);
      tips.push({
        title: 'Aceleração da Reserva de Emergência',
        category: 'Patrimônio & Futuro',
        description: `Parabéns! Sua taxa de economia está em ${savingsRate}%. Destinar ${formatBRL(
          suggestedInvestment
        )} para investimentos de liquidez diária garante sua reserva financeira rapidamente.`,
        estimatedMonthlySavings: suggestedInvestment,
        impact: 'Alto',
      });
    } else if (netBalance > 0 && savingsRate < 15) {
      const targetSaving = Math.round(totalIncome * 0.15 - netBalance);
      tips.push({
        title: 'Meta de Poupança (Regra 50/30/20)',
        category: 'Reserva Financeira',
        description: `Seu saldo está positivo (${formatBRL(
          netBalance
        )}), mas poupar 15% a 20% da sua receita (${formatBRL(
          Math.round(totalIncome * 0.2)
        )}) é o recomendado. Ajuste pequenos supérfluos para poupar mais ${formatBRL(
          Math.max(50, targetSaving)
        )}.`,
        estimatedMonthlySavings: Math.max(50, targetSaving),
        impact: 'Médio',
      });
    } else if (netBalance < 0) {
      const deficit = Math.abs(netBalance);
      tips.push({
        title: 'Alerta de Equilíbrio Orçamentário',
        category: 'Segurança Financeira',
        description: `Suas despesas superaram suas receitas em ${formatBRL(
          deficit
        )}. Recomendamos revisar gastos com delivery e compras por impulso nos próximos 15 dias para evitar encargos.`,
        estimatedMonthlySavings: Math.round(deficit * 0.5) || 120,
        impact: 'Alto',
      });
    }
  }

  // 3. Micro-transactions (Efeito "Cafezinho" / Pequenas Despesas)
  const microExpenses = expenseTransactions.filter((t) => t.amount <= 35);
  if (microExpenses.length >= 3) {
    const microTotal = microExpenses.reduce((sum, t) => sum + t.amount, 0);
    const potentialSaving = Math.round(microTotal * 0.35);
    tips.push({
      title: 'Controle de Microgastos Diários',
      category: 'Hábitos Financeiros',
      description: `Identificamos ${microExpenses.length} pequenos lançamentos diários que totalizam ${formatBRL(
        microTotal
      )}. Pequenos lanches e despesas de rotina costumam ser invisíveis, mas somam centenas de reais no mês.`,
      estimatedMonthlySavings: Math.max(40, potentialSaving),
      impact: 'Médio',
    });
  }

  // 4. Installments & Recurring Commitments
  const recurringCount = expenseTransactions.filter(
    (t) => t.isRecurring || (t.installmentsTotal && t.installmentsTotal > 1)
  ).length;

  if (recurringCount >= 2) {
    tips.push({
      title: 'Auditoria de Assinaturas e Parcelas',
      category: 'Compromissos Fixos',
      description: `Você possui ${recurringCount} compromissos parcelados ou recorrentes registrados. Rever assinaturas que você usa pouco ou renegociar tarifas de serviços libera caixa imediato.`,
      estimatedMonthlySavings: 65,
      impact: 'Médio',
    });
  }

  // 5. Default starter tips if user has few transactions or to guarantee at least 3 rich tips
  if (tips.length < 3) {
    tips.push({
      title: 'Defina Tetos de Gastos por Categoria',
      category: 'Planejamento Orçamentário',
      description:
        'Acesse a aba "Metas" para definir tetos mensais nas categorias mais variáveis (Lazer, Alimentação, Compras). Ter um limite visual evita surpresas na fatura.',
      estimatedMonthlySavings: 110,
      impact: 'Médio',
    });
  }

  if (tips.length < 3) {
    tips.push({
      title: 'A Regra de Ouro: Pague-se Primeiro',
      category: 'Crescimento Financeiro',
      description:
        'Em vez de poupar o que sobra no final do mês, transfira uma quantia fixa para a sua reserva assim que seu salário ou receita entrar na conta.',
      estimatedMonthlySavings: 150,
      impact: 'Alto',
    });
  }

  if (tips.length < 3) {
    tips.push({
      title: 'Controle de Forma de Pagamento',
      category: 'Organização',
      description:
        'Concentre pequenos gastos no Débito ou Pix para ter a noção exata da saída de dinheiro no momento da compra, reservando o Crédito para itens planejados.',
      estimatedMonthlySavings: 75,
      impact: 'Baixo',
    });
  }

  const totalPotentialSavings = tips.reduce(
    (sum, t) => sum + (t.estimatedMonthlySavings || 0),
    0
  );

  let summaryText = '';
  if (totalIncome > 0 && netBalance >= 0) {
    summaryText = `Você está no caminho certo com saldo positivo neste mês! Implementando as sugestões abaixo, seu potencial de economia pode crescer ainda mais.`;
  } else if (totalExpense > 0 && netBalance < 0) {
    summaryText = `Identificamos oportunidades pontuais para ajustar suas despesas e recuperar o saldo positivo rapidamente.`;
  } else {
    summaryText = `Confira dicas práticas e inteligentes selecionadas para impulsionar sua organização financeira pessoal.`;
  }

  return {
    summaryText,
    totalPotentialSavings,
    tips: tips.slice(0, 4),
  };
}

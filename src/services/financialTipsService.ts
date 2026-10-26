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
 * Supports rotation/seeds so clicking "Atualizar" delivers fresh tips every time.
 */
export function generateFinancialTips(
  transactions: Transaction[],
  categories: Category[],
  _selectedMonth?: string,
  seed: number = 0
): FinancialTipsResult {
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const totalExpense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const candidateTips: FinancialTip[] = [];

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
    const suggestedSaving = Math.max(35, Math.round(topCatData.total * 0.12));
    candidateTips.push({
      title: `Otimização em ${topCatName}`,
      category: 'Corte Estratégico',
      description: `A categoria "${topCatName}" representa ${percentage}% dos seus gastos (${formatBRL(
        topCatData.total
      )}). Uma redução de 12% nela economizaria ${formatBRL(suggestedSaving)} por mês sem afetar sua rotina.`,
      estimatedMonthlySavings: suggestedSaving,
      impact: 'Alto',
    });
  }

  // 2. Tip on Second Top Category (if available)
  if (sortedCategories.length > 1 && totalExpense > 0) {
    const [secondCatName, secondCatData] = sortedCategories[1];
    const percentage = Math.round((secondCatData.total / totalExpense) * 100);
    const suggestedSaving = Math.max(25, Math.round(secondCatData.total * 0.1));
    candidateTips.push({
      title: `Revisão de Despesas em ${secondCatName}`,
      category: 'Ajuste Fino',
      description: `Sua 2ª maior despesa é "${secondCatName}" (${formatBRL(secondCatData.total)}, ${percentage}% do orçamento). Pequenas substituições inteligentes geram economia imediata.`,
      estimatedMonthlySavings: suggestedSaving,
      impact: 'Médio',
    });
  }

  // 3. Tip on Net Balance & Budget Health
  if (totalIncome > 0) {
    const savingsRate = Math.round((netBalance / totalIncome) * 100);
    if (netBalance > 0 && savingsRate >= 15) {
      const suggestedInvestment = Math.round(netBalance * 0.4);
      candidateTips.push({
        title: 'Aceleração de Reserva de Emergência',
        category: 'Patrimônio & Futuro',
        description: `Parabéns! Sua taxa de economia está em ${savingsRate}%. Aportar ${formatBRL(
          suggestedInvestment
        )} mensalmente em renda fixa de liquidez diária (CDB 100% CDI) consolida sua reserva com rendimento diário.`,
        estimatedMonthlySavings: suggestedInvestment,
        impact: 'Alto',
      });
    } else if (netBalance > 0 && savingsRate < 15) {
      const targetSaving = Math.round(totalIncome * 0.15 - netBalance);
      candidateTips.push({
        title: 'Meta de Poupança (Regra 50/30/20)',
        category: 'Reserva Financeira',
        description: `Seu saldo está positivo (${formatBRL(
          netBalance
        )}), mas o ideal é poupar de 15% a 20% da receita (${formatBRL(
          Math.round(totalIncome * 0.2)
        )}). Ajustar supérfluos libera mais ${formatBRL(
          Math.max(50, targetSaving)
        )} por mês.`,
        estimatedMonthlySavings: Math.max(50, targetSaving),
        impact: 'Médio',
      });
    } else if (netBalance < 0) {
      const deficit = Math.abs(netBalance);
      candidateTips.push({
        title: 'Alerta de Equilíbrio Orçamentário',
        category: 'Segurança Financeira',
        description: `Suas despesas superaram a receita em ${formatBRL(
          deficit
        )}. Recomendamos pausar compras não essenciais pelos próximos 15 dias para zerar o déficit sem gerar dívidas.`,
        estimatedMonthlySavings: Math.round(deficit * 0.5) || 120,
        impact: 'Alto',
      });
    }
  }

  // 4. Micro-transactions (Efeito "Cafezinho")
  const microExpenses = expenseTransactions.filter((t) => t.amount <= 35);
  if (microExpenses.length >= 2) {
    const microTotal = microExpenses.reduce((sum, t) => sum + t.amount, 0);
    const potentialSaving = Math.round(microTotal * 0.35);
    candidateTips.push({
      title: 'Controle do Efeito "Cafezinho"',
      category: 'Hábitos Financeiros',
      description: `Você possui ${microExpenses.length} lançamentos de pequeno valor somando ${formatBRL(
        microTotal
      )}. Pequenos gastos diários costumam passar despercebidos, mas acumulam um valor alto no mês.`,
      estimatedMonthlySavings: Math.max(45, potentialSaving),
      impact: 'Médio',
    });
  }

  // 5. Installments & Recurring Commitments
  const recurringCount = expenseTransactions.filter(
    (t) => t.isRecurring || (t.installmentsTotal && t.installmentsTotal > 1)
  ).length;
  if (recurringCount >= 1) {
    candidateTips.push({
      title: 'Auditoria de Assinaturas e Parcelas',
      category: 'Compromissos Fixos',
      description: `Identificamos ${recurringCount} compromissos parcelados ou recorrentes. Cancelar assinaturas que você usa pouco ou renegociar pacotes de TV/internet gera folga no orçamento.`,
      estimatedMonthlySavings: 70,
      impact: 'Médio',
    });
  }

  // 6. General Smart Tips Pool for Variety
  candidateTips.push({
    title: 'A Regra dos 3 Dias para Compras por Impulso',
    category: 'Comportamento & Consumo',
    description: 'Ao sentir vontade de comprar um item não planejado acima de R$ 100, aguarde 72 horas. Em 80% dos casos a urgência passa e você evita o gasto.',
    estimatedMonthlySavings: 140,
    impact: 'Alto',
  });

  candidateTips.push({
    title: 'Pague-se Primeiro no Início do Mês',
    category: 'Planejamento Orçamentário',
    description: 'Em vez de poupar o que sobra no final do mês, programe uma transferência para sua reserva assim que o salário cair na conta.',
    estimatedMonthlySavings: 180,
    impact: 'Alto',
  });

  candidateTips.push({
    title: 'Otimização de Compras de Supermercado',
    category: 'Alimentação & Rotina',
    description: 'Fazer compras com lista fechada e evitar o mercado com fome reduz impulsos em até 20%. Dê preferência a marcas próprias de boa qualidade.',
    estimatedMonthlySavings: 120,
    impact: 'Médio',
  });

  candidateTips.push({
    title: 'Isenção e Renegociação de Tarifas Bancárias',
    category: 'Bancos & Cartões',
    description: 'A maioria das contas possui pacotes essenciais gratuitos pelo Banco Central. Solicite o cancelamento de tarifas de manutenção de conta ou anuidade de cartão.',
    estimatedMonthlySavings: 50,
    impact: 'Médio',
  });

  candidateTips.push({
    title: 'Definição de Tetos de Gastos por Categoria',
    category: 'Metas Visuais',
    description: 'Acesse a aba "Metas" para estabelecer um limite visual mensal nas categorias de Lazer e Compras, ativando alertas antes de estourar o orçamento.',
    estimatedMonthlySavings: 95,
    impact: 'Médio',
  });

  candidateTips.push({
    title: 'Centralização de Compras no PIX para Desconto',
    category: 'Estratégia de Pagamento',
    description: 'Sempre pergunte por desconto para pagamento via PIX ou dinheiro em lojas físicas e serviços. A margem de negociação costuma ser de 5% a 10%.',
    estimatedMonthlySavings: 85,
    impact: 'Baixo',
  });

  candidateTips.push({
    title: 'Construção do Fundo de Imprevistos do Lar',
    category: 'Prevenção',
    description: 'Separe uma pequena parcela mensal para eventuais consertos de eletrodomésticos ou veículo, evitando surpresas que estourem o cartão de crédito.',
    estimatedMonthlySavings: 110,
    impact: 'Médio',
  });

  // Deduplicate tips by title
  const uniqueTipsMap = new Map<string, FinancialTip>();
  for (const t of candidateTips) {
    if (!uniqueTipsMap.has(t.title)) {
      uniqueTipsMap.set(t.title, t);
    }
  }
  const allTips = Array.from(uniqueTipsMap.values());

  // Rotate tips pool using seed so clicking "Atualizar" changes the visible selection
  const shiftIndex = (seed * 3) % allTips.length;
  const rotatedTips = [...allTips.slice(shiftIndex), ...allTips.slice(0, shiftIndex)];

  // Select 5 distinct tips for the active carousel
  const selectedTips = rotatedTips.slice(0, 5);

  const totalPotentialSavings = selectedTips.reduce(
    (sum, t) => sum + (t.estimatedMonthlySavings || 0),
    0
  );

  let summaryText = '';
  if (totalIncome > 0 && netBalance >= 0) {
    summaryText = `Você está com saldo positivo neste mês! Implementando as sugestões abaixo, seu potencial de economia cresce ainda mais.`;
  } else if (totalExpense > 0 && netBalance < 0) {
    summaryText = `Identificamos oportunidades práticas para conter gastos e recuperar o saldo positivo rapidamente.`;
  } else {
    summaryText = `Confira sugestões práticas e inteligentes selecionadas para impulsionar sua organização financeira pessoal.`;
  }

  return {
    summaryText,
    totalPotentialSavings,
    tips: selectedTips,
  };
}

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Category, PAYMENT_METHOD_LABELS } from '../types/finance';

// Helper to format currency in Brazilian Real
export const formatBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY
export const formatDateBR = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

export const ExportService = {
  /**
   * Export transactions to Microsoft Excel (.xlsx) file
   */
  exportToExcel(
    transactions: Transaction[], 
    categories: Category[], 
    options?: { monthFilter?: string; title?: string }
  ) {
    // 1. Filter if month is provided
    let list = [...transactions];
    if (options?.monthFilter && options.monthFilter !== 'all') {
      list = list.filter(t => t.date.startsWith(options.monthFilter!));
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Prepare Sheet 1: Transações
    const txSheetData = list.length > 0 
      ? list.map((t, index) => ({
          'Item': index + 1,
          'Data': formatDateBR(t.date),
          'Tipo': t.type === 'income' ? 'Receita (+)' : 'Despesa (-)',
          'Categoria': t.category,
          'Descrição': t.description,
          'Forma de Pagamento': PAYMENT_METHOD_LABELS[t.paymentMethod]?.label || t.paymentMethod,
          'Valor (R$)': t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
          'Observações': t.notes || '',
        }))
      : [{
          'Item': 1,
          'Data': formatDateBR(new Date().toISOString().slice(0, 10)),
          'Tipo': 'Informativo',
          'Categoria': 'Geral',
          'Descrição': 'Nenhum lançamento registrado neste período',
          'Forma de Pagamento': '-',
          'Valor (R$)': 0,
          'Observações': 'Base pronta para receber lançamentos',
        }];

    // 3. Prepare Sheet 2: Resumo por Categoria
    const expenseByCategory: Record<string, { count: number; total: number }> = {};
    let totalExpenses = 0;
    let totalIncomes = 0;

    list.forEach(t => {
      if (t.type === 'expense') {
        totalExpenses += t.amount;
        if (!expenseByCategory[t.category]) {
          expenseByCategory[t.category] = { count: 0, total: 0 };
        }
        expenseByCategory[t.category].count += 1;
        expenseByCategory[t.category].total += t.amount;
      } else {
        totalIncomes += t.amount;
      }
    });

    const categorySheetData = Object.entries(expenseByCategory)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([catName, stats]) => ({
        'Categoria de Despesa': catName,
        'Quantidade': stats.count,
        'Total Gasto (R$)': stats.total,
        '% do Total de Despesas': totalExpenses > 0 ? `${((stats.total / totalExpenses) * 100).toFixed(1)}%` : '0%',
      }));

    // 4. Prepare Sheet 3: Indicadores Gerais
    const indicatorsData = [
      { 'Indicador': 'Total de Receitas (+)', 'Valor (R$)': totalIncomes },
      { 'Indicador': 'Total de Despesas (-)', 'Valor (R$)': totalExpenses },
      { 'Indicador': 'Saldo Líquido', 'Valor (R$)': totalIncomes - totalExpenses },
      { 
        'Indicador': 'Taxa de Poupança', 
        'Valor (R$)': totalIncomes > 0 
          ? `${(((totalIncomes - totalExpenses) / totalIncomes) * 100).toFixed(1)}%` 
          : '0%' 
      },
      { 'Indicador': 'Total de Lançamentos', 'Valor (R$)': list.length },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    const wsTransactions = XLSX.utils.json_to_sheet(txSheetData);
    const wsCategories = XLSX.utils.json_to_sheet(categorySheetData);
    const wsIndicators = XLSX.utils.json_to_sheet(indicatorsData);

    // Auto-fit column widths
    const setColWidths = (ws: XLSX.WorkSheet, data: any[]) => {
      if (!data || data.length === 0) return;
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(k => ({
        wch: Math.max(k.length + 3, ...data.map(r => String(r[k] || '').length + 2))
      }));
    };

    setColWidths(wsTransactions, txSheetData);
    setColWidths(wsCategories, categorySheetData);
    setColWidths(wsIndicators, indicatorsData);

    // Append sheets
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Lançamentos');
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Gastos por Categoria');
    XLSX.utils.book_append_sheet(wb, wsIndicators, 'Resumo Geral');

    // Filename
    const periodLabel = options?.monthFilter && options.monthFilter !== 'all' 
      ? `_${options.monthFilter}` 
      : `_geral_${new Date().toISOString().slice(0, 10)}`;
    const filename = `BolsoZen_Relatorio${periodLabel}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  },

  /**
   * Export styled executive financial statement report to PDF
   */
  exportToPDF(
    transactions: Transaction[], 
    categories: Category[], 
    options?: { monthFilter?: string; periodLabel?: string }
  ) {
    let list = [...transactions];
    if (options?.monthFilter && options.monthFilter !== 'all') {
      list = list.filter(t => t.date.startsWith(options.monthFilter!));
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let totalIncome = 0;
    let totalExpense = 0;
    const catExpenses: Record<string, number> = {};

    list.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0';

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Header Banner (Emerald Gradient-like Deep Green)
    doc.setFillColor(5, 150, 105); // #059669
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Title & Brand
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('BolsoZen - Relatório Financeiro', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const scope = options?.periodLabel || (options?.monthFilter && options.monthFilter !== 'all' ? `Competência: ${options.monthFilter}` : 'Período Completo');
    doc.text(`Gestão Financeira & Nuvem Segura  •  ${scope}`, 14, 21);

    const emissionDate = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    doc.text(`Emitido em: ${emissionDate}`, pageWidth - 14, 21, { align: 'right' });

    // 2. Summary KPI Cards
    const startY = 36;
    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 22;

    const cards = [
      { label: 'Receitas Totais', val: formatBRL(totalIncome), color: [16, 185, 129] },
      { label: 'Despesas Totais', val: formatBRL(totalExpense), color: [239, 68, 68] },
      { label: 'Saldo Líquido', val: formatBRL(netBalance), color: netBalance >= 0 ? [5, 150, 105] : [225, 29, 72] },
      { label: 'Taxa Poupança', val: `${savingsRate}%`, color: [139, 92, 246] },
    ];

    cards.forEach((c, idx) => {
      const x = 14 + idx * (cardWidth + 3);
      // Box background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');

      // Top colored bar
      doc.setFillColor(c.color[0], c.color[1], c.color[2]);
      doc.rect(x, startY, cardWidth, 2, 'F');

      // Label
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(c.label, x + cardWidth / 2, startY + 8, { align: 'center' });

      // Value
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(c.val, x + cardWidth / 2, startY + 16, { align: 'center' });
    });

    // 3. Top Categorias de Gastos (mini summary table)
    let currentY = startY + cardHeight + 8;
    const sortedCats = Object.entries(catExpenses).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length > 0) {
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Distribuição dos Maiores Gastos:', 14, currentY);
      currentY += 4;

      const topCatRows = sortedCats.slice(0, 6).map(([cat, total]) => {
        const pct = totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) + '%' : '0%';
        return [cat, formatBRL(total), pct];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        head: [['Categoria', 'Total Gasto', '% do Total']],
        body: topCatRows,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 50, halign: 'right' },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 4. Detalhamento de Todas as Transações
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Detalhamento dos Lançamentos (${list.length} registros):`, 14, currentY);
    currentY += 4;

    const tableRows = list.length > 0 
      ? list.map(t => {
          const method = PAYMENT_METHOD_LABELS[t.paymentMethod]?.label || t.paymentMethod;
          const typeLabel = t.type === 'income' ? 'Receita (+)' : 'Despesa (-)';
          const formattedAmount = (t.type === 'income' ? '+ ' : '- ') + formatBRL(t.amount);
          return [
            formatDateBR(t.date),
            typeLabel,
            t.category,
            t.description + (t.notes ? ` (${t.notes})` : ''),
            method,
            formattedAmount,
          ];
        })
      : [
          [
            formatDateBR(new Date().toISOString().slice(0, 10)),
            '-',
            'Geral',
            'Nenhum lançamento no período selecionado',
            '-',
            'R$ 0,00'
          ]
        ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14, bottom: 20 },
      head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Pagamento', 'Valor']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 55 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Color code income vs expense in value column
        if (data.section === 'body' && data.column.index === 5) {
          const text = String(data.cell.raw);
          if (text.startsWith('+')) {
            data.cell.styles.textColor = [5, 150, 105];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
        const currentPage = data.pageNumber;

        doc.setFillColor(241, 245, 249);
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          'BolsoZen • Gestão Financeira Inteligente & Nuvem Segura', 
          14, 
          pageHeight - 4.5
        );
        doc.text(
          `Página ${currentPage} de ${pageCount}`, 
          pageWidth - 14, 
          pageHeight - 4.5, 
          { align: 'right' }
        );
      }
    });

    const periodSuffix = options?.monthFilter && options.monthFilter !== 'all' 
      ? `_${options.monthFilter}` 
      : `_completo_${new Date().toISOString().slice(0, 10)}`;
    const filename = `BolsoZen_Extrato${periodSuffix}.pdf`;

    doc.save(filename);
  }
};

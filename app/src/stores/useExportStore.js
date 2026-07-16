/**
 * useExportStore – .docx & .xlsx export with optional AI enhancement
 */
import { create } from 'zustand'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

const useExportStore = create((set) => ({
  isExporting: false,
  exportError: null,

  /**
   * Export journal entries to .docx
   * @param {Array} entries – journal entries
   * @param {object} opts – { aiEnhance: boolean, summarizeText: fn|null }
   */
  exportJournalDocx: async (entries, opts = {}) => {
    set({ isExporting: true, exportError: null })
    try {
      const children = []

      // Title page
      children.push(
        new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: 'Everkeep — Journal Entries', bold: true, size: 48, font: 'Calibri' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: `Exported on ${new Date().toLocaleDateString()}`, size: 22, color: '666666', font: 'Calibri' })] }),
      )

      for (const entry of entries) {
        // Entry title
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 100 }, children: [new TextRun({ text: entry.title, bold: true, size: 28, font: 'Calibri' })] }))

        // Date & tags
        const meta = `${entry.date} at ${entry.time || '—'} · Tags: ${entry.tags?.join(', ') || 'none'}`
        children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: meta, size: 20, color: '888888', font: 'Calibri', italics: true })] }))

        // Content paragraphs
        const paragraphs = entry.content.split('\n').filter(Boolean)
        for (const p of paragraphs) {
          children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: p, size: 22, font: 'Calibri' })] }))
        }

        // AI summary if enabled
        if (opts.aiEnhance && opts.summarizeText) {
          try {
            const summary = await opts.summarizeText(entry.content)
            if (summary) {
              children.push(
                new Paragraph({ spacing: { before: 200, after: 40 }, children: [new TextRun({ text: '✦ AI Summary', bold: true, size: 20, color: '6366f1', font: 'Calibri' })] }),
                new Paragraph({
                  spacing: { after: 200 },
                  border: { left: { style: BorderStyle.SINGLE, size: 6, color: '6366f1', space: 8 } },
                  children: [new TextRun({ text: summary, size: 20, color: '555555', font: 'Calibri', italics: true })],
                }),
              )
            }
          } catch (err) { console.warn('AI enhancement skipped for entry:', err.message) }
        }

        // Separator
        children.push(new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: '—'.repeat(40), color: 'cccccc', size: 18 })] }))
      }

      const doc = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(doc)
      saveAs(blob, `Everkeep_Journal_${new Date().toISOString().slice(0, 10)}.docx`)
      set({ isExporting: false })
    } catch (err) {
      set({ isExporting: false, exportError: err.message })
    }
  },

  /**
   * Export finance data to .xlsx
   * @param {Array} transactions – finance transactions
   * @param {string} currency – currency symbol
   * @param {object} opts – { aiEnhance: boolean, summarizeText: fn|null }
   */
  exportFinanceXlsx: async (transactions, currency = '₱', opts = {}) => {
    set({ isExporting: true, exportError: null })
    try {
      // Main transactions sheet
      const txRows = transactions.map((tx) => ({
        Date: tx.date,
        Type: tx.type,
        Category: tx.category,
        Description: tx.description,
        Amount: tx.amount,
        Currency: currency,
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(txRows)

      // Column widths
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 8 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

      // Summary sheet
      const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      const summaryData = [
        { Metric: 'Total Income', Value: income },
        { Metric: 'Total Expenses', Value: expense },
        { Metric: 'Balance', Value: income - expense },
        { Metric: 'Total Transactions', Value: transactions.length },
        { Metric: 'Export Date', Value: new Date().toLocaleDateString() },
      ]
      const summaryWs = XLSX.utils.json_to_sheet(summaryData)
      summaryWs['!cols'] = [{ wch: 20 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

      // Category breakdown sheet
      const catMap = {}
      transactions.forEach((tx) => {
        const key = `${tx.type}:${tx.category}`
        catMap[key] = (catMap[key] || 0) + tx.amount
      })
      const catRows = Object.entries(catMap).map(([key, total]) => {
        const [type, category] = key.split(':')
        return { Type: type, Category: category, Total: total }
      }).sort((a, b) => b.Total - a.Total)
      const catWs = XLSX.utils.json_to_sheet(catRows)
      catWs['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, catWs, 'By Category')

      // AI Insights sheet (if enabled)
      if (opts.aiEnhance && opts.summarizeText) {
        try {
          const prompt = `Analyze these finance transactions and provide insights:\n` +
            `Income: ${currency}${income}, Expenses: ${currency}${expense}, Balance: ${currency}${income - expense}\n` +
            `Top categories: ${catRows.slice(0, 5).map((c) => `${c.Category} (${currency}${c.Total})`).join(', ')}\n` +
            `Total transactions: ${transactions.length}`
          const insights = await opts.summarizeText(prompt)
          if (insights) {
            const aiWs = XLSX.utils.aoa_to_sheet([
              ['AI Financial Insights'],
              [''],
              ...insights.split('\n').map((line) => [line]),
              [''],
              [`Generated on ${new Date().toLocaleString()}`],
            ])
            aiWs['!cols'] = [{ wch: 80 }]
            XLSX.utils.book_append_sheet(wb, aiWs, 'AI Insights')
          }
        } catch (err) { console.warn('AI finance insights skipped:', err.message) }
      }

      XLSX.writeFile(wb, `Everkeep_Finance_${new Date().toISOString().slice(0, 10)}.xlsx`)
      set({ isExporting: false })
    } catch (err) {
      set({ isExporting: false, exportError: err.message })
    }
  },

  /**
   * Export journal entries to .xlsx (table format)
   */
  exportJournalXlsx: async (entries) => {
    set({ isExporting: true, exportError: null })
    try {
      const rows = entries.map((e) => ({
        Date: e.date,
        Time: e.time || '',
        Title: e.title,
        Tags: e.tags?.join(', ') || '',
        Content: e.content,
        'Word Count': e.content?.split(/\s+/).length || 0,
      }))
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 24 }, { wch: 60 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Journal Entries')
      XLSX.writeFile(wb, `Everkeep_Journal_${new Date().toISOString().slice(0, 10)}.xlsx`)
      set({ isExporting: false })
    } catch (err) {
      set({ isExporting: false, exportError: err.message })
    }
  },
}))

export default useExportStore

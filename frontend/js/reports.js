let _cachedDashboard = null;

async function getDashboardData() {
    if (_cachedDashboard) return _cachedDashboard;
    const resp = await fetch('/api/dashboard');
    _cachedDashboard = await resp.json();
    return _cachedDashboard;
}

function getDateRange() {
    const sel = document.getElementById('reportDateRange').value;
    if (sel === 'custom') {
        const from = document.getElementById('reportDateFrom').value;
        const to = document.getElementById('reportDateTo').value;
        if (!from || !to) { alert('Please select both dates'); return null; }
        return { from: new Date(from), to: new Date(to), label: `${from} to ${to}` };
    }
    const days = parseInt(sel);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const labels = { 30: 'Last 30 Days', 60: 'Last 2 Months', 90: 'Last 3 Months', 180: 'Last 6 Months', 365: 'Last Year' };
    return { from, to, label: labels[days] };
}

function toggleCustomDate() {
    const row = document.getElementById('customDateRow');
    row.style.display = document.getElementById('reportDateRange').value === 'custom' ? 'flex' : 'none';
}

function filterByDate(transactions, range) {
    return transactions.filter(t => {
        const d = new Date(t.date);
        return d >= range.from && d <= range.to;
    });
}

function createPDF(title, dateLabel) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(0, 48, 135);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PayFlow AI', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Aberdeen Chiropractic Clinic — Financial Report', 14, 24);
    doc.text(dateLabel, 14, 30);
    doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), 196, 30, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 45);

    return doc;
}

function fmt(n) {
    const sign = n < 0 ? '-' : '';
    return sign + '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function downloadPDF(type) {
    const range = getDateRange();
    if (!range) return;

    const data = await getDashboardData();
    const txns = filterByDate(data.transactions, range);

    if (type === 'transactions') return generateTransactionsPDF(txns, range, data);
    if (type === 'categories') return generateCategoriesPDF(txns, range, data);
    if (type === 'income-expenses') return generateIncomeExpensePDF(txns, range, data);
    if (type === 'insights') return generateInsightsPDF(txns, range, data);
    if (type === 'brain') return generateBrainPDF(range);
    if (type === 'full') return generateFullPDF(txns, range, data);
}

function generateTransactionsPDF(txns, range, data) {
    const doc = createPDF('Transaction Report', range.label);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Transactions: ${txns.length}`, 14, 53);

    const rows = txns.map(t => [
        new Date(t.date).toLocaleDateString('en-GB'),
        t.name,
        t.ai_category || 'Other',
        fmt(t.amount)
    ]);

    doc.autoTable({
        startY: 58,
        head: [['Date', 'Description', 'Category', 'Amount']],
        body: rows,
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 9 },
        columnStyles: { 3: { halign: 'right' } }
    });

    doc.save(`PayFlow_Transactions_${range.label.replace(/\s/g, '_')}.pdf`);
}

function generateCategoriesPDF(txns, range, data) {
    const doc = createPDF('Spending by Category', range.label);

    const cats = {};
    txns.forEach(t => {
        if (t.amount < 0) {
            const c = t.ai_category || 'Other';
            cats[c] = (cats[c] || 0) + Math.abs(t.amount);
        }
    });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const totalExp = sorted.reduce((s, [, v]) => s + v, 0);

    const rows = sorted.map(([cat, val]) => [
        cat,
        fmt(val),
        totalExp > 0 ? (val / totalExp * 100).toFixed(1) + '%' : '0%'
    ]);

    doc.autoTable({
        startY: 52,
        head: [['Category', 'Amount', '% of Total']],
        body: rows,
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        foot: [['Total Expenses', fmt(totalExp), '100%']],
        footStyles: { fillColor: [0, 48, 135], textColor: 255, fontStyle: 'bold' }
    });

    doc.save(`PayFlow_Categories_${range.label.replace(/\s/g, '_')}.pdf`);
}

function generateIncomeExpensePDF(txns, range, data) {
    const doc = createPDF('Income vs Expenses', range.label);

    const income = txns.filter(t => t.amount > 0);
    const expenses = txns.filter(t => t.amount < 0);
    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const totalExp = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const net = totalInc - totalExp;

    let y = 52;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    doc.autoTable({
        startY: y,
        head: [['Metric', 'Value']],
        body: [
            ['Total Income', fmt(totalInc)],
            ['Total Expenses', fmt(totalExp)],
            ['Net Cash Flow', fmt(net)],
            ['Income Transactions', income.length.toString()],
            ['Expense Transactions', expenses.length.toString()],
        ],
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } }
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Income Breakdown', 14, y);

    const incCats = {};
    income.forEach(t => {
        const c = t.ai_category || 'Other';
        incCats[c] = (incCats[c] || 0) + t.amount;
    });

    doc.autoTable({
        startY: y + 4,
        head: [['Source', 'Amount']],
        body: Object.entries(incCats).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, fmt(v)]),
        headStyles: { fillColor: [0, 200, 83], textColor: 255 },
        alternateRowStyles: { fillColor: [235, 255, 240] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } }
    });

    y = doc.lastAutoTable.finalY + 12;
    doc.text('Expense Breakdown', 14, y);

    const expCats = {};
    expenses.forEach(t => {
        const c = t.ai_category || 'Other';
        expCats[c] = (expCats[c] || 0) + Math.abs(t.amount);
    });

    doc.autoTable({
        startY: y + 4,
        head: [['Category', 'Amount']],
        body: Object.entries(expCats).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, fmt(v)]),
        headStyles: { fillColor: [255, 82, 82], textColor: 255 },
        alternateRowStyles: { fillColor: [255, 240, 240] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } }
    });

    doc.save(`PayFlow_IncomeVsExpenses_${range.label.replace(/\s/g, '_')}.pdf`);
}

function generateInsightsPDF(txns, range, data) {
    const doc = createPDF('AI Insights Report', range.label);

    let y = 52;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const insights = data.insights;

    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    const lines = doc.splitTextToSize(insights.summary, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;

    if (insights.alerts && insights.alerts.length) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 82, 82);
        doc.text('Alerts', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        y += 6;
        insights.alerts.forEach(a => {
            const al = doc.splitTextToSize('• ' + a, 180);
            doc.text(al, 14, y);
            y += al.length * 5 + 3;
        });
        y += 4;
    }

    if (insights.forecast) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 150, 60);
        doc.text('Forecast', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        y += 6;
        const fl = doc.splitTextToSize(insights.forecast, 180);
        doc.text(fl, 14, y);
        y += fl.length * 5 + 8;
    }

    if (insights.top_saving) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 112, 186);
        doc.text('Top Saving Opportunity', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        y += 6;
        const sl = doc.splitTextToSize(insights.top_saving, 180);
        doc.text(sl, 14, y);
        y += sl.length * 5 + 8;
    }

    doc.autoTable({
        startY: y + 4,
        head: [['Metric', 'Value']],
        body: [
            ['Balance', fmt(data.balance)],
            ['Income (Period)', fmt(data.total_income)],
            ['Expenses (Period)', fmt(data.total_expenses)],
            ['Net Flow', fmt(data.net_flow)],
            ['Transactions', data.transaction_count.toString()],
        ],
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } }
    });

    doc.save(`PayFlow_AIInsights_${range.label.replace(/\s/g, '_')}.pdf`);
}

function generateBrainPDF(range) {
    const doc = createPDF('PayFlow Brain — Chat History', range.label);

    const msgs = document.querySelectorAll('#brainChat .brain-msg');
    if (!msgs.length) {
        doc.setFontSize(11);
        doc.text('No Brain conversations yet. Ask PayFlow Brain a question first!', 14, 55);
        doc.save('PayFlow_BrainChat.pdf');
        return;
    }

    const rows = [];
    msgs.forEach(m => {
        const isUser = m.classList.contains('user');
        rows.push([isUser ? 'You' : 'PayFlow Brain', m.textContent.trim()]);
    });

    doc.autoTable({
        startY: 52,
        head: [['Speaker', 'Message']],
        body: rows,
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        styles: { fontSize: 9, cellWidth: 'wrap' },
        columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' }, 1: { cellWidth: 155 } }
    });

    doc.save('PayFlow_BrainChat.pdf');
}

async function generateFullPDF(txns, range, data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cover page
    doc.setFillColor(0, 48, 135);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text('PayFlow AI', 105, 80, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Full Financial Report', 105, 100, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Aberdeen Chiropractic Clinic', 105, 120, { align: 'center' });
    doc.text(range.label, 105, 135, { align: 'center' });
    doc.text('Generated: ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), 105, 150, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Powered by PayPal API + Gemini AI', 105, 270, { align: 'center' });

    // Page 2 — Summary
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(0, 48, 135);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('PayFlow AI — Full Report', 14, 8);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, 25);

    const income = txns.filter(t => t.amount > 0);
    const expenses = txns.filter(t => t.amount < 0);
    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const totalExp = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

    doc.autoTable({
        startY: 30,
        head: [['Metric', 'Value']],
        body: [
            ['Current Balance', fmt(data.balance)],
            ['Total Income', fmt(totalInc)],
            ['Total Expenses', fmt(totalExp)],
            ['Net Cash Flow', fmt(totalInc - totalExp)],
            ['Total Transactions', txns.length.toString()],
        ],
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        styles: { fontSize: 11 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    // AI Insights
    let y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Insights', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const sLines = doc.splitTextToSize(data.insights.summary, 180);
    doc.text(sLines, 14, y);
    y += sLines.length * 5 + 4;
    if (data.insights.alerts) {
        data.insights.alerts.forEach(a => {
            const al = doc.splitTextToSize('⚠ ' + a, 180);
            doc.setTextColor(200, 50, 50);
            doc.text(al, 14, y);
            doc.setTextColor(0, 0, 0);
            y += al.length * 5 + 2;
        });
    }

    // Page 3 — Categories
    doc.addPage();
    doc.setFillColor(0, 48, 135);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PayFlow AI — Full Report', 14, 8);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Spending by Category', 14, 25);

    const cats = {};
    expenses.forEach(t => {
        const c = t.ai_category || 'Other';
        cats[c] = (cats[c] || 0) + Math.abs(t.amount);
    });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);

    doc.autoTable({
        startY: 30,
        head: [['Category', 'Amount', '% of Expenses']],
        body: sorted.map(([c, v]) => [c, fmt(v), (v / totalExp * 100).toFixed(1) + '%']),
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        foot: [['Total', fmt(totalExp), '100%']],
        footStyles: { fillColor: [0, 48, 135], textColor: 255, fontStyle: 'bold' }
    });

    // Income breakdown
    y = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Income Sources', 14, y);

    const incCats = {};
    income.forEach(t => {
        const c = t.ai_category || 'Other';
        incCats[c] = (incCats[c] || 0) + t.amount;
    });

    doc.autoTable({
        startY: y + 4,
        head: [['Source', 'Amount']],
        body: Object.entries(incCats).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, fmt(v)]),
        headStyles: { fillColor: [0, 200, 83], textColor: 255 },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } }
    });

    // Page 4 — All transactions
    doc.addPage();
    doc.setFillColor(0, 48, 135);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PayFlow AI — Full Report', 14, 8);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('All Transactions', 14, 25);

    doc.autoTable({
        startY: 30,
        head: [['Date', 'Description', 'Category', 'Amount']],
        body: txns.map(t => [
            new Date(t.date).toLocaleDateString('en-GB'),
            t.name,
            t.ai_category || 'Other',
            fmt(t.amount)
        ]),
        headStyles: { fillColor: [0, 48, 135], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        styles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'right' } }
    });

    doc.save(`PayFlow_FullReport_${range.label.replace(/\s/g, '_')}.pdf`);
}

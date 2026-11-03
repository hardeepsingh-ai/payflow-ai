const API_URL = '';

function formatCurrency(amount) {
    const sign = amount >= 0 ? '' : '-';
    return `${sign}£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadDashboard() {
    try {
        const resp = await fetch(`${API_URL}/api/dashboard`);
        const data = await resp.json();

        document.getElementById('balance').textContent = formatCurrency(data.balance);
        document.getElementById('income').textContent = formatCurrency(data.total_income);
        document.getElementById('expenses').textContent = formatCurrency(data.total_expenses);

        const netEl = document.getElementById('netFlow');
        netEl.textContent = formatCurrency(data.net_flow);
        netEl.style.color = data.net_flow >= 0 ? '#1db954' : '#e74c3c';

        const insights = data.insights;
        document.getElementById('insightSummary').textContent = insights.summary;

        const alertsEl = document.getElementById('alerts');
        alertsEl.innerHTML = (insights.alerts || [])
            .map(a => `<div class="alert-item">&#9888; ${a}</div>`).join('');

        document.getElementById('forecast').innerHTML = insights.forecast
            ? `&#128200; <strong>Forecast:</strong> ${insights.forecast}` : '';

        document.getElementById('savingTip').innerHTML = insights.top_saving
            ? `&#128161; <strong>Tip:</strong> ${insights.top_saving}` : '';

        renderCategoryChart(data.categories);
        renderFlowChart(data.transactions);
        renderTransactions(data.transactions);
    } catch (err) {
        document.getElementById('insightSummary').textContent = 'Unable to connect to API. Start the backend server first.';
    }
}

function renderCategoryChart(categories) {
    const expenseCategories = Object.entries(categories)
        .filter(([cat]) => !cat.startsWith('Revenue'))
        .sort((a, b) => b[1] - a[1]);

    const colors = [
        '#003087', '#0070ba', '#ffc439', '#1db954', '#e74c3c',
        '#9b59b6', '#f39c12', '#3498db', '#2ecc71', '#e67e22',
        '#1abc9c', '#34495e', '#95a5a6'
    ];

    new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: {
            labels: expenseCategories.map(([c]) => c),
            datasets: [{
                data: expenseCategories.map(([, v]) => v),
                backgroundColor: colors.slice(0, expenseCategories.length),
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } }
            }
        }
    });
}

function renderFlowChart(transactions) {
    const dailyData = {};
    transactions.forEach(t => {
        const day = t.date.split('T')[0];
        if (!dailyData[day]) dailyData[day] = { income: 0, expenses: 0 };
        if (t.amount > 0) dailyData[day].income += t.amount;
        else dailyData[day].expenses += Math.abs(t.amount);
    });

    const sorted = Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]));

    new Chart(document.getElementById('flowChart'), {
        type: 'bar',
        data: {
            labels: sorted.map(([d]) => {
                const date = new Date(d);
                return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            }),
            datasets: [
                {
                    label: 'Income',
                    data: sorted.map(([, v]) => v.income),
                    backgroundColor: '#1db954',
                    borderRadius: 4,
                },
                {
                    label: 'Expenses',
                    data: sorted.map(([, v]) => v.expenses),
                    backgroundColor: '#e74c3c',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { boxWidth: 12, font: { size: 12 } } } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => '£' + v.toLocaleString() } },
                x: { ticks: { font: { size: 11 } } }
            }
        }
    });
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.name}</td>
            <td><span class="category-tag">${t.ai_category || 'Other'}</span></td>
            <td class="${t.amount >= 0 ? 'amount-positive' : 'amount-negative'}">${formatCurrency(t.amount)}</td>
        </tr>
    `).join('');
}

async function askBrain() {
    const input = document.getElementById('brainInput');
    const question = input.value.trim();
    if (!question) return;

    const chat = document.getElementById('brainChat');
    chat.innerHTML += `<div class="brain-msg user">${question}</div>`;
    input.value = '';

    try {
        const resp = await fetch(`${API_URL}/api/brain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });
        const data = await resp.json();
        chat.innerHTML += `<div class="brain-msg bot">${data.answer}</div>`;
    } catch {
        chat.innerHTML += `<div class="brain-msg bot">Sorry, I couldn't process that. Try again.</div>`;
    }
    chat.scrollTop = chat.scrollHeight;
}

function askPreset(q) {
    document.getElementById('brainInput').value = q;
    askBrain();
}

document.getElementById('brainInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') askBrain();
});

loadDashboard();

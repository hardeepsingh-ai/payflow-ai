const API_URL = '';

function formatCurrency(amount) {
    const sign = amount >= 0 ? '' : '-';
    return `${sign}£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^[\s]*[-•]\s+(.+)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/g, '')
        .replace(/\n/g, '<br>');
}

function animateValue(el, target, prefix = '£') {
    const duration = 1200;
    const isNeg = target < 0;
    const abs = Math.abs(target);
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = abs * ease;
        el.textContent = (isNeg ? '-' : '') + prefix + current.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function showToast(message, type = 'warning') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

function showSkeletons() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.textContent = '';
        el.classList.add('skeleton');
        el.style.height = '28px';
        el.style.width = '120px';
    });
    document.getElementById('insightSummary').innerHTML = '<div class="skeleton" style="height:16px;width:80%;margin-bottom:8px;"></div><div class="skeleton" style="height:16px;width:60%;"></div>';
    document.getElementById('transactionsBody').innerHTML = Array(5).fill(0).map(() =>
        `<tr><td><div class="skeleton" style="height:14px;width:70px;"></div></td><td><div class="skeleton" style="height:14px;width:150px;"></div></td><td><div class="skeleton" style="height:14px;width:80px;"></div></td><td><div class="skeleton" style="height:14px;width:60px;"></div></td></tr>`
    ).join('');
}

function removeSkeletons() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.classList.remove('skeleton');
        el.style.height = '';
        el.style.width = '';
    });
}

async function loadDashboard() {
    showSkeletons();

    try {
        const resp = await fetch(`${API_URL}/api/dashboard`);
        const data = await resp.json();

        removeSkeletons();

        animateValue(document.getElementById('balance'), data.balance);
        animateValue(document.getElementById('income'), data.total_income);
        animateValue(document.getElementById('expenses'), data.total_expenses);

        const netEl = document.getElementById('netFlow');
        animateValue(netEl, data.net_flow);
        netEl.style.color = data.net_flow >= 0 ? '#00c853' : '#ff5252';

        const insights = data.insights;
        document.getElementById('insightSummary').textContent = insights.summary;

        const alertsEl = document.getElementById('alerts');
        const alerts = insights.alerts || [];
        alertsEl.innerHTML = alerts
            .map(a => `<div class="alert-item">&#9888; ${a}</div>`).join('');

        document.getElementById('forecast').innerHTML = insights.forecast
            ? `&#128200; <strong>Forecast:</strong> ${insights.forecast}` : '';

        document.getElementById('savingTip').innerHTML = insights.top_saving
            ? `&#128161; <strong>Tip:</strong> ${insights.top_saving}` : '';

        renderCategoryChart(data.categories);
        renderFlowChart(data.transactions);
        renderTransactions(data.transactions);
        renderCompareMonths(data.transactions);

        if (alerts.length > 0) {
            setTimeout(() => {
                showToast(`&#9888; <strong>${alerts.length} alert${alerts.length > 1 ? 's' : ''} detected</strong> -${alerts[0].substring(0, 80)}...`, 'warning');
            }, 2000);
        }
    } catch (err) {
        removeSkeletons();
        document.getElementById('insightSummary').textContent = 'Unable to connect to API. Start the backend server first.';
    }
}

function renderCategoryChart(categories) {
    const expenseCategories = Object.entries(categories)
        .filter(([cat]) => !cat.startsWith('Revenue'))
        .sort((a, b) => b[1] - a[1]);

    const colors = [
        '#0070ba', '#ffc439', '#ff5252', '#00c853', '#7c4dff',
        '#ff6d00', '#00bcd4', '#e040fb', '#64dd17', '#ffab00',
        '#18ffff', '#536dfe', '#b0bec5'
    ];

    new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: {
            labels: expenseCategories.map(([c]) => c),
            datasets: [{
                data: expenseCategories.map(([, v]) => v),
                backgroundColor: colors.slice(0, expenseCategories.length),
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 10, font: { size: 11 }, color: '#8892a4', padding: 8 }
                }
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
                    backgroundColor: 'rgba(0, 200, 83, 0.7)',
                    borderRadius: 4,
                },
                {
                    label: 'Expenses',
                    data: sorted.map(([, v]) => v.expenses),
                    backgroundColor: 'rgba(255, 82, 82, 0.7)',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { boxWidth: 10, font: { size: 11 }, color: '#8892a4' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '£' + v.toLocaleString(), color: '#8892a4', font: { size: 10 } },
                    grid: { color: 'rgba(30, 42, 66, 0.5)' }
                },
                x: {
                    ticks: { color: '#8892a4', font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No transactions found. Connect your PayPal account to see data.</td></tr>';
        return;
    }
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.name}</td>
            <td><span class="category-tag">${t.ai_category || 'Other'}</span></td>
            <td class="${t.amount >= 0 ? 'amount-positive' : 'amount-negative'}">${formatCurrency(t.amount)}</td>
        </tr>
    `).join('');
}

function saveBrainChat() {
    try {
        const msgs = [];
        document.querySelectorAll('#brainChat .brain-msg:not(.thinking)').forEach(m => {
            msgs.push({ role: m.classList.contains('user') ? 'user' : 'bot', html: m.innerHTML });
        });
        localStorage.setItem('payflow_brain_chat', JSON.stringify(msgs));
    } catch (e) {}
}

function loadBrainChat() {
    try {
        const saved = localStorage.getItem('payflow_brain_chat');
        if (!saved) return;
        const msgs = JSON.parse(saved);
        const chat = document.getElementById('brainChat');
        msgs.forEach(m => {
            chat.innerHTML += `<div class="brain-msg ${m.role}">${m.html || m.text || ''}</div>`;
        });
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {}
}

async function askBrain() {
    const input = document.getElementById('brainInput');
    const question = input.value.trim();
    if (!question) return;

    const chat = document.getElementById('brainChat');
    chat.innerHTML += `<div class="brain-msg user">${question}</div>`;
    input.value = '';

    const thinking = document.createElement('div');
    thinking.className = 'brain-msg bot thinking';
    thinking.innerHTML = '<span class="dot-pulse"></span> Thinking...';
    chat.appendChild(thinking);
    chat.scrollTop = chat.scrollHeight;

    try {
        const resp = await fetch(`${API_URL}/api/brain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });
        const data = await resp.json();
        thinking.remove();
        const rendered = renderMarkdown(data.answer);
        const actionHtml = detectAgenticAction(data.answer);
        chat.innerHTML += `<div class="brain-msg bot">${rendered}${actionHtml}</div>`;
    } catch {
        thinking.remove();
        chat.innerHTML += `<div class="brain-msg bot">Sorry, I couldn't process that. Try again.</div>`;
    }
    chat.scrollTop = chat.scrollHeight;
    saveBrainChat();
}

function detectAgenticAction(answer) {
    const lower = answer.toLowerCase();
    if (lower.includes('auto-charged') || lower.includes('recurring charge') || lower.includes('instagram boost')) {
        return `<div class="brain-action"><button class="action-btn" onclick="simulateAction('pause')">&#9209; Pause this recurring charge</button><button class="action-btn action-secondary" onclick="simulateAction('alert')">&#128276; Set up alert for this</button></div>`;
    }
    if (lower.includes('subscription') || lower.includes('cancel')) {
        return `<div class="brain-action"><button class="action-btn" onclick="simulateAction('review')">&#128269; Review subscription details</button></div>`;
    }
    return '';
}

function simulateAction(type) {
    const messages = {
        pause: '&#9989; <strong>Charge paused.</strong> Instagram Boost auto-charge has been flagged for review. In production, this would send a PayPal API request to suspend the billing agreement.',
        alert: '&#128276; <strong>Alert set.</strong> You\'ll be notified whenever a new Instagram or Facebook auto-charge appears on your account.',
        review: '&#128269; <strong>Subscription review initiated.</strong> In production, PayFlow would pull the full billing agreement details from PayPal.'
    };
    showToast(messages[type] || 'Action completed.', 'success');
}

function clearBrainChat() {
    document.getElementById('brainChat').innerHTML = '<div class="empty-state-brain">No messages yet. Ask PayFlow Brain anything about your finances.</div>';
    try { localStorage.removeItem('payflow_brain_chat'); } catch (e) {}
}

function copyBrainChat() {
    const msgs = [];
    document.querySelectorAll('#brainChat .brain-msg').forEach(m => {
        const role = m.classList.contains('user') ? 'You' : 'Brain';
        msgs.push(`${role}: ${m.textContent}`);
    });
    if (msgs.length === 0) {
        showToast('No chat to copy.', 'warning');
        return;
    }
    navigator.clipboard.writeText(msgs.join('\n\n')).then(() => {
        showToast('&#9989; Chat copied to clipboard!', 'success');
    });
}

function askPreset(q) {
    document.getElementById('brainInput').value = q;
    askBrain();
}

function showEmailDigest() {
    const modal = document.getElementById('emailDigestModal');
    modal.style.display = 'flex';
}

function closeEmailDigest() {
    document.getElementById('emailDigestModal').style.display = 'none';
}

function subscribeDigest() {
    const email = document.getElementById('digestEmail').value.trim();
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
    }
    closeEmailDigest();
    showToast(`&#9989; <strong>Daily digest enabled!</strong> Financial summaries will be sent to ${email} every morning. (Demo -not active in sandbox mode)`, 'success');
}

function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.toggle('light-theme');
    const btn = document.getElementById('themeToggle');
    btn.textContent = isLight ? '🌙' : '☀️';
    try { localStorage.setItem('payflow_theme', isLight ? 'light' : 'dark'); } catch (e) {}
}

function loadTheme() {
    try {
        const saved = localStorage.getItem('payflow_theme');
        if (saved === 'light') {
            document.body.classList.add('light-theme');
            document.getElementById('themeToggle').textContent = '🌙';
        }
    } catch (e) {}
}

document.getElementById('brainInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') askBrain();
    if (e.key === 'Escape') { e.target.value = ''; }
});

loadTheme();
loadBrainChat();

const brainChat = document.getElementById('brainChat');
if (!brainChat.innerHTML.trim()) {
    brainChat.innerHTML = '<div class="empty-state-brain">No messages yet. Ask PayFlow Brain anything about your finances.</div>';
}

function renderCompareMonths(transactions) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    let thisIncome = 0, thisExpenses = 0, lastIncome = 0, lastExpenses = 0;
    transactions.forEach(t => {
        const d = new Date(t.date);
        const m = d.getMonth(), y = d.getFullYear();
        if (m === thisMonth && y === thisYear) {
            if (t.amount > 0) thisIncome += t.amount;
            else thisExpenses += Math.abs(t.amount);
        } else if (m === lastMonth && y === lastYear) {
            if (t.amount > 0) lastIncome += t.amount;
            else lastExpenses += Math.abs(t.amount);
        }
    });

    const fmt = v => '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('compareIncomeThis').textContent = fmt(thisIncome);
    document.getElementById('compareExpensesThis').textContent = fmt(thisExpenses);
    const thisNet = thisIncome - thisExpenses;
    const netThisEl = document.getElementById('compareNetThis');
    netThisEl.textContent = (thisNet < 0 ? '-' : '') + fmt(Math.abs(thisNet));
    netThisEl.className = thisNet >= 0 ? 'amount-positive' : 'amount-negative';

    document.getElementById('compareIncomeLast').textContent = fmt(lastIncome);
    document.getElementById('compareExpensesLast').textContent = fmt(lastExpenses);
    const lastNet = lastIncome - lastExpenses;
    const netLastEl = document.getElementById('compareNetLast');
    netLastEl.textContent = (lastNet < 0 ? '-' : '') + fmt(Math.abs(lastNet));
    netLastEl.className = lastNet >= 0 ? 'amount-positive' : 'amount-negative';

    const changeEl = document.getElementById('compareChange');
    if (lastExpenses > 0) {
        const pct = ((thisExpenses - lastExpenses) / lastExpenses * 100).toFixed(1);
        const dir = pct > 0 ? 'up' : 'down';
        const color = pct > 0 ? '#ff5252' : '#00c853';
        changeEl.innerHTML = `<span style="color:${color}">Expenses ${dir} ${Math.abs(pct)}% vs last month</span>`;
    } else {
        changeEl.innerHTML = '<span style="color:var(--text-dim)">No data for last month</span>';
    }
}

loadDashboard();

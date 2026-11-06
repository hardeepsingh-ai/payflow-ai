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
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const listMatch = trimmed.match(/^[-•*]\s+(.+)/);
        if (listMatch) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += '<li>' + listMatch[1].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>') + '</li>';
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            let processed = trimmed
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>');
            if (trimmed.match(/^#{1,3}\s+/)) {
                processed = '<strong>' + trimmed.replace(/^#{1,3}\s+/, '') + '</strong>';
            }
            html += processed + '<br>';
        }
    }
    if (inList) html += '</ul>';
    return html;
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

let notifications = [];

function showToast(message, type = 'warning') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div class="toast-content">${message}</div><button class="toast-close" onclick="this.parentElement.classList.remove('show');setTimeout(()=>this.parentElement.remove(),400)">&#10005;</button>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 6000);
    addNotification(message, type);
}

function addNotification(message, type) {
    const text = message.replace(/<[^>]*>/g, '');
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    notifications.unshift({ text, type, time });
    updateNotifBell();
}

function updateNotifBell() {
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    if (!badge || !list) return;
    const count = notifications.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    if (count === 0) {
        list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
        return;
    }
    list.innerHTML = notifications.map((n, i) => `
        <div class="notif-item notif-${n.type}">
            <div class="notif-item-text">${n.text}</div>
            <div class="notif-item-meta">
                <span class="notif-time">${n.time}</span>
                <button class="notif-dismiss" onclick="dismissNotif(${i})">&#10005;</button>
            </div>
        </div>
    `).join('');
}

function dismissNotif(index) {
    notifications.splice(index, 1);
    updateNotifBell();
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function clearNotifs() {
    notifications = [];
    updateNotifBell();
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

let _allTransactions = [];

async function loadDashboard() {
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.style.display = 'none';

    document.querySelectorAll('.stats-grid, .panel, .charts-grid, .brain-panel, .transactions-panel, #compare-section').forEach(el => el.style.display = '');

    showSkeletons();

    try {
        const resp = await fetch(`${API_URL}/api/dashboard`);
        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
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

        _allTransactions = data.transactions || [];
        renderCategoryChart(data.categories);
        renderFlowChart(data.transactions);
        renderTransactions(data.transactions);
        renderCompareMonths(data.transactions);
        populateCategoryFilter(data.transactions);

        if (alerts.length > 0) {
            setTimeout(() => {
                showToast(`&#9888; <strong>${alerts.length} alert${alerts.length > 1 ? 's' : ''} detected</strong> -${alerts[0].substring(0, 80)}...`, 'warning');
            }, 2000);
        }
    } catch (err) {
        removeSkeletons();
        document.getElementById('insightSummary').innerHTML = `<div class="error-state"><div class="error-state-icon">&#9888;</div>Unable to load data. The server may be starting up (free tier takes ~30s).<br><button class="error-retry-btn" onclick="loadDashboard()">Retry</button></div>`;
    }
}

function populateCategoryFilter(transactions) {
    const cats = [...new Set(transactions.map(t => t.ai_category || 'Other'))].sort();
    const sel = document.getElementById('txnCategoryFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function filterTransactions() {
    const search = (document.getElementById('txnSearch')?.value || '').toLowerCase();
    const cat = document.getElementById('txnCategoryFilter')?.value || '';
    const filtered = _allTransactions.filter(t => {
        const matchSearch = !search || t.name.toLowerCase().includes(search) || (t.ai_category || '').toLowerCase().includes(search);
        const matchCat = !cat || (t.ai_category || 'Other') === cat;
        return matchSearch && matchCat;
    });
    renderTransactions(filtered);
}

function renderCategoryChart(categories) {
    const expenseCategories = Object.entries(categories)
        .filter(([cat]) => !cat.startsWith('Revenue'))
        .sort((a, b) => b[1] - a[1]);

    const defaultColors = [
        '#0070ba', '#ffc439', '#ff5252', '#00c853', '#7c4dff',
        '#ff6d00', '#00bcd4', '#e040fb', '#64dd17', '#ffab00',
        '#18ffff', '#536dfe', '#b0bec5'
    ];

    const isCB = document.body.classList.contains('cb-mode');
    const colors = isCB ? CB_COLORS : defaultColors;

    const ctx = document.getElementById('categoryChart');
    _categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: expenseCategories.map(([c]) => c),
            datasets: [{
                data: expenseCategories.map(([, v]) => v),
                backgroundColor: colors.slice(0, expenseCategories.length),
                borderWidth: _a11yPatterns ? 3 : 0,
                borderColor: _a11yPatterns ? '#ffffff' : undefined,
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
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return `${ctx.label}: £${ctx.raw.toLocaleString('en-GB', {minimumFractionDigits:2})} (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: _a11yDataLabels ? [{
            id: 'doughnutLabels',
            afterDraw(chart) {
                const { ctx: c, data } = chart;
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                chart.getDatasetMeta(0).data.forEach((arc, i) => {
                    const pct = ((data.datasets[0].data[i] / total) * 100).toFixed(0);
                    if (pct < 5) return;
                    const { x, y } = arc.tooltipPosition();
                    c.save();
                    c.fillStyle = '#ffffff';
                    c.font = 'bold 10px sans-serif';
                    c.textAlign = 'center';
                    c.fillText(pct + '%', x, y);
                    c.restore();
                });
            }
        }] : []
    });

    const altEl = document.getElementById('categoryAltText');
    if (altEl) {
        const top3 = expenseCategories.slice(0, 3).map(([c, v]) => `${c}: £${v.toFixed(2)}`).join(', ');
        altEl.textContent = `Top spending categories: ${top3}. ${expenseCategories.length} categories total.`;
    }
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
    const isCB = document.body.classList.contains('cb-mode');

    const incomeColor = isCB ? 'rgba(0, 114, 178, 0.7)' : 'rgba(0, 200, 83, 0.7)';
    const expenseColor = isCB ? 'rgba(213, 94, 0, 0.7)' : 'rgba(255, 82, 82, 0.7)';

    const incomeBorder = _a11yPatterns ? (isCB ? '#0072B2' : '#00c853') : undefined;
    const expenseBorder = _a11yPatterns ? (isCB ? '#D55E00' : '#ff5252') : undefined;

    _flowChartInstance = new Chart(document.getElementById('flowChart'), {
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
                    backgroundColor: incomeColor,
                    borderColor: incomeBorder,
                    borderWidth: _a11yPatterns ? 2 : 0,
                    borderRadius: 4,
                    borderDash: _a11yPatterns ? [] : undefined,
                },
                {
                    label: 'Expenses',
                    data: sorted.map(([, v]) => v.expenses),
                    backgroundColor: expenseColor,
                    borderColor: expenseBorder,
                    borderWidth: _a11yPatterns ? 2 : 0,
                    borderRadius: 4,
                    borderDash: _a11yPatterns ? [4, 4] : undefined,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { boxWidth: 10, font: { size: 11 }, color: '#8892a4' } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.dataset.label}: £${ctx.raw.toLocaleString('en-GB', {minimumFractionDigits:2})}`;
                        }
                    }
                }
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
        },
        plugins: _a11yDataLabels ? [{
            id: 'barLabels',
            afterDatasetsDraw(chart) {
                const { ctx: c } = chart;
                chart.data.datasets.forEach((ds, di) => {
                    chart.getDatasetMeta(di).data.forEach((bar, i) => {
                        const val = ds.data[i];
                        if (val < 1) return;
                        c.save();
                        c.fillStyle = '#ffffff';
                        c.font = 'bold 9px sans-serif';
                        c.textAlign = 'center';
                        c.fillText('£' + Math.round(val), bar.x, bar.y - 4);
                        c.restore();
                    });
                });
            }
        }] : []
    });

    const altEl = document.getElementById('flowAltText');
    if (altEl) {
        const totalIncome = sorted.reduce((s, [, v]) => s + v.income, 0);
        const totalExpenses = sorted.reduce((s, [, v]) => s + v.expenses, 0);
        altEl.textContent = `Total income: £${totalIncome.toFixed(2)}, Total expenses: £${totalExpenses.toFixed(2)} over ${sorted.length} days.`;
    }
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

    const askBtn = document.getElementById('brainAsk');
    askBtn.disabled = true;
    askBtn.innerHTML = '<span class="dot-pulse"></span> Thinking...';

    const chat = document.getElementById('brainChat');
    chat.insertAdjacentHTML('beforeend', `<div class="brain-msg user">${question}</div>`);
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
        chat.insertAdjacentHTML('beforeend', `<div class="brain-msg bot">${rendered}${actionHtml}</div>`);
    } catch {
        thinking.remove();
        chat.insertAdjacentHTML('beforeend', `<div class="brain-msg bot">&#9888; I couldn't reach the AI server. This may be due to a cold start on the free tier — please wait 30 seconds and try again.<br><button class="error-retry-btn" onclick="document.getElementById('brainInput').value='${question.replace(/'/g, "\\'")}';askBrain()">Retry</button></div>`);
    }
    askBtn.disabled = false;
    askBtn.innerHTML = 'Ask';
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

function exportBrainChat() {
    const msgs = [];
    document.querySelectorAll('#brainChat .brain-msg').forEach(m => {
        const role = m.classList.contains('user') ? 'You' : 'PayFlow Brain';
        msgs.push(`${role}:\n${m.textContent}\n`);
    });
    if (msgs.length === 0) { showToast('No chat to export.', 'warning'); return; }
    const text = `PayFlow AI - Brain Chat Export\nDate: ${new Date().toLocaleDateString('en-GB')}\n${'='.repeat(40)}\n\n${msgs.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payflow-brain-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('&#9989; Chat exported!', 'success');
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
    if (e.key === 'Escape') { e.target.value = ''; e.target.blur(); }
});

document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        const input = document.getElementById('brainInput');
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 300);
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
        const notifPanel = document.getElementById('notifPanel');
        if (notifPanel) notifPanel.style.display = 'none';
    }
});

// ── Accessibility Functions ──

function toggleA11yPanel() {
    const panel = document.getElementById('a11yPanel');
    const arrow = document.getElementById('a11yArrow');
    const btn = document.querySelector('.sidebar-section-toggle');
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'block';
    arrow.classList.toggle('open', !visible);
    btn.setAttribute('aria-expanded', !visible);
}

const CB_COLORS = ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#D55E00', '#CC79A7', '#000000'];

function toggleColourBlind() {
    document.body.classList.toggle('cb-mode', document.getElementById('cbToggle').checked);
    reRenderChartsIfNeeded();
    saveA11yPrefs();
}

function toggleHighContrast() {
    document.body.classList.toggle('hc-mode', document.getElementById('hcToggle').checked);
    saveA11yPrefs();
}

function togglePatternFills() {
    _a11yPatterns = document.getElementById('patternToggle').checked;
    reRenderChartsIfNeeded();
    saveA11yPrefs();
}

function toggleDataLabels() {
    _a11yDataLabels = document.getElementById('dataLabelsToggle').checked;
    document.body.classList.toggle('show-alt-text', _a11yDataLabels);
    reRenderChartsIfNeeded();
    saveA11yPrefs();
}

function changeFontSize() {
    const size = document.getElementById('fontSizeSelect').value;
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add('font-' + size);
    saveA11yPrefs();
}

function toggleDyslexiaFont() {
    document.body.classList.toggle('dyslexia-font', document.getElementById('dyslexiaToggle').checked);
    saveA11yPrefs();
}

function toggleReducedMotion() {
    document.body.classList.toggle('reduced-motion', document.getElementById('reducedMotionToggle').checked);
    saveA11yPrefs();
}

function toggleSimplifiedView() {
    document.body.classList.toggle('simplified-view', document.getElementById('simplifiedToggle').checked);
    saveA11yPrefs();
}

let _a11yPatterns = false;
let _a11yDataLabels = false;
let _categoryChartInstance = null;
let _flowChartInstance = null;

function reRenderChartsIfNeeded() {
    if (_allTransactions.length > 0) {
        if (_categoryChartInstance) _categoryChartInstance.destroy();
        if (_flowChartInstance) _flowChartInstance.destroy();
        fetch(`${API_URL}/api/dashboard`).then(r => r.json()).then(data => {
            renderCategoryChart(data.categories);
            renderFlowChart(data.transactions);
        }).catch(() => {});
    }
}

function saveA11yPrefs() {
    try {
        localStorage.setItem('payflow_a11y', JSON.stringify({
            cb: document.getElementById('cbToggle').checked,
            hc: document.getElementById('hcToggle').checked,
            patterns: document.getElementById('patternToggle').checked,
            dataLabels: document.getElementById('dataLabelsToggle').checked,
            fontSize: document.getElementById('fontSizeSelect').value,
            dyslexia: document.getElementById('dyslexiaToggle').checked,
            reducedMotion: document.getElementById('reducedMotionToggle').checked,
            simplified: document.getElementById('simplifiedToggle').checked,
        }));
    } catch (e) {}
}

function loadA11yPrefs() {
    try {
        const saved = localStorage.getItem('payflow_a11y');
        if (!saved) return;
        const p = JSON.parse(saved);
        if (p.cb) { document.getElementById('cbToggle').checked = true; document.body.classList.add('cb-mode'); }
        if (p.hc) { document.getElementById('hcToggle').checked = true; document.body.classList.add('hc-mode'); }
        if (p.patterns) { document.getElementById('patternToggle').checked = true; _a11yPatterns = true; }
        if (p.dataLabels) { document.getElementById('dataLabelsToggle').checked = true; _a11yDataLabels = true; document.body.classList.add('show-alt-text'); }
        if (p.fontSize && p.fontSize !== 'medium') {
            document.getElementById('fontSizeSelect').value = p.fontSize;
            document.body.classList.add('font-' + p.fontSize);
        }
        if (p.dyslexia) { document.getElementById('dyslexiaToggle').checked = true; document.body.classList.add('dyslexia-font'); }
        if (p.reducedMotion) { document.getElementById('reducedMotionToggle').checked = true; document.body.classList.add('reduced-motion'); }
        if (p.simplified) { document.getElementById('simplifiedToggle').checked = true; document.body.classList.add('simplified-view'); }
    } catch (e) {}
}

loadTheme();
loadA11yPrefs();
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

window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    if (btn) btn.classList.toggle('visible', window.scrollY > 400);
});

// Always show welcome screen on page load
document.querySelectorAll('.stats-grid, .panel, .charts-grid, .brain-panel, .transactions-panel, #compare-section').forEach(el => el.style.display = 'none');

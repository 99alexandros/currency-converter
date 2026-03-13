/* ── Config ─────────────────────────────────────────────────────────────── */
const API_KEY  = '8da27a022bddbbfd0e3b1f18';
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/`;

/* ── Top 30 currencies ──────────────────────────────────────────────────── */
const TOP_CURRENCIES = [
  'USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','INR','BRL',
  'MXN','KRW','SGD','HKD','NOK','SEK','DKK','NZD','ZAR','TRY',
  'AED','SAR','THB','MYR','IDR','PHP','PLN','ILS','ARS','COP',
];

/* ── Currency metadata (cc = ISO 3166-1 alpha-2 country code) ───────────── */
const CURRENCY_META = {
  USD: { cc: 'us', name: 'US Dollar' },
  EUR: { cc: 'eu', name: 'Euro' },
  GBP: { cc: 'gb', name: 'British Pound' },
  JPY: { cc: 'jp', name: 'Japanese Yen' },
  CAD: { cc: 'ca', name: 'Canadian Dollar' },
  AUD: { cc: 'au', name: 'Australian Dollar' },
  CHF: { cc: 'ch', name: 'Swiss Franc' },
  CNY: { cc: 'cn', name: 'Chinese Yuan' },
  INR: { cc: 'in', name: 'Indian Rupee' },
  BRL: { cc: 'br', name: 'Brazilian Real' },
  MXN: { cc: 'mx', name: 'Mexican Peso' },
  KRW: { cc: 'kr', name: 'South Korean Won' },
  SGD: { cc: 'sg', name: 'Singapore Dollar' },
  HKD: { cc: 'hk', name: 'Hong Kong Dollar' },
  NOK: { cc: 'no', name: 'Norwegian Krone' },
  SEK: { cc: 'se', name: 'Swedish Krona' },
  DKK: { cc: 'dk', name: 'Danish Krone' },
  NZD: { cc: 'nz', name: 'New Zealand Dollar' },
  ZAR: { cc: 'za', name: 'South African Rand' },
  TRY: { cc: 'tr', name: 'Turkish Lira' },
  AED: { cc: 'ae', name: 'UAE Dirham' },
  SAR: { cc: 'sa', name: 'Saudi Riyal' },
  THB: { cc: 'th', name: 'Thai Baht' },
  MYR: { cc: 'my', name: 'Malaysian Ringgit' },
  IDR: { cc: 'id', name: 'Indonesian Rupiah' },
  PHP: { cc: 'ph', name: 'Philippine Peso' },
  PLN: { cc: 'pl', name: 'Polish Złoty' },
  ILS: { cc: 'il', name: 'Israeli Shekel' },
  ARS: { cc: 'ar', name: 'Argentine Peso' },
  COP: { cc: 'co', name: 'Colombian Peso' },
};

/* ── Flag image helper (flagcdn.com — works on all platforms) ───────────── */
function flagHtml(cc, displayW = 20) {
  if (!cc) return '<span class="flag-fallback">🌐</span>';
  const displayH = Math.round(displayW * 0.75);
  // Always fetch w20 (smallest supported by flagcdn.com); scale via HTML attributes
  return `<img class="flag-img" src="https://flagcdn.com/w20/${cc}.png" width="${displayW}" height="${displayH}" alt="${cc}">`;
}

/* ── Custom searchable dropdown ─────────────────────────────────────────── */
class CurrencyDropdown {
  constructor(containerId) {
    this.el      = document.getElementById(containerId);
    this.trigger = this.el.querySelector('.dd-trigger');
    this.panel   = this.el.querySelector('.dd-panel');
    this.search  = this.el.querySelector('.dd-search');
    this.list    = this.el.querySelector('.dd-list');
    this._value  = '';
    this._changeHandlers = [];

    this.trigger.addEventListener('click', () => this.toggle());
    this.search.addEventListener('input', () => this._filterList());

    document.addEventListener('click', (e) => {
      if (!this.el.contains(e.target)) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  get value() { return this._value; }

  set value(code) {
    if (!code) return;
    this._value = code;
    const meta = CURRENCY_META[code] || {};
    this.el.querySelector('.dd-flag').innerHTML  = flagHtml(meta.cc);
    this.el.querySelector('.dd-code').textContent = code;
    this.el.querySelector('.dd-name').textContent = meta.name || code;
    this.list.querySelectorAll('.dd-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.code === code);
    });
  }

  addEventListener(type, fn) {
    if (type === 'change') this._changeHandlers.push(fn);
  }

  populate(currencies) {
    this.list.innerHTML = '';
    currencies.forEach(({ code, cc, name }) => {
      const li = document.createElement('li');
      li.className    = 'dd-item';
      li.dataset.code = code;
      li.setAttribute('role', 'option');
      li.innerHTML = `${flagHtml(cc)}<span class="dd-code">${code}</span><span class="dd-iname">${name}</span>`;
      li.addEventListener('click', () => {
        const prev = this._value;
        this.value = code;
        this.close();
        if (code !== prev) this._changeHandlers.forEach(fn => fn());
      });
      this.list.appendChild(li);
    });
  }

  _filterList() {
    const q = this.search.value.toLowerCase();
    this.list.querySelectorAll('.dd-item').forEach(item => {
      const code = item.dataset.code.toLowerCase();
      const name = item.querySelector('.dd-iname').textContent.toLowerCase();
      item.hidden = !(code.includes(q) || name.includes(q));
    });
  }

  open() {
    this.panel.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.trigger.classList.add('open');
    this.search.value = '';
    this._filterList();
    this.search.focus();
    const sel = this.list.querySelector('.dd-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  close() {
    this.panel.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.classList.remove('open');
  }

  toggle() {
    this.panel.hidden ? this.open() : this.close();
  }
}

/* ── State ──────────────────────────────────────────────────────────────── */
let rates            = {};
let fetchBase        = 'USD';
let lastUpdate       = null;
let trendChart       = null;
let refreshTimer     = null;
let refreshCountdown = 60;
let historyDebounce  = null;

/* ── DOM refs ───────────────────────────────────────────────────────────── */
const amountInput     = document.getElementById('amount');
const swapBtn         = document.getElementById('swapBtn');
const resultAmount    = document.getElementById('resultAmount');
const resultRate      = document.getElementById('resultRate');
const errorBanner     = document.getElementById('errorBanner');
const errorMessage    = document.getElementById('errorMessage');
const statusDot       = document.getElementById('statusDot');
const lastUpdatedEl   = document.getElementById('lastUpdated');
const historyListEl   = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const chartPairEl     = document.getElementById('chartPair');
const chartTrendEl    = document.getElementById('chartTrend');

/* ── Dropdown instances ─────────────────────────────────────────────────── */
const fromDD = new CurrencyDropdown('fromDropdown');
const toDD   = new CurrencyDropdown('toDropdown');

/* ── Chart utilities ────────────────────────────────────────────────────── */
function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function getLast7DayLabels() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return 'Today';
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return days[d.getDay()];
  });
}

function generateTrendData(currentRate, from, to) {
  const rand   = seededRandom(hashStr(from + to));
  const points = new Array(7);
  points[6]    = currentRate;
  for (let i = 5; i >= 0; i--) {
    const drift = (rand() - 0.48) * 0.018;
    points[i]   = points[i + 1] / (1 + drift);
  }
  return points;
}

function rateDecimals(val) {
  return val >= 100 ? 1 : val >= 10 ? 2 : val >= 1 ? 3 : 4;
}

/* ── Chart init / update ────────────────────────────────────────────────── */
function initChart(data, from, to) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const h    = canvas.parentElement.clientHeight || 155;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(124, 106, 247, 0.4)');
  grad.addColorStop(1, 'rgba(124, 106, 247, 0.0)');

  if (trendChart) trendChart.destroy();

  const dec = rateDecimals(data[6]);

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getLast7DayLabels(),
      datasets: [{
        data,
        borderColor: '#7c6af7',
        borderWidth: 2.5,
        backgroundColor: grad,
        fill: true,
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#7c6af7',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,12,41,0.92)',
          borderColor: 'rgba(124,106,247,0.45)',
          borderWidth: 1,
          titleColor: 'rgba(240,240,248,0.55)',
          bodyColor: '#fff',
          bodyFont: { weight: '600', family: 'Inter, sans-serif', size: 13 },
          titleFont: { family: 'Inter, sans-serif', size: 11 },
          padding: { x: 12, y: 10 },
          displayColors: false,
          callbacks: {
            label: (item) => `${item.raw.toFixed(dec)} ${to}`,
          },
        },
      },
      scales: {
        x: {
          grid:   { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
          ticks:  { color: 'rgba(240,240,248,0.4)', font: { size: 11, family: 'Inter, sans-serif' } },
        },
        y: {
          position: 'right',
          grid:     { color: 'rgba(255,255,255,0.04)' },
          border:   { display: false },
          ticks: {
            color: 'rgba(240,240,248,0.4)',
            font:  { size: 11, family: 'Inter, sans-serif' },
            maxTicksLimit: 4,
            callback: (val) => val.toFixed(dec),
          },
        },
      },
    },
  });

  updateChartMeta(data, from, to);
}

function updateChart() {
  const from = fromDD.value;
  const to   = toDD.value;
  if (!rates[from] || !rates[to]) return;

  const currentRate = rates[to] / rates[from];
  const data        = generateTrendData(currentRate, from, to);

  if (!trendChart) {
    initChart(data, from, to);
    return;
  }

  const dec = rateDecimals(currentRate);
  trendChart.options.plugins.tooltip.callbacks.label = (item) => `${item.raw.toFixed(dec)} ${to}`;
  trendChart.options.scales.y.ticks.callback         = (val)  => val.toFixed(dec);
  trendChart.data.datasets[0].data                   = data;
  trendChart.update('active');
  updateChartMeta(data, from, to);
}

function updateChartMeta(data, from, to) {
  const fm = CURRENCY_META[from] || {};
  const tm = CURRENCY_META[to]   || {};

  if (chartPairEl)  chartPairEl.innerHTML = `${flagHtml(fm.cc, 16)} ${from} / ${flagHtml(tm.cc, 16)} ${to}`;
  if (chartTrendEl) {
    const pct  = ((data[6] - data[0]) / data[0]) * 100;
    const sign = pct >= 0 ? '+' : '';
    chartTrendEl.textContent = `${sign}${pct.toFixed(2)}%`;
    chartTrendEl.className   = 'chart-trend ' + (pct >= 0 ? 'trend-up' : 'trend-down');
  }
}

/* ── Conversion History ─────────────────────────────────────────────────── */
const HISTORY_KEY = 'cx-history';
const HISTORY_MAX = 5;

function loadHistory() {
  try   { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveToHistory(from, to, amount, resultStr, rawRate) {
  if (!amount || amount <= 0) return;
  const history = loadHistory();
  const last    = history[0];
  if (last && last.from === from && last.to === to &&
      last.amount === amount && last.result === resultStr) return;
  history.unshift({ from, to, amount, result: resultStr, rate: rawRate, ts: Date.now() });
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!historyListEl) return;
  const history = loadHistory();
  if (history.length === 0) {
    historyListEl.innerHTML = '<div class="history-empty">No conversions yet</div>';
    return;
  }
  historyListEl.innerHTML = history.map(e => {
    const fm = CURRENCY_META[e.from] || {};
    const tm = CURRENCY_META[e.to]   || {};
    return `
      <div class="history-item">
        <div class="history-left">
          <div class="history-pair">${flagHtml(fm.cc, 16)} ${e.from} → ${flagHtml(tm.cc, 16)} ${e.to}</div>
          <div class="history-amounts">${e.amount} <span class="hist-sep">→</span> ${e.result} ${e.to}</div>
        </div>
        <div class="history-time">${formatTimeAgo(e.ts)}</div>
      </div>`;
  }).join('');
}

function formatTimeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Auto-refresh ───────────────────────────────────────────────────────── */
function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshCountdown = 60;
  updateCountdownDisplay();
  refreshTimer = setInterval(() => {
    refreshCountdown--;
    updateCountdownDisplay();
    if (refreshCountdown <= 0) {
      refreshCountdown = 60;
      doSilentRefresh();
    }
  }, 1000);
}

function updateCountdownDisplay() {
  if (!lastUpdate) return;
  const t = lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  lastUpdatedEl.textContent = `Updated ${t} · Refresh in ${refreshCountdown}s`;
}

async function doSilentRefresh() {
  const savedFrom = fromDD.value;
  const savedTo   = toDD.value;
  try {
    await fetchRates(savedFrom);
    toDD.value = savedTo;
    convert();
    updateChart();
  } catch (_) { /* silent */ }
}

/* ── Populate dropdowns ─────────────────────────────────────────────────── */
function populateSelects(codes) {
  const savedTo    = toDD.value;
  const available  = TOP_CURRENCIES.filter(c => codes.includes(c));
  const currencies = available.map(code => ({ code, ...(CURRENCY_META[code] || { cc: null, name: code }) }));
  fromDD.populate(currencies);
  toDD.populate(currencies);
  fromDD.value = 'USD';
  toDD.value   = savedTo || 'EUR';
}

/* ── Fetch rates ────────────────────────────────────────────────────────── */
async function fetchRates(base) {
  setStatus('loading');
  hideError();

  const res  = await fetch(`${BASE_URL}${base}`);
  const data = await res.json();

  if (!res.ok || data.result !== 'success') {
    throw new Error(data['error-type'] || `HTTP ${res.status}`);
  }

  rates      = data.conversion_rates;
  fetchBase  = base;
  lastUpdate = new Date();

  const codes = Object.keys(rates).filter(c => rates[c] != null);
  populateSelects(codes);
  fromDD.value = base;

  setStatus('online');
  updateCountdownDisplay();
}

/* ── Convert & display ──────────────────────────────────────────────────── */
function convert() {
  const amount = parseFloat(amountInput.value);
  const from   = fromDD.value;
  const to     = toDD.value;

  if (isNaN(amount) || amount < 0) {
    showResult('—', '');
    return;
  }

  if (!rates[from] || !rates[to]) return;

  const inBase  = amount / rates[from];
  const result  = inBase * rates[to];
  const rawRate = rates[to] / rates[from];

  const formatted = formatNumber(result, to);
  const rateStr   = formatNumber(rawRate, to, 6);

  hideError();
  showResult(formatted, `1 ${from} = ${rateStr} ${to}`);

  clearTimeout(historyDebounce);
  historyDebounce = setTimeout(() => {
    saveToHistory(from, to, amount, formatted, rawRate);
  }, 1500);
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function formatNumber(value, toCurrency, maxFrac = 4) {
  const highRate = ['JPY', 'KRW', 'IDR', 'VND', 'HUF'].includes(toCurrency);
  const decimals = highRate ? 0 : Math.min(maxFrac, value < 1 ? 6 : 2);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function showResult(amount, rate) {
  resultAmount.classList.add('updating');
  requestAnimationFrame(() => {
    resultAmount.textContent = amount;
    resultRate.textContent   = rate;
    resultAmount.classList.remove('updating');
  });
}

function setStatus(state) {
  statusDot.className = 'status-dot';
  statusDot.title     = state === 'online' ? 'Rates up to date'
                      : state === 'error'  ? 'Could not fetch rates'
                      :                      'Fetching rates…';
  if (state === 'online') statusDot.classList.add('online');
  if (state === 'error')  statusDot.classList.add('error');
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.hidden       = false;
  setStatus('error');
}

function hideError() {
  errorBanner.hidden = true;
}

/* ── Re-fetch when from-currency changes ────────────────────────────────── */
async function handleFromChange() {
  const from    = fromDD.value;
  const savedTo = toDD.value;

  if (from === fetchBase && Object.keys(rates).length > 0) {
    hideError();
    convert();
    updateChart();
    return;
  }
  try {
    await fetchRates(from);
    toDD.value = savedTo;
    convert();
    updateChart();
  } catch (err) {
    showError(`Failed to load rates: ${err.message}`);
    showResult('—', '');
  }
}

/* ── Swap ───────────────────────────────────────────────────────────────── */
function handleSwap() {
  swapBtn.classList.add('spinning');
  swapBtn.addEventListener('animationend', () => swapBtn.classList.remove('spinning'), { once: true });
  const tmp    = fromDD.value;
  fromDD.value = toDD.value;
  toDD.value   = tmp;
  handleFromChange();
}

/* ── Event listeners ────────────────────────────────────────────────────── */
amountInput.addEventListener('input', convert);
fromDD.addEventListener('change', handleFromChange);
toDD.addEventListener('change', () => { convert(); updateChart(); });
swapBtn.addEventListener('click', handleSwap);

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });
}

/* ── Init ───────────────────────────────────────────────────────────────── */
(async () => {
  resultAmount.innerHTML = '<span class="skeleton"></span>';
  resultRate.textContent = '';
  renderHistory();

  try {
    await fetchRates('USD');
    convert();
    updateChart();
    startAutoRefresh();
  } catch (err) {
    showError(`Could not load exchange rates. Please check your connection. (${err.message})`);
    resultAmount.textContent = '—';
  }
})();

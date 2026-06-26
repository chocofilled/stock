document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('stock-search');
  const searchLoader = document.getElementById('search-loader');
  const dropdownList = document.getElementById('dropdown-list');
  const infoPanel = document.getElementById('stock-info-panel');
  const badge = document.getElementById('stock-market-badge');
  const codeEl = document.getElementById('stock-code');
  const nameEl = document.getElementById('stock-name');
  const priceEl = document.getElementById('stock-price');
  const priceChangeEl = document.getElementById('stock-price-change');
  const changeIndicatorEl = document.getElementById('change-indicator');
  const changeValEl = document.getElementById('change-val');
  const changeRatioEl = document.getElementById('change-ratio');
  const favoriteToggle = document.getElementById('favorite-toggle');
  const favoriteToggleStar = document.getElementById('favorite-toggle-star');
  const favoritePanelToggle = document.getElementById('favorites-panel-toggle');
  const favoritePanelToggleDotUp = document.getElementById('favorites-panel-alert-dot-up');
  const favoritePanelToggleDotDown = document.getElementById('favorites-panel-alert-dot-down');
  const favoritePanel = document.getElementById('favorites-panel');
  const favoriteList = document.getElementById('favorites-list');
  const favoriteListCount = document.getElementById('favorites-panel-count');
  const stockPanelClose = document.getElementById('stock-panel-close');

  const alertToggle = document.getElementById('stock-alert-toggle');
  const alertPanel = document.getElementById('stock-alert-panel');
  const alertPercentInputs = document.getElementById('alert-percent-inputs');
  const alertPriceInputs = document.getElementById('alert-price-inputs');
  const alertPercentValue = document.getElementById('alert-percent-value');
  const alertPriceValue = document.getElementById('alert-price-value');
  const alertPriceUnit = document.getElementById('alert-price-unit');
  const alertSaveBtn = document.getElementById('alert-settings-save');
  const favoritesRefreshBtn = document.getElementById('favorites-refresh');

  const FAVORITES_KEY = 'favorite_stocks_v1';
  const US_EXCHANGES = new Set(['NMS', 'NYQ', 'ASE', 'NGM', 'NCM', 'PCX', 'BTS']);

  let stocks = [];
  let filteredStocks = [];
  let activeIndex = -1;
  let globalSearchTimer = null;
  let currentStock = null;
  let favoriteStocks = loadFavoriteStocks();
  let favoritePanelOpen = false;
  let favoriteAlertMap = new Map();

  function getChosung(str) {
    const cho = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const codeVal = str.charCodeAt(i) - 44032;
      result += codeVal > -1 && codeVal < 11172 ? cho[Math.floor(codeVal / 588)] : str.charAt(i);
    }
    return result;
  }

  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseCSV(csvText) {
    const lines = csvText.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const codeIdx = headers.indexOf('Code');
    const nameIdx = headers.indexOf('Name');
    const marketIdx = headers.indexOf('MarketId');
    if (codeIdx === -1 || nameIdx === -1 || marketIdx === -1) return [];

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const code = row[codeIdx]?.trim();
      const name = row[nameIdx]?.trim();
      const market = row[marketIdx]?.trim();

      if (code && name && (market === 'STK' || market === 'KSQ')) {
        parsed.push({
          code,
          name,
          chosung: getChosung(name),
          market: market === 'STK' ? 'KOSPI' : 'KOSDAQ',
          country: 'KR'
        });
      }
    }
    return parsed;
  }

  async function loadStockList() {
    searchLoader.classList.add('active');
    let currentDate = new Date();
    let csvData = null;

    for (let attempts = 0; attempts < 15; attempts++) {
      const url = `https://raw.githubusercontent.com/FinanceData/fdr_krx_data_cache/refs/heads/master/data/listing/krx/${formatDate(currentDate)}.csv`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          csvData = await response.text();
          break;
        }
      } catch (e) {
        // Try previous day.
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    if (csvData) {
      stocks = parseCSV(csvData);
      searchInput.disabled = false;
      searchInput.placeholder = '';
      console.log(`Loaded ${stocks.length} KRX stocks.`);
    } else {
      console.error('Failed to load stock list cache.');
      searchInput.placeholder = '';
    }

    searchLoader.classList.remove('active');
  }

  function displayCode(stock) {
    return stock.country === 'JP' ? stock.code.replace('.T', '') : stock.code;
  }

  function getStockKey(stock) {
    return `${stock.country || 'KR'}:${stock.code}`;
  }

  function loadFavoriteStocks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavoriteStocks() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteStocks));
    } catch (e) {
      // Ignore storage errors.
    }
  }

  function isFavorite(stock) {
    return favoriteStocks.some((item) => getStockKey(item) === getStockKey(stock));
  }

  function resolveFavoriteStock(item) {
    return stocks.find((stock) => getStockKey(stock) === getStockKey(item)) || item;
  }

  function setFavoriteAlert(up, down) {
    if (favoritePanelToggleDotUp) favoritePanelToggleDotUp.classList.toggle('visible', up);
    if (favoritePanelToggleDotDown) favoritePanelToggleDotDown.classList.toggle('visible', down);
  }

  function syncFavoriteButton() {
    if (!favoriteToggle || !favoriteToggleStar) return;
    const active = currentStock ? isFavorite(currentStock) : false;
    favoriteToggle.classList.toggle('active', active);
    favoriteToggleStar.textContent = active ? '★' : '☆';
    favoriteToggle.setAttribute('aria-label', active ? '즐겨찾기 제거' : '즐겨찾기 추가');

    if (alertToggle) {
      alertToggle.classList.toggle('hidden', !active);
      if (!active) {
        if (alertPanel) alertPanel.classList.add('hidden');
        alertToggle.classList.remove('active');
      } else if (currentStock) {
        const key = getStockKey(currentStock);
        const favItem = favoriteStocks.find((item) => getStockKey(item) === key);
        if (favItem) {
          const hasCustomAlert = favItem.alertType && favItem.alertType !== 'none';
          alertToggle.classList.toggle('active', hasCustomAlert);
        }
      }
    }
  }

  function setFavoritePanelOpen(open) {
    favoritePanelOpen = open;
    if (!favoritePanel) return;
    favoritePanel.classList.toggle('hidden', !open);
    if (favoritePanelToggle) {
      favoritePanelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      favoritePanelToggle.setAttribute('aria-label', open ? '즐겨찾기 목록 닫기' : '즐겨찾기 목록 열기');
    }
    if (open) renderFavoritePanel();
  }

  function closeCurrentStockPanel() {
    infoPanel.classList.add('hidden');
    if (alertPanel) alertPanel.classList.add('hidden');
    currentStock = null;
    searchInput.value = '';
    dropdownList.classList.add('hidden');
    dropdownList.innerHTML = '';
    syncFavoriteButton();
  }

  function renderFavoritePanel() {
    if (!favoritePanel || !favoriteList || !favoriteListCount) return;

    favoriteListCount.textContent = String(favoriteStocks.length);
    favoriteList.innerHTML = '';

    if (favoriteStocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'favorites-empty';
      empty.textContent = '즐겨찾기가 없습니다.';
      favoriteList.appendChild(empty);
      return;
    }

    favoriteStocks.forEach((item, index) => {
      const stock = resolveFavoriteStock(item);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'favorite-item';
      if (currentStock && getStockKey(currentStock) === getStockKey(stock)) row.classList.add('active');

      row.draggable = true;
      row.dataset.originalIndex = index;

      row.addEventListener('dragstart', (e) => {
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        const currentItems = Array.from(favoriteList.querySelectorAll('.favorite-item'));
        const newFavoriteStocks = [];
        currentItems.forEach((itemEl) => {
          const origIdx = parseInt(itemEl.dataset.originalIndex, 10);
          newFavoriteStocks.push(favoriteStocks[origIdx]);
        });
        favoriteStocks = newFavoriteStocks;
        saveFavoriteStocks();
        renderFavoritePanel();
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingEl = favoriteList.querySelector('.dragging');
        if (!draggingEl || draggingEl === row) return;

        const bounding = row.getBoundingClientRect();
        const offset = e.clientY - bounding.top - bounding.height / 2;
        if (offset < 0) {
          favoriteList.insertBefore(draggingEl, row);
        } else {
          favoriteList.insertBefore(draggingEl, row.nextSibling);
        }
      });

      const main = document.createElement('div');
      main.className = 'favorite-item-main';

      const name = document.createElement('div');
      name.className = 'favorite-item-name';
      name.textContent = stock.name;

      const meta = document.createElement('div');
      meta.className = 'favorite-item-meta';

      const code = document.createElement('span');
      code.className = 'favorite-item-code';
      code.textContent = displayCode(stock);

      const market = document.createElement('span');
      market.textContent = stock.market || '';

      meta.appendChild(code);
      meta.appendChild(market);
      main.appendChild(name);
      main.appendChild(meta);

      const alertState = favoriteAlertMap.get(getStockKey(stock));

      // 주가 섹션
      const right = document.createElement('div');
      right.className = 'favorite-item-right';

      const itemPriceEl = document.createElement('div');
      itemPriceEl.className = 'favorite-item-price';

      const itemRatioEl = document.createElement('div');
      itemRatioEl.className = 'favorite-item-ratio';

      if (alertState && alertState.price !== undefined) {
        const currency = alertState.currency || 'KRW';
        const isJP = currency === 'JPY';
        const isKRW = currency === 'KRW';
        const fractionDigits = isJP || isKRW ? 0 : 2;
        const locale = isJP ? 'ja-JP' : isKRW ? 'ko-KR' : 'en-US';
        itemPriceEl.textContent = `${alertState.price.toLocaleString(locale, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        })} ${currency}`;
        const ratio = alertState.ratio;
        itemRatioEl.textContent = `${ratio >= 0 ? '+' : ''}${ratio.toFixed(2)}%`;
        itemRatioEl.classList.add(ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat');
      } else {
        itemPriceEl.textContent = '-';
        itemRatioEl.textContent = '-';
        itemRatioEl.classList.add('flat');
      }

      right.appendChild(itemPriceEl);
      right.appendChild(itemRatioEl);

      const dot = document.createElement('span');
      dot.className = 'favorite-item-alert';
      if (alertState?.up) dot.classList.add('visible', 'up');
      else if (alertState?.down) dot.classList.add('visible', 'down');

      row.appendChild(main);
      row.appendChild(right);
      row.appendChild(dot);
      row.addEventListener('click', (e) => {
        // 드래그가 끝났을 때의 클릭 이벤트 발생을 방지하거나 구분
        // dragend 직후 click이 바로 발생할 수 있으므로, 드래그 상태가 해제된 지 얼마 안 되었다면 동작을 막아야 할 수도 있음.
        // 다만 row.classList.contains('dragging')는 이미 dragend에서 지워지므로 다른 방법이 필요할 수 있음.
        // HTML5 drag 앤 drop에서는 drag 시 click이 보통 트리거되지 않지만, 브라우저에 따라 발생할 수도 있음.
        // 확인 결과: HTML5 Drag start가 되면 dragend로 마무리되고, 마우스를 뗄 때 click 이벤트는 일반적으로 발생하지 않음 (드래그 마우스 다운 -> 이동 -> 업 은 클릭으로 인정 안 됨).
        // 따라서 그냥 평소대로 selectStock을 하도록 둠.
        selectStock(stock);
        setFavoritePanelOpen(false);
      });

      favoriteList.appendChild(row);
    });
  }

  function toggleCurrentFavorite() {
    if (!currentStock) return;

    const key = getStockKey(currentStock);
    const index = favoriteStocks.findIndex((item) => getStockKey(item) === key);
    if (index >= 0) {
      favoriteStocks.splice(index, 1);
    } else {
      favoriteStocks.unshift({
        code: currentStock.code,
        name: currentStock.name,
        country: currentStock.country,
        market: currentStock.market
      });
    }

    saveFavoriteStocks();
    syncFavoriteButton();
    renderFavoritePanel();
    refreshFavoriteAlerts();
  }

  async function fetchFavoritePriceInfo(stock) {
    if (stock.country === 'JP' || stock.country === 'US') {
      return fetchYahooPrice(stock);
    }

    const response = await fetch(`/api/stock/${stock.code}/price?pageSize=1&page=1`);
    if (!response.ok) throw new Error('Naver API failed');

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No price data');

    const priceInfo = data[0];
    return {
      price: Number(String(priceInfo.closePrice).replace(/,/g, '').trim()),
      change: Number(String(priceInfo.compareToPreviousClosePrice || '0').replace(/,/g, '').trim()),
      ratio: parseFloat(priceInfo.fluctuationsRatio) || 0,
      currency: 'KRW'
    };
  }

  async function refreshFavoriteAlerts() {
    if (!favoriteStocks.length) {
      favoriteAlertMap = new Map();
      setFavoriteAlert(false, false);
      renderFavoritePanel();
      return;
    }

    try {
      const results = await Promise.allSettled(
        favoriteStocks.map(async (stock) => {
          const info = await fetchFavoritePriceInfo(stock);
          const alertType = stock.alertType || 'percent';
          const alertVal = stock.alertValue !== undefined ? stock.alertValue : 3.0;

          let up = false;
          let down = false;

          if (alertType === 'percent') {
            up = info.ratio >= alertVal;
            down = info.ratio <= -alertVal;
          } else if (alertType === 'price_above') {
            up = info.price >= alertVal;
          } else if (alertType === 'price_below') {
            down = info.price <= alertVal;
          }

          return { 
            key: getStockKey(stock), 
            up, 
            down, 
            price: info.price, 
            ratio: info.ratio, 
            currency: info.currency 
          };
        })
      );

      const nextMap = new Map();
      for (const result of results) {
        if (result.status === 'fulfilled') {
          nextMap.set(result.value.key, { 
            up: result.value.up, 
            down: result.value.down, 
            price: result.value.price, 
            ratio: result.value.ratio, 
            currency: result.value.currency 
          });
        }
      }

      favoriteAlertMap = nextMap;
      const anyUp = Array.from(nextMap.values()).some((v) => v.up);
      const anyDown = Array.from(nextMap.values()).some((v) => v.down);
      setFavoriteAlert(anyUp, anyDown);
      renderFavoritePanel();
    } catch (e) {
      console.warn('Favorite alert refresh failed:', e);
      favoriteAlertMap = new Map();
      setFavoriteAlert(false, false);
      renderFavoritePanel();
    }
  }

  function renderDropdown(stockList) {
    dropdownList.innerHTML = '';
    if (stockList.length === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'no-results';
      noRes.textContent = '결과 없음';
      dropdownList.appendChild(noRes);
    } else {
      stockList.forEach((stock, index) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.index = index;

        const name = document.createElement('span');
        name.className = 'dropdown-item-name';
        name.textContent = stock.name;

        const meta = document.createElement('div');
        meta.className = 'dropdown-item-meta';

        const code = document.createElement('span');
        code.className = 'dropdown-item-code';
        code.textContent = displayCode(stock);

        meta.appendChild(code);
        item.appendChild(name);
        item.appendChild(meta);
        item.addEventListener('click', () => selectStock(stock));
        dropdownList.appendChild(item);
      });
    }
    dropdownList.classList.remove('hidden');
  }

  function getLocalKoreanStocks(raw) {
    const query = raw.toLowerCase().replace(/\s+/g, '');
    const isChosung = /^[ㄱ-ㅎ]+$/.test(query);

    return stocks.filter((stock) => {
      if (isChosung) return stock.chosung.includes(query);
      const nameClean = stock.name.toLowerCase().replace(/\s+/g, '');
      return nameClean.includes(query) || stock.code.includes(query);
    }).slice(0, 5);
  }

  function mapYahooMarket(quote) {
    if (quote.symbol?.endsWith('.T')) return 'TSE';
    if (quote.exchange === 'NYQ') return 'NYSE';
    if (quote.exchange === 'ASE') return 'AMEX';
    if (['NMS', 'NGM', 'NCM'].includes(quote.exchange)) return 'NASDAQ';
    return quote.exchange || 'US';
  }

  function mapYahooQuote(quote, country) {
    return {
      code: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol,
      market: mapYahooMarket(quote),
      country
    };
  }

  async function searchYahooStocks(raw) {
    const res = await fetch(`/api/yahoo/v1/finance/search?q=${encodeURIComponent(raw)}&quotesCount=12&newsCount=0&lang=en-US`);
    if (!res.ok) return [];

    const data = await res.json();
    const seen = new Set();
    return (data.quotes || [])
      .filter((quote) => quote.quoteType === 'EQUITY' && quote.symbol)
      .map((quote) => {
        if (quote.symbol.endsWith('.T')) return mapYahooQuote(quote, 'JP');
        if (US_EXCHANGES.has(quote.exchange)) return mapYahooQuote(quote, 'US');
        return null;
      })
      .filter(Boolean)
      .filter((stock) => {
        if (seen.has(stock.code)) return false;
        seen.add(stock.code);
        return true;
      })
      .slice(0, 10);
  }

  function showSuggestions(value) {
    clearTimeout(globalSearchTimer);
    activeIndex = -1;

    const raw = value.trim();
    if (!raw) {
      dropdownList.innerHTML = '';
      dropdownList.classList.add('hidden');
      return;
    }

    const krStocks = getLocalKoreanStocks(raw);
    filteredStocks = [...krStocks];
    renderDropdown(filteredStocks);

    globalSearchTimer = setTimeout(async () => {
      try {
        const globalStocks = await searchYahooStocks(raw);
        if (searchInput.value.trim() !== raw) return;

        const localCodes = new Set(krStocks.map((stock) => stock.code));
        filteredStocks = [...krStocks, ...globalStocks.filter((stock) => !localCodes.has(stock.code))].slice(0, 12);
        renderDropdown(filteredStocks);
      } catch (e) {
        console.warn('Global stock search error:', e);
      }
    }, 350);
  }

  function setPriceChange(priceChangeTarget, indicatorEl, valueEl, ratioEl, change, ratio, fractionDigits = 2) {
    valueEl.textContent = `${change >= 0 ? '+' : ''}${change.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    })}`;
    ratioEl.textContent = `(${ratio >= 0 ? '+' : ''}${ratio.toFixed(2)}%)`;

    if (ratio > 0) {
      priceChangeTarget.className = 'stock-price-change up';
      indicatorEl.textContent = '▲';
    } else if (ratio < 0) {
      priceChangeTarget.className = 'stock-price-change down';
      indicatorEl.textContent = '▼';
    } else {
      priceChangeTarget.className = 'stock-price-change flat';
      indicatorEl.textContent = '-';
    }
  }

  async function fetchYahooPrice(stock) {
    const res = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(stock.code)}?interval=1d&range=2d`);
    if (!res.ok) throw new Error('Yahoo Finance fetch failed');

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No chart result');

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose || price;
    const change = price - prevClose;
    const ratio = prevClose ? (change / prevClose) * 100 : 0;
    const currency = meta.currency || (stock.country === 'JP' ? 'JPY' : 'USD');
    return { price, change, ratio, currency };
  }

  async function selectStock(stock) {
    currentStock = stock;
    searchInput.value = stock.name;
    dropdownList.classList.add('hidden');

    badge.className = 'market-badge hidden-label';
    badge.textContent = '';
    codeEl.textContent = displayCode(stock);
    nameEl.textContent = stock.name;
    syncFavoriteButton();
    renderFavoritePanel();

    if (alertPanel) alertPanel.classList.add('hidden');
    
    if (alertToggle) {
      const isFav = isFavorite(stock);
      alertToggle.classList.toggle('hidden', !isFav);
      
      if (isFav) {
        const key = getStockKey(stock);
        const favItem = favoriteStocks.find((item) => getStockKey(item) === key);
        if (favItem) {
          const type = favItem.alertType || 'percent';
          const val = favItem.alertValue !== undefined ? favItem.alertValue : 3.0;
          
          const rad = document.querySelector(`input[name="alert-type"][value="${type}"]`);
          if (rad) rad.checked = true;
          
          toggleAlertInputs(type);
          
          if (type === 'percent') {
            alertPercentValue.value = val;
          } else if (type === 'price_above' || type === 'price_below') {
            alertPriceValue.value = val;
          }
          
          const hasCustomAlert = type !== 'none';
          alertToggle.classList.toggle('active', hasCustomAlert);
        }
      }
    }
    
    if (alertPriceUnit) {
      alertPriceUnit.textContent = stock.country === 'JP' ? 'JPY' : stock.country === 'US' ? 'USD' : 'KRW';
    }

    priceEl.textContent = '로딩 중...';
    priceChangeEl.className = 'stock-price-change';
    changeIndicatorEl.textContent = '';
    changeValEl.textContent = '';
    changeRatioEl.textContent = '';
    infoPanel.classList.remove('hidden');

    try {
      if (stock.country === 'JP' || stock.country === 'US') {
        const priceInfo = await fetchYahooPrice(stock);
        const locale = stock.country === 'JP' ? 'ja-JP' : 'en-US';
        const fractionDigits = stock.country === 'JP' ? 0 : 2;
        priceEl.textContent = `${priceInfo.price.toLocaleString(locale, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits
        })} ${priceInfo.currency}`;
        setPriceChange(priceChangeEl, changeIndicatorEl, changeValEl, changeRatioEl, priceInfo.change, priceInfo.ratio, fractionDigits);
        return;
      }

      const response = await fetch(`/api/stock/${stock.code}/price?pageSize=1&page=1`);
      if (!response.ok) throw new Error('Naver API failed');

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No price data');

      const priceInfo = data[0];
      const rawPrice = priceInfo.closePrice;
      const rawChange = Number(String(priceInfo.compareToPreviousClosePrice || '0').replace(/,/g, '').trim());
      const rawRatio = parseFloat(priceInfo.fluctuationsRatio) || 0;

      priceEl.textContent = `${rawPrice} KRW`;
      setPriceChange(priceChangeEl, changeIndicatorEl, changeValEl, changeRatioEl, rawChange, rawRatio, 0);
    } catch (error) {
      console.error('Stock price fetch error:', error);
      priceEl.textContent = '조회 실패';
      priceChangeEl.className = 'stock-price-change flat';
      changeIndicatorEl.textContent = '-';
      changeValEl.textContent = '';
      changeRatioEl.textContent = '';
    }
  }

  function formatExchangeUpdateTime(value) {
    if (value === null || value === undefined || value === '') return '';

    let date;
    if (typeof value === 'number') {
      date = new Date(value > 1e12 ? value : value * 1000);
    } else {
      date = new Date(value);
      if (Number.isNaN(date.getTime()) && /^\d+$/.test(String(value))) {
        const numericValue = Number(value);
        date = new Date(numericValue > 1e12 ? numericValue : numericValue * 1000);
      }
    }

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  }

  async function fetchExchangeData() {
    const urls = ['/api/exchange/v6/latest/USD', 'https://open.er-api.com/v6/latest/USD'];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        if (data.result !== 'success') throw new Error('API result not success');
        return data;
      } catch (e) {
        // Try next source.
      }
    }
    throw new Error('Exchange rate fetch failed');
  }

  async function loadExchangeRates() {
    try {
      const data = await fetchExchangeData();
      const usdRate = data.rates.KRW;
      const jpyRate = (data.rates.KRW / data.rates.JPY) * 100;
      const rateUpdatedAt = formatExchangeUpdateTime(
        data.time_last_update_utc || data.time_last_update_unix || data.time_next_update_utc || data.time_next_update_unix
      );

      document.getElementById('usd-rate').textContent = `${usdRate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KRW`;
      document.getElementById('jpy-rate').textContent = `${jpyRate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KRW`;
      const updatedEl = document.getElementById('exchange-updated');
      if (updatedEl) updatedEl.textContent = rateUpdatedAt ? `Updated at: ${rateUpdatedAt} KST` : '';
    } catch (err) {
      console.error('Exchange rate error:', err);
      document.getElementById('usd-rate').textContent = '연결 실패';
      document.getElementById('jpy-rate').textContent = '연결 실패';
      const updatedEl = document.getElementById('exchange-updated');
      if (updatedEl) updatedEl.textContent = '';
    }
  }

  searchInput.addEventListener('input', (e) => showSuggestions(e.target.value));

  searchInput.addEventListener('keydown', (e) => {
    if (dropdownList.classList.contains('hidden')) return;
    const items = dropdownList.querySelectorAll('.dropdown-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredStocks.length) selectStock(filteredStocks[activeIndex]);
    } else if (e.key === 'Escape') {
      dropdownList.classList.add('hidden');
    }
  });

  function updateActiveItem(items) {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdownList.contains(e.target)) {
      dropdownList.classList.add('hidden');
    }
    if (
      favoritePanelOpen &&
      favoritePanel &&
      favoritePanelToggle &&
      !favoritePanel.contains(e.target) &&
      !favoritePanelToggle.contains(e.target)
    ) {
      setFavoritePanelOpen(false);
    }
  });

  loadStockList();

  function toggleAlertInputs(type) {
    if (!alertPercentInputs || !alertPriceInputs) return;
    if (type === 'percent') {
      alertPercentInputs.classList.remove('hidden');
      alertPriceInputs.classList.add('hidden');
    } else if (type === 'price_above' || type === 'price_below') {
      alertPercentInputs.classList.add('hidden');
      alertPriceInputs.classList.remove('hidden');
    } else {
      alertPercentInputs.classList.add('hidden');
      alertPriceInputs.classList.add('hidden');
    }
  }

  document.querySelectorAll('input[name="alert-type"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      toggleAlertInputs(e.target.value);
    });
  });

  if (alertToggle) {
    alertToggle.addEventListener('click', () => {
      if (alertPanel) alertPanel.classList.toggle('hidden');
    });
  }

  if (alertSaveBtn) {
    alertSaveBtn.addEventListener('click', () => {
      if (!currentStock) return;

      const key = getStockKey(currentStock);
      const favItem = favoriteStocks.find((item) => getStockKey(item) === key);
      if (!favItem) return;

      const selectedType = document.querySelector('input[name="alert-type"]:checked').value;
      let val = 3.0;

      if (selectedType === 'percent') {
        val = parseFloat(alertPercentValue.value);
        if (Number.isNaN(val) || val <= 0) {
          alert('올바른 등락률을 입력해주세요.');
          return;
        }
      } else if (selectedType === 'price_above' || selectedType === 'price_below') {
        val = parseFloat(alertPriceValue.value);
        if (Number.isNaN(val) || val <= 0) {
          alert('올바른 가격을 입력해주세요.');
          return;
        }
      }

      favItem.alertType = selectedType;
      favItem.alertValue = val;

      saveFavoriteStocks();
      if (alertPanel) alertPanel.classList.add('hidden');

      const hasCustomAlert = selectedType !== 'none';
      alertToggle.classList.toggle('active', hasCustomAlert);

      renderFavoritePanel();
      refreshFavoriteAlerts();
    });
  }

  if (favoritesRefreshBtn) {
    favoritesRefreshBtn.addEventListener('click', async () => {
      if (favoritesRefreshBtn.classList.contains('spinning')) return;

      favoritesRefreshBtn.classList.add('spinning');
      try {
        await refreshFavoriteAlerts();
      } catch (e) {
        console.error('Manual alerts refresh failed:', e);
      } finally {
        // 시각적 피드백 효과를 위해 최소 600ms 회전 애니메이션 유지
        setTimeout(() => {
          favoritesRefreshBtn.classList.remove('spinning');
        }, 600);
      }
    });
  }

  if (favoritePanelToggle) {
    favoritePanelToggle.addEventListener('click', () => setFavoritePanelOpen(!favoritePanelOpen));
  }
  if (favoriteToggle) {
    favoriteToggle.addEventListener('click', toggleCurrentFavorite);
  }
  if (stockPanelClose) {
    stockPanelClose.addEventListener('click', closeCurrentStockPanel);
  }

  syncFavoriteButton();
  renderFavoritePanel();
  refreshFavoriteAlerts();
  
  // 환율 표기 숨김 및 호출 차단 (코드 미삭제, 주석 처리)
  // loadExchangeRates();
  
  setInterval(refreshFavoriteAlerts, 5 * 60 * 1000);
  // setInterval(loadExchangeRates, 30 * 60 * 1000);
});

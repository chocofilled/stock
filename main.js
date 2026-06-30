document.addEventListener('DOMContentLoaded', () => {
  const ptrContainer = document.getElementById('pull-to-refresh');
  const ptrText = document.getElementById('ptr-text');
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
  const themeBoard = document.getElementById('theme-board');
  const searchSection = document.querySelector('.search-section');
  const exchangeBox = document.getElementById('exchange-box');
  const exchangeMainContent = document.getElementById('exchange-main-content');
  const exchangeTooltipContent = document.getElementById('exchange-tooltip-content');
  const themeDataCache = new Map();
  const activeRequests = new Map();
  const priceCache = new Map();

  function getCacheKey(stock, type) {
    return `${stock.country || 'KR'}:${stock.code}:${type}`;
  }

  async function getCachedOrFetch(stock, type, fetchFn) {
    const key = getCacheKey(stock, type);
    const now = Date.now();
    
    const cached = priceCache.get(key);
    if (cached && cached.expires > now) {
      return cached.data;
    }
    
    if (activeRequests.has(key)) {
      return activeRequests.get(key);
    }
    
    const requestPromise = fetchFn()
      .then((data) => {
        priceCache.set(key, {
          data,
          expires: Date.now() + 10000 // 10s cache
        });
        activeRequests.delete(key);
        return data;
      })
      .catch((err) => {
        activeRequests.delete(key);
        throw err;
      });
      
    activeRequests.set(key, requestPromise);
    return requestPromise;
  }

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function showThemeTooltip(themeId) {
    if (!exchangeTooltipContent || !exchangeMainContent) return;
    const data = themeDataCache.get(themeId);
    if (!data) return;

    const { name, avgChange, details } = data;
    const avgColor = avgChange > 0 ? '#ff0055' : (avgChange < 0 ? '#00aaff' : '#ffffff');
    let html = `<div style="text-align: center; font-weight: bold; border-bottom: 1px dashed #777788; margin-bottom: 8px; padding-bottom: 6px;">`;
    html += `${name} <span style="color: ${avgColor}">${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%</span>`;
    html += `</div>`;

    if (details && details.length > 0) {
      html += `<div style="display: grid; grid-template-columns: auto 1fr auto; column-gap: 8px; row-gap: 6px; font-size: 11px; align-items: center; width: 100%;">`;
      html += details.map(d => {
        const formattedPrice = d.price !== undefined ? d.price.toLocaleString('ko-KR') + '원' : '로딩 실패';
        const sign = d.ratio >= 0 ? '+' : '';
        const color = d.ratio > 0 ? '#ff0055' : (d.ratio < 0 ? '#00aaff' : '#ffffff');
        return `<span style="color: #cccccc; text-align: left;">${d.name}</span>` +
               `<span style="color: ${color}; text-align: right; font-family: 'Press Start 2P', monospace; font-size: 8px;">${formattedPrice}</span>` +
               `<span style="color: ${color}; text-align: right; font-family: 'Press Start 2P', monospace; font-size: 8px;">(${sign}${d.ratio.toFixed(2)}%)</span>`;
      }).join('');
      html += `</div>`;
    } else {
      html += `<div style="text-align: center; color: #777788; padding: 10px 0;">데이터를 불러오는 중입니다...</div>`;
    }

    exchangeTooltipContent.innerHTML = html;
    exchangeMainContent.style.display = 'none';
    exchangeTooltipContent.style.display = 'flex';
  }

  function hideThemeTooltip() {
    if (!exchangeTooltipContent || !exchangeMainContent) return;
    exchangeTooltipContent.style.display = 'none';
    exchangeMainContent.style.display = '';
  }

  // 툴팁 영역 자체를 클릭(터치)하면 툴팁을 닫도록 설정
  if (exchangeTooltipContent) {
    const handleTooltipClose = (e) => {
      e.stopPropagation();
      hideThemeTooltip();
      if (themeBoard) {
        themeBoard.querySelectorAll('.theme-item').forEach(el => el.classList.remove('touch-active'));
      }
    };
    if (isTouchDevice) {
      exchangeTooltipContent.addEventListener('touchstart', handleTooltipClose, { passive: true });
    } else {
      exchangeTooltipContent.addEventListener('click', handleTooltipClose);
    }
  }

  const favoritesOrderToggleBtn = document.getElementById('favorites-order-toggle');

  const chartContainer = document.getElementById('stock-chart-container');
  const chartPeriodVal = document.getElementById('chart-period-val');
  const sparklineCanvas = document.getElementById('stock-sparkline-canvas');

  const newsContainer = document.getElementById('stock-news-container');
  const newsCountBadge = document.getElementById('news-count-badge');
  const newsSummaryBox = document.getElementById('news-summary-box');
  const newsList = document.getElementById('news-list');

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
  let openedFromFavorites = false;
  let favoritesOrderEditing = false;

  const RETRO_THEMES = [
    { id: 'semicon', name: '반도체', stocks: ['005930', '000660', '000990', '042700', '403870'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="3" y="3" width="10" height="10" fill="#3a3d52"/><rect x="5" y="5" width="6" height="6" fill="#1b1e2c"/><rect x="7" y="7" width="2" height="2" fill="#00ffcc"/><rect x="5" y="1" width="2" height="2" fill="#ffe600"/><rect x="9" y="1" width="2" height="2" fill="#ffe600"/><rect x="5" y="13" width="2" height="2" fill="#ffe600"/><rect x="9" y="13" width="2" height="2" fill="#ffe600"/><rect x="1" y="5" width="2" height="2" fill="#ffe600"/><rect x="1" y="9" width="2" height="2" fill="#ffe600"/><rect x="13" y="5" width="2" height="2" fill="#ffe600"/><rect x="13" y="9" width="2" height="2" fill="#ffe600"/></svg>` },
    { id: 'ai', name: 'AI/클라우드', stocks: ['035420', '035720', '030200', '032640', '017670'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="5" y="2" width="6" height="6" fill="#bd00ff"/><rect x="4" y="4" width="8" height="3" fill="#bd00ff"/><rect x="6" y="1" width="4" height="1" fill="#bd00ff"/><rect x="7" y="4" width="2" height="2" fill="#ffffff"/><rect x="6" y="8" width="4" height="2" fill="#777788"/><rect x="7" y="10" width="2" height="1" fill="#ffe600"/><rect x="2" y="5" width="2" height="1" fill="#00ffcc"/><rect x="12" y="5" width="2" height="1" fill="#00ffcc"/><rect x="8" y="12" width="1" height="2" fill="#00ffcc"/></svg>` },
    { id: 'game', name: '게임/엔터', stocks: ['259960', '251270', '036570', '352820', '041510'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="1" y="4" width="14" height="8" fill="#555566"/><rect x="2" y="5" width="12" height="6" fill="#1b1e2c"/><rect x="4" y="7" width="3" height="2" fill="#ffffff"/><rect x="5" y="6" width="1" height="4" fill="#ffffff"/><rect x="10" y="8" width="2" height="2" fill="#ff0055"/><rect x="12" y="6" width="2" height="2" fill="#ff0055"/></svg>` },
    { id: 'finance', name: '금융/은행', stocks: ['105560', '055550', '138040', '086790', '316140'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="4" y="2" width="8" height="12" fill="#ffe600"/><rect x="2" y="4" width="12" height="8" fill="#ffe600"/><rect x="3" y="3" width="10" height="10" fill="#ffaa00"/><rect x="5" y="4" width="6" height="8" fill="#ffe600"/><rect x="7" y="5" width="2" height="6" fill="#111424"/><rect x="6" y="6" width="4" height="1" fill="#111424"/><rect x="6" y="9" width="4" height="1" fill="#111424"/><rect x="7" y="3" width="1" height="10" fill="#111424"/></svg>` },
    { id: 'bio', name: '제약/바이오', stocks: ['207940', '068270', '000100', '128940', '196170'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="3" y="4" width="10" height="9" fill="#111424" opacity="0.3"/><rect x="3" y="9" width="4" height="4" fill="#ffffff"/><rect x="4" y="8" width="4" height="4" fill="#ffffff"/><rect x="5" y="7" width="4" height="4" fill="#ffffff"/><rect x="7" y="5" width="4" height="4" fill="#ff0055"/><rect x="8" y="4" width="4" height="4" fill="#ff0055"/><rect x="9" y="3" width="4" height="4" fill="#ff0055"/><rect x="11" y="4" width="1" height="1" fill="#ffffff"/></svg>` },
    { id: 'car', name: '자동차', stocks: ['005380', '000270', '012330', '018880', '011210'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="2" y="7" width="12" height="4" fill="#ff0055"/><rect x="4" y="5" width="7" height="2" fill="#ff0055"/><rect x="7" y="5" width="3" height="2" fill="#00ffcc"/><rect x="3" y="10" width="3" height="3" fill="#111424"/><rect x="10" y="10" width="3" height="3" fill="#111424"/><rect x="4" y="11" width="1" height="1" fill="#ffe600"/><rect x="11" y="11" width="1" height="1" fill="#ffe600"/><rect x="1" y="6" width="2" height="2" fill="#ffffff"/></svg>` },
    { id: 'energy', name: '에너지', stocks: ['034020', '015760', '267260', '298040', '082920'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="8" y="1" width="2" height="2" fill="#ffe600"/><rect x="7" y="3" width="3" height="2" fill="#ffe600"/><rect x="6" y="5" width="4" height="2" fill="#ffe600"/><rect x="4" y="7" width="9" height="2" fill="#ffe600"/><rect x="6" y="9" width="4" height="2" fill="#ffe600"/><rect x="5" y="11" width="3" height="2" fill="#ffe600"/><rect x="4" y="13" width="2" height="2" fill="#ffe600"/><rect x="1" y="7" width="2" height="2" fill="#00ffcc"/><rect x="13" y="6" width="2" height="2" fill="#00ffcc"/></svg>` },
    { id: 'battery', name: '2차전지', stocks: ['373220', '086520', '003670', '005490', '006400'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="7" y="1" width="2" height="1" fill="#ffffff"/><rect x="4" y="2" width="8" height="13" fill="#ffffff"/><rect x="5" y="3" width="6" height="11" fill="#1b1e2c"/><rect x="6" y="4" width="4" height="9" fill="#00ffcc"/><rect x="7" y="6" width="2" height="2" fill="#ffe600"/><rect x="6" y="8" width="2" height="2" fill="#ffe600"/></svg>` },
    { id: 'robot', name: '로보틱스', stocks: ['454910', '277810', '348210', '090470', '214150'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="7" y="1" width="2" height="2" fill="#ffe600"/><rect x="7" y="3" width="2" height="3" fill="#ffffff"/><rect x="3" y="6" width="10" height="8" fill="#777788"/><rect x="4" y="7" width="8" height="6" fill="#555566"/><rect x="2" y="9" width="1" height="2" fill="#ffffff"/><rect x="13" y="9" width="1" height="2" fill="#ffffff"/><rect x="5" y="8" width="2" height="2" fill="#00ffcc"/><rect x="9" y="8" width="2" height="2" fill="#00ffcc"/><rect x="6" y="11" width="4" height="1" fill="#ff0055"/></svg>` },
    { id: 'food', name: 'K-푸드', stocks: ['003230', '004370', '001680', '097950', '017810'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="2" y="7" width="12" height="6" fill="#ff0055"/><rect x="3" y="13" width="10" height="1" fill="#ff0055"/><rect x="4" y="14" width="8" height="1" fill="#ff0055"/><rect x="3" y="6" width="10" height="1" fill="#ffe600"/><rect x="4" y="9" width="2" height="2" fill="#ffffff"/><rect x="10" y="9" width="2" height="2" fill="#ffffff"/><rect x="11" y="2" width="4" height="1" fill="#ffe600"/><rect x="9" y="3" width="3" height="1" fill="#ffe600"/><rect x="7" y="4" width="3" height="1" fill="#ffe600"/><rect x="5" y="5" width="3" height="1" fill="#ffe600"/></svg>` },
    { id: 'beauty', name: '화장품', stocks: ['090430', '192820', '161890', '278470', '214420'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="5" y="8" width="6" height="7" fill="#1b1e2c" stroke="#ffffff" stroke-width="1"/><rect x="6" y="9" width="4" height="1" fill="#ffe600"/><rect x="6" y="5" width="4" height="3" fill="#ff0055"/><rect x="6" y="4" width="3" height="1" fill="#ff0055"/><rect x="6" y="3" width="2" height="1" fill="#ff0055"/><rect x="8" y="5" width="1" height="2" fill="#ffffff"/></svg>` },
    { id: 'defense', name: '방산', stocks: ['012450', '079550', '064350', '047810', '103140'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="2" y="8" width="12" height="4" fill="#777788"/><rect x="3" y="12" width="10" height="2" fill="#111424"/><rect x="5" y="5" width="6" height="3" fill="#777788"/><rect x="10" y="3" width="4" height="2" fill="#ffe600"/><rect x="9" y="4" width="2" height="2" fill="#777788"/><rect x="4" y="12" width="1" height="1" fill="#ffffff"/><rect x="7" y="12" width="1" height="1" fill="#ffffff"/><rect x="10" y="12" width="1" height="1" fill="#ffffff"/></svg>` },
    { id: 'ship', name: '조선/중공업', stocks: ['329180', '010140', '042660', '009540', '443060'], icon: `<svg class="theme-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><rect x="0" y="13" width="16" height="3" fill="#00aaff"/><rect x="2" y="12" width="12" height="1" fill="#00ffcc"/><rect x="2" y="9" width="12" height="3" fill="#555566"/><rect x="1" y="8" width="12" height="1" fill="#ff0055"/><rect x="3" y="5" width="5" height="3" fill="#ffffff"/><rect x="5" y="4" width="2" height="1" fill="#ffffff"/><rect x="4" y="6" width="1" height="1" fill="#00ffcc"/><rect x="6" y="6" width="1" height="1" fill="#00ffcc"/><rect x="9" y="3" width="1" height="1" fill="#ffffff" opacity="0.6"/><rect x="10" y="1" width="2" height="2" fill="#ffffff" opacity="0.4"/></svg>` }
  ];

  async function loadThemeBoard() {
    if (!themeBoard) return;
    
    // 1. 초기 로딩 시 흑백 구조 선마운트
    if (themeBoard.children.length === 0) {
      themeBoard.innerHTML = '';
      RETRO_THEMES.forEach((theme) => {
        const item = document.createElement('div');
        item.className = 'theme-item gray';
        item.dataset.themeId = theme.id;
        item.title = `${theme.name} (로딩 중...)`;

        const iconContainer = document.createElement('span');
        iconContainer.className = 'theme-item-icon';
        iconContainer.innerHTML = theme.icon;

        item.appendChild(iconContainer);

        // 공통 토글 함수 (선택 시 열림, 한 번 더 선택 시 닫힘)
        const toggleTooltip = (e) => {
          if (e.cancelable) {
            e.preventDefault();
          }
          e.stopPropagation();
          const alreadyActive = item.classList.contains('touch-active');
          themeBoard.querySelectorAll('.theme-item').forEach(el => el.classList.remove('touch-active'));
          
          if (!alreadyActive) {
            item.classList.add('touch-active');
            showThemeTooltip(theme.id);
          } else {
            hideThemeTooltip();
          }
        };

        if (isTouchDevice) {
          item.addEventListener('touchstart', toggleTooltip, { passive: false });
        } else {
          item.addEventListener('click', toggleTooltip);
          // PC용 호버 동작
          item.addEventListener('mouseenter', () => {
            const hasTouchActive = themeBoard.querySelector('.theme-item.touch-active');
            if (!hasTouchActive) {
              showThemeTooltip(theme.id);
            }
          });
          item.addEventListener('mouseleave', () => {
            const hasTouchActive = themeBoard.querySelector('.theme-item.touch-active');
            if (!hasTouchActive) {
              hideThemeTooltip();
            }
          });
        }

        themeBoard.appendChild(item);
      });

      // 문서 전체에 터치/클릭 리스너 1회 선언하여 뱃지 밖을 터치/클릭하면 툴팁 회수
      const handleOutsideClick = (e) => {
        if (!e.target.closest('.theme-item')) {
          themeBoard.querySelectorAll('.theme-item').forEach(el => el.classList.remove('touch-active'));
          hideThemeTooltip();
        }
      };

      if (isTouchDevice) {
        document.addEventListener('touchstart', handleOutsideClick, { passive: true });
      } else {
        document.addEventListener('click', handleOutsideClick);
      }
    }

    try {
      // 2. 대장주 5선 시세 변동률 및 주가 정보 비동기 계산
      const results = await Promise.allSettled(
        RETRO_THEMES.map(async (theme) => {
          const stockDetails = await Promise.allSettled(
            theme.stocks.map(async (code) => {
              const res = await fetchKoreanRealtimePrice({ code });
              return {
                name: res.name || code,
                price: res.price,
                ratio: res.ratio || 0
              };
            })
          );

          let sum = 0;
          let count = 0;
          const details = [];
          stockDetails.forEach((p) => {
            if (p.status === 'fulfilled') {
              sum += p.value.ratio;
              count++;
              details.push(p.value);
            }
          });

          const avgChange = count > 0 ? sum / count : 0;
          return { id: theme.id, name: theme.name, avgChange, details };
        })
      );

      // 3. 연산 완료된 결과를 내림차순 정렬 (많이 오른 테마가 먼저 오도록)
      const sortedResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => b.avgChange - a.avgChange);

      // 4. 정렬 순서에 맞게 DOM 노드를 다시 붙이고 상태 갱신
      sortedResults.forEach((result) => {
        const { id, name, avgChange, details } = result;
        
        // 캐시 업데이트
        themeDataCache.set(id, { name, avgChange, details });

        const item = themeBoard.querySelector(`[data-theme-id="${id}"]`);
        if (item) {
          const isUp = avgChange > 0;
          item.className = `theme-item ${isUp ? 'active' : 'gray'}`;
          item.title = `${name} (${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%)`;

          // 활성화된 상태의 테마이면 공용 툴팁 패널도 실시간으로 다시 그리기
          if (item.classList.contains('touch-active') || item.matches(':hover')) {
            showThemeTooltip(id);
          }

          // DOM의 맨 마지막으로 다시 붙임으로써 sorted 순서가 화면에 실시간 반영됨!
          themeBoard.appendChild(item);
        }
      });
    } catch (e) {
      console.warn('Failed to load theme board metrics:', e);
    }
  }

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
    
    const STOCKS_CACHE_KEY = 'krx_stocks_cache_v1';
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24시간
    
    // 1. 로컬 캐시 조회
    let cachedData = null;
    try {
      const cached = localStorage.getItem(STOCKS_CACHE_KEY);
      if (cached) {
        cachedData = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached stock list:', e);
    }

    const now = Date.now();
    
    // 캐시가 유효하면 (24시간 경과 미만) 즉시 캐시에서 데이터 복원
    if (cachedData && cachedData.timestamp && (now - cachedData.timestamp < CACHE_EXPIRY) && Array.isArray(cachedData.stocks)) {
      stocks = cachedData.stocks;
      searchInput.disabled = false;
      searchInput.placeholder = '';
      console.log(`Loaded ${stocks.length} KRX stocks from LocalStorage Cache.`);
      searchLoader.classList.remove('active');
      return;
    }

    // 2. 캐시가 없거나 만료된 경우에만 네트워크에서 새 데이터 가져오기
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
      console.log(`Loaded ${stocks.length} KRX stocks from Network.`);
      
      // 로컬 스토리지 캐시 업데이트
      try {
        localStorage.setItem(STOCKS_CACHE_KEY, JSON.stringify({
          timestamp: now,
          stocks: stocks
        }));
      } catch (e) {
        console.warn('Failed to write stock list to cache:', e);
      }
    } else if (cachedData && Array.isArray(cachedData.stocks)) {
      // 네트워크 에러 발생 시 오래되었더라도 기존 캐시 데이터를 활용하여 작동성 유지 (폴백)
      stocks = cachedData.stocks;
      searchInput.disabled = false;
      searchInput.placeholder = '';
      console.log(`Network fetch failed. Restored ${stocks.length} KRX stocks from expired cache.`);
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
      if (!Array.isArray(parsed)) return [];
      
      const seen = new Set();
      const unique = [];
      parsed.forEach((item) => {
        const key = getStockKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });
      return unique;
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
    if (themeBoard) {
      themeBoard.classList.toggle('hidden', open);
    }
    if (favoritePanelToggle) {
      favoritePanelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      favoritePanelToggle.setAttribute('aria-label', open ? '즐겨찾기 목록 닫기' : '즐겨찾기 목록 열기');
    }
    if (open) {
      renderFavoritePanel();
    } else {
      // 즐겨찾기 패널 닫힐 때 → 순서 변경 모드 초기화
      favoritesOrderEditing = false;
      if (favoritesOrderToggleBtn) {
        favoritesOrderToggleBtn.classList.remove('active');
        favoritesOrderToggleBtn.textContent = '순서 변경';
      }
      // 즐겨찾기에서 열었던 상세정보도 함께 닫기
      if (openedFromFavorites) {
        openedFromFavorites = false;
        infoPanel.classList.add('hidden');
        if (alertPanel) alertPanel.classList.add('hidden');
        currentStock = null;
        searchInput.value = '';
        dropdownList.classList.add('hidden');
        dropdownList.innerHTML = '';
        syncFavoriteButton();
      }
      // 즐겨찾기가 닫힐 때 메인화면 영역(검색창, 환율) 복원
      if (searchSection) searchSection.style.display = '';
      if (exchangeBox) {
        exchangeBox.style.display = '';
        delete exchangeBox.dataset.visibleBefore;
      }
    }
  }

  function closeCurrentStockPanel(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation(); // document의 클릭 핸들러가 즐겨찾기 패널을 바로 닫지 않도록 이벤트 전파 방지
    }
    
    infoPanel.classList.add('hidden');
    if (alertPanel) alertPanel.classList.add('hidden');
    currentStock = null;
    searchInput.value = '';
    dropdownList.classList.add('hidden');
    dropdownList.innerHTML = '';
    syncFavoriteButton();

    // 즐겨찾기 모드에서 열린 상세 패널이었다면 검색창/환율박스 다시 표시
    if (openedFromFavorites) {
      if (searchSection) searchSection.style.display = '';
      if (exchangeBox && exchangeBox.dataset.visibleBefore === 'true') {
        exchangeBox.style.display = '';
        delete exchangeBox.dataset.visibleBefore;
      }
    }

    if (openedFromFavorites) {
      openedFromFavorites = false;
      setFavoritePanelOpen(true);
    }
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

      row.draggable = favoritesOrderEditing;
      row.dataset.originalIndex = index;

      row.addEventListener('dragstart', (e) => {
        if (!favoritesOrderEditing) {
          e.preventDefault();
          return;
        }
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
      });

      row.addEventListener('dragend', () => {
        if (!favoritesOrderEditing) return;
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
        if (!favoritesOrderEditing) return;
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

      // 터치 스크린용 드래그 앤 드롭 정렬 로직 (모바일 대응)
      let touchStartY = 0;
      let isTouchDragging = false;

      row.addEventListener('touchstart', (e) => {
        if (!favoritesOrderEditing) return;
        const touch = e.touches[0];
        touchStartY = touch.clientY;
        isTouchDragging = false;
        row.classList.add('dragging-pending');
      }, { passive: true });

      row.addEventListener('touchmove', (e) => {
        if (!favoritesOrderEditing) return;
        const touch = e.touches[0];
        const deltaY = Math.abs(touch.clientY - touchStartY);

        // 터치 시작 후 손가락이 6px 이상 상하로 이동하면 드래그 상태로 판정
        if (deltaY > 6) {
          isTouchDragging = true;
          row.classList.remove('dragging-pending');
          row.classList.add('dragging');
        }

        if (isTouchDragging) {
          // 브라우저의 기본 페이지 스크롤 동작을 무력화하여 오버스크롤/흔들림 방지
          if (e.cancelable) e.preventDefault();

          // 현재 손가락이 터치 중인 화면 좌표 밑의 DOM 엘리먼트 탐색
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          if (!element) return;

          const hoverItem = element.closest('.favorite-item');
          if (hoverItem && hoverItem !== row) {
            const bounding = hoverItem.getBoundingClientRect();
            const offset = touch.clientY - bounding.top - bounding.height / 2;
            if (offset < 0) {
              favoriteList.insertBefore(row, hoverItem);
            } else {
              favoriteList.insertBefore(row, hoverItem.nextSibling);
            }
          }
        }
      }, { passive: false });

      row.addEventListener('touchend', (e) => {
        if (!favoritesOrderEditing) return;
        row.classList.remove('dragging-pending');
        
        if (isTouchDragging) {
          // 드래그 정렬이 완료되면 스타일 원복 및 변경된 정렬 기준 localStorage 저장
          row.classList.remove('dragging');
          isTouchDragging = false;

          const currentItems = Array.from(favoriteList.querySelectorAll('.favorite-item'));
          const newFavoriteStocks = [];
          currentItems.forEach((itemEl) => {
            const origIdx = parseInt(itemEl.dataset.originalIndex, 10);
            newFavoriteStocks.push(favoriteStocks[origIdx]);
          });
          favoriteStocks = newFavoriteStocks;
          saveFavoriteStocks();
          renderFavoritePanel();

          // 드래그가 끝난 시점에 뒤따르는 click(종목 상세 열림) 이벤트가 가동되는 것을 전적으로 방지
          e.preventDefault();
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
        e.stopPropagation(); // document click 핸들러가 패널을 닫지 않도록 이벤트 버블링 차단
        if (favoritesOrderEditing) {
          // 순서 변경 모드일 때는 클릭으로 인한 종목 진입을 차단합니다.
          e.preventDefault();
          return;
        }
        // 드래그가 끝났을 때의 클릭 이벤트 발생을 방지하거나 구분
        // dragend 직후 click이 바로 발생할 수 있으므로, 드래그 상태가 해제된 지 얼마 안 되었다면 동작을 막아야 할 수도 있음.
        // 다만 row.classList.contains('dragging')는 이미 dragend에서 지워지므로 다른 방법이 필요할 수 있음.
        // HTML5 drag 앤 drop에서는 drag 시 click이 보통 트리거되지 않지만, 브라우저에 따라 발생할 수도 있음.
        // 확인 결과: HTML5 Drag start가 되면 dragend로 마무리되고, 마우스를 뗄 때 click 이벤트는 일반적으로 발생하지 않음 (드래그 마우스 다운 -> 이동 -> 업 은 클릭으로 인정 안 됨).
        // 따라서 그냥 평소대로 selectStock을 하도록 둠.
        openedFromFavorites = true;
        // 즐겨찾기 패널은 유지하고 (setFavoritePanelOpen(false) 호출 안 함)
        // 테마보드는 이미 hidden 상태이므로 유지, 상세정보는 패널 아래쪽에 표시됨
        selectStock(stock);
        renderFavoritePanel(); // 선택된 행에 active 클래스 갱신
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

  async function fetchKoreanRealtimePrice(stock) {
    const fetchFn = async () => {
      const response = await fetch(`/api/naver-realtime/api/realtime/domestic/stock/${stock.code}`);
      if (!response.ok) throw new Error('Naver Realtime API failed');

      const json = await response.json();
      const data = json.datas?.[0];
      if (!data) throw new Error('No realtime data');

      const isOvertime = data.overMarketPriceInfo && data.overMarketPriceInfo.overMarketStatus === 'OPEN';
      
      let price, change, ratio;
      
      if (isOvertime) {
        const overInfo = data.overMarketPriceInfo;
        price = Number(String(overInfo.overPrice).replace(/,/g, '').trim());
        change = Number(String(overInfo.compareToPreviousClosePrice || '0').replace(/,/g, '').trim());
        ratio = parseFloat(overInfo.fluctuationsRatio) || 0;
      } else {
        price = Number(String(data.closePrice).replace(/,/g, '').trim());
        change = Number(String(data.compareToPreviousClosePrice || '0').replace(/,/g, '').trim());
        ratio = parseFloat(data.fluctuationsRatio) || 0;
      }

      return {
        name: data.stockName || '',
        price,
        change,
        ratio,
        currency: 'KRW',
        isOvertime,
        marketStatus: data.marketStatus,
        overMarketStatus: data.overMarketPriceInfo?.overMarketStatus
      };
    };

    return getCachedOrFetch(stock, 'realtime', fetchFn);
  }

  async function fetchFavoritePriceInfo(stock) {
    if (stock.country === 'JP' || stock.country === 'US') {
      return fetchYahooPrice(stock);
    }
    return fetchKoreanRealtimePrice(stock);
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
        item.addEventListener('click', () => {
          openedFromFavorites = false;
          selectStock(stock);
        });
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

  async function fetchYahooChartData(stock) {
    const res = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(stock.code)}?interval=1d&range=15d`);
    if (!res.ok) throw new Error('Yahoo Chart fetch failed');

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No chart result');

    const closePrices = result.indicators?.quote?.[0]?.close || [];
    const timestamps = result.timestamp || [];

    const points = [];
    for (let i = 0; i < closePrices.length; i++) {
      if (closePrices[i] !== null && closePrices[i] !== undefined) {
        points.push({
          price: closePrices[i],
          date: new Date(timestamps[i] * 1000)
        });
      }
    }
    return points;
  }

  async function fetchNaverChartData(stock) {
    const response = await fetch(`/api/stock/${stock.code}/price?pageSize=15&page=1`);
    if (!response.ok) throw new Error('Naver Chart fetch failed');

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No price data');

    const points = data.map((item) => {
      // 네이버 API의 날짜 속성인 localTradedAt(예: "2026-06-26")을 직접 파싱
      const date = item.localTradedAt ? new Date(item.localTradedAt) : new Date();
      return {
        price: Number(String(item.closePrice).replace(/,/g, '').trim()),
        date: date
      };
    }).reverse();

    return points;
  }

  function drawSparkline(points, isTodayUp) {
    if (!sparklineCanvas) return;
    sparklineCanvas.className = ''; // remove skeleton class
    const ctx = sparklineCanvas.getContext('2d');
    if (!ctx) return;

    // 안티앨리어싱 비활성화 (픽셀 렌더링 강조)
    ctx.imageSmoothingEnabled = false;

    const dpr = window.devicePixelRatio || 1;
    const rect = sparklineCanvas.getBoundingClientRect();

    sparklineCanvas.width = rect.width * dpr;
    sparklineCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const prices = points.map(p => p.price);
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    const valRange = maxVal - minVal;

    const padding = height * 0.15;
    const chartHeight = height - padding * 2;

    const getX = (index) => (index / (points.length - 1)) * width;
    const getY = (val) => {
      if (valRange === 0) return height / 2;
      return height - padding - ((val - minVal) / valRange) * chartHeight;
    };

    // 파라미터가 명시적으로 불리언으로 넘어오면 그것을 쓰고, 없으면 15영업일 비교 폴백
    const isUp = typeof isTodayUp === 'boolean' ? isTodayUp : (prices[prices.length - 1] >= prices[0]);
    
    // 8비트 레트로 색상 연동 (상승: 빨간색, 하락: 파란색 — 국내 주식 관례)
    const strokeColor = isUp ? '#ff0055' : '#00aaff';

    // 1. 차트 하단 영역 투박한 픽셀 블록 느낌의 채우기
    ctx.fillStyle = isUp ? 'rgba(255, 0, 85, 0.08)' : 'rgba(0, 170, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(Math.round(getX(0)), height);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(Math.round(getX(i)), Math.round(getY(prices[i])));
    }
    ctx.lineTo(Math.round(getX(points.length - 1)), height);
    ctx.closePath();
    ctx.fill();

    // 2. 굵은 픽셀 꺾은선 그리기 (글로우 제거)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    ctx.moveTo(Math.round(getX(0)), Math.round(getY(prices[0])));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(Math.round(getX(i)), Math.round(getY(prices[i])));
    }
    ctx.stroke();

    // 3. 각 값 위치에 8비트 사각형 도트 배치
    for (let i = 0; i < points.length; i++) {
      const px = Math.round(getX(i));
      const py = Math.round(getY(prices[i]));
      
      // 바깥쪽 검은색 테두리 사각형
      ctx.fillStyle = '#000000';
      ctx.fillRect(px - 4, py - 4, 8, 8);
      
      // 안쪽 흰색 사각형 도트
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }

  async function fetchYahooPrice(stock) {
    const fetchFn = async () => {
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
      const marketTime = meta.regularMarketTime || null; // Unix timestamp (seconds)
      return { price, change, ratio, currency, marketTime };
    };

    return getCachedOrFetch(stock, 'yahoo', fetchFn);
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
    
    // 차트는 로딩 중일 때 스켈레톤으로 표시하기 위해 hidden 제거 후 캔버스 영역에 스켈레톤 클래스 적용
    if (chartContainer) {
      chartContainer.classList.remove('hidden');
      const ctx = sparklineCanvas.getContext('2d');
      ctx.clearRect(0, 0, sparklineCanvas.width, sparklineCanvas.height);
      sparklineCanvas.className = 'chart-skeleton';
    }
    
    if (newsContainer) {
      newsContainer.classList.remove('hidden');
    }
    
    if (newsSummaryBox) {
      newsSummaryBox.innerHTML = `
        <div class="skeleton-box news-skeleton-summary"></div>
        <div class="skeleton-box news-skeleton-summary" style="width: 85%;"></div>
      `;
      newsSummaryBox.className = 'news-summary-box';
    }
    
    if (newsList) {
      newsList.innerHTML = `
        <div class="skeleton-box news-skeleton-item"></div>
        <div class="skeleton-box news-skeleton-item" style="width: 90%;"></div>
        <div class="skeleton-box news-skeleton-item" style="width: 95%;"></div>
      `;
    }
    
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

    priceEl.innerHTML = '<div class="skeleton-box price-skeleton"></div>';
    priceChangeEl.innerHTML = '<div class="skeleton-box change-skeleton"></div>';
    priceChangeEl.className = 'stock-price-change';
    changeIndicatorEl.textContent = '';
    changeValEl.textContent = '';
    changeRatioEl.textContent = '';
    infoPanel.classList.remove('hidden');

    // 즐겨찾기 모드 중 종목 선택 시: 검색창과 환율박스를 숨기고 패널 아래에 상세정보 표시
    if (openedFromFavorites) {
      if (searchSection) searchSection.style.display = 'none';
      if (exchangeBox && exchangeBox.style.display !== 'none') {
        exchangeBox.dataset.visibleBefore = 'true';
        exchangeBox.style.display = 'none';
      }
    }

    // 1. 필수 가격 정보 조회 (CORS 우회 로컬 프록시 / Vercel 연동)
    let priceInfo;
    try {
      if (stock.country === 'JP' || stock.country === 'US') {
        priceInfo = await fetchYahooPrice(stock);
        const locale = stock.country === 'JP' ? 'ja-JP' : 'en-US';
        const fractionDigits = stock.country === 'JP' ? 0 : 2;
        priceEl.textContent = `${priceInfo.price.toLocaleString(locale, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits
        })} ${priceInfo.currency}`;
        setPriceChange(priceChangeEl, changeIndicatorEl, changeValEl, changeRatioEl, priceInfo.change, priceInfo.ratio, fractionDigits);
      } else {
        priceInfo = await fetchKoreanRealtimePrice(stock);
        const rawPrice = priceInfo.price.toLocaleString('ko-KR');
        priceEl.textContent = `${rawPrice} KRW`;
        setPriceChange(priceChangeEl, changeIndicatorEl, changeValEl, changeRatioEl, priceInfo.change, priceInfo.ratio, 0);

        // 뱃지 업데이트 (시간외 단일가 상태 표시)
        if (priceInfo.isOvertime) {
          badge.className = 'market-badge overtime';
          badge.textContent = '시간외';
        } else {
          badge.className = 'market-badge hidden-label';
          badge.textContent = '';
        }
      }
    } catch (error) {
      console.error('Stock price fetch error:', error);
      priceEl.textContent = '조회 실패';
      priceChangeEl.className = 'stock-price-change flat';
      changeIndicatorEl.textContent = '-';
      changeValEl.textContent = '';
      changeRatioEl.textContent = '';
      return; // 필수 데이터 조회 실패 시 차트 로딩을 건너뛰고 조기 종료
    }

    // 2. 부가 정보인 미니 주가 차트 렌더링 (실패하더라도 전체 조회는 차단되지 않도록 별도 예외 격리)
    try {
      let chartPoints = [];
      if (stock.country === 'JP' || stock.country === 'US') {
        chartPoints = await fetchYahooChartData(stock);
      } else {
        chartPoints = await fetchNaverChartData(stock);
      }

      if (chartPoints && chartPoints.length > 1) {
        const formatMD = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        const startMD = formatMD(chartPoints[0].date);
        const endMD = formatMD(chartPoints[chartPoints.length - 1].date);
        chartPeriodVal.textContent = `${startMD} ~ ${endMD}`;

        chartContainer.classList.remove('hidden');
        drawSparkline(chartPoints, priceInfo ? priceInfo.ratio >= 0 : undefined);
      }
    } catch (chartError) {
      console.warn('Mini chart load failed (ignoring error to preserve price details):', chartError);
    }

    // 3. 오늘 뉴스 수집 및 요약 처리 (별도 예외 격리)
    try {
      const newsItems = await fetchStockNews(stock);
      renderStockNews(stock, newsItems);
    } catch (newsError) {
      console.warn('Stock news load/summary failed:', newsError);
      if (newsSummaryBox) {
        newsSummaryBox.className = 'news-summary-box';
        newsSummaryBox.textContent = '뉴스 정보를 불러오지 못했습니다.';
      }
      if (newsContainer) newsContainer.classList.remove('hidden');
    }
  }

  async function queryYahooNews(queryStr) {
    try {
      const res = await fetch(`/api/yahoo/v1/finance/search?q=${encodeURIComponent(queryStr)}&newsCount=15`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.news || [];
    } catch (e) {
      console.warn('Yahoo query failed for:', queryStr, e);
      return [];
    }
  }

  function filterYahooNews(newsList, ticker, companyName) {
    const tickerPure = ticker.replace('.T', ''); // 일본 주식 등에서 '.T' 제거한 순수 번호
    const nameWords = companyName.toLowerCase().split(/\s+/).filter(w => w.length > 2); // 3글자 이상 단어들

    return newsList.filter(item => {
      const titleLower = item.title.toLowerCase();
      
      // relatedTickers 분석
      const related = (item.relatedTickers || []).map(t => t.toUpperCase());
      const hasTicker = related.some(r => r.includes(tickerPure) || tickerPure.includes(r));

      // 타이틀 내 키워드 언급 분석
      const mentionsTicker = titleLower.includes(tickerPure.toLowerCase()) || (item.relatedTickers && item.relatedTickers.length > 0 && titleLower.includes(item.relatedTickers[0].toLowerCase()));
      const mentionsName = nameWords.some(word => titleLower.includes(word));

      // 관련성이 있는 기사 조건
      return hasTicker || mentionsTicker || mentionsName;
    });
  }

  async function fetchStockNews(stock) {
    if (stock.country === 'JP' || stock.country === 'US') {
      const cleanTicker = stock.code.toUpperCase();
      const rawName = stock.name;
      const cleanName = rawName
        .replace(/Corporation|Corp\.|Corp|Incorporated|Inc\.|Inc|Company|Co\.|Co|Limited|Ltd\.|Ltd/gi, '')
        .trim();

      // 1차 시도: Ticker 코드로 조회
      let newsItems = await queryYahooNews(stock.code);
      let filtered = filterYahooNews(newsItems, cleanTicker, cleanName);

      // 2차 시도: 1차 결과가 부족하고 회사 이름이 있을 때 회사명으로 조회
      if (filtered.length < 3 && cleanName.length > 0) {
        const fallbackNews = await queryYahooNews(cleanName);
        const filteredFallback = filterYahooNews(fallbackNews, cleanTicker, cleanName);
        
        // 중복 제거하여 합치기
        const seenUuids = new Set(filtered.map(x => x.uuid));
        filteredFallback.forEach(item => {
          if (!seenUuids.has(item.uuid)) {
            filtered.push(item);
          }
        });
      }

      return filtered.slice(0, 10).map(item => ({
        title: item.title,
        office: item.publisher || 'Yahoo Finance',
        url: item.link,
        datetime: item.providerPublishTime ? new Date(item.providerPublishTime * 1000) : new Date()
      }));
    } else {
      const res = await fetch(`/api/news/stock/${stock.code}?pageSize=15`);
      if (!res.ok) throw new Error('Naver News fetch failed');
      const data = await res.json();
      const items = data.flatMap(group => group.items || []);
      return items.map(item => {
        let dateObj = new Date();
        const dt = item.datetime;
        if (dt && dt.length >= 12) {
          const y = parseInt(dt.substring(0, 4), 10);
          const m = parseInt(dt.substring(4, 6), 10) - 1;
          const d = parseInt(dt.substring(6, 8), 10);
          const h = parseInt(dt.substring(8, 10), 10);
          const min = parseInt(dt.substring(10, 12), 10);
          dateObj = new Date(y, m, d, h, min);
        }
        return {
          title: item.titleFull || item.title,
          body: item.body,
          office: item.officeName,
          url: item.mobileNewsUrl,
          datetime: dateObj
        };
      });
    }
  }

  function generateNewsSummary(newsItems, stock) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const todayNews = newsItems.filter(item => {
      const itemYear = item.datetime.getFullYear();
      const itemMonth = String(item.datetime.getMonth() + 1).padStart(2, '0');
      const itemDate = String(item.datetime.getDate()).padStart(2, '0');
      return `${itemYear}${itemMonth}${itemDate}` === todayStr;
    });

    if (todayNews.length === 0) {
      return {
        isToday: false,
        summary: `오늘(${today.toLocaleDateString('ko-KR')}) 등록된 신규 뉴스 기사가 없습니다. 최신 관련 뉴스를 아래 목록에서 확인해 보세요.`
      };
    }

    let sentences = [];
    todayNews.forEach(item => {
      if (item.title) {
        sentences.push({ text: cleanText(item.title), score: 0, origin: item });
      }
      if (item.body) {
        const rawSentences = item.body.split(/[.?!]\s+/).map(s => s.trim()).filter(Boolean);
        rawSentences.forEach(s => {
          sentences.push({ text: cleanText(s), score: 0, origin: item });
        });
      }
    });

    function cleanText(str) {
      return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\[[^\]]*\]/g, '')
        .trim();
    }

    const stockNameClean = stock.name.toLowerCase().replace(/\s+/g, '');
    const stockCode = stock.code.toLowerCase();
    
    const keyTerms = [
      '실적', '주가', '상승', '하락', '최고', '최저', '매수', '전망', '분석', 
      'HBM', 'AI', '수혜', '공급', '탈퇴', '파업', '반등', '목표가', '상향',
      '하향', '매도', '영업이익', '매출', '흑자', '적자', '계약', '인수', '합병'
    ];

    sentences.forEach(s => {
      const lowerText = s.text.toLowerCase();
      let score = 0;

      if (lowerText.includes(stockNameClean)) score += 15;
      if (lowerText.includes(stockCode)) score += 10;

      keyTerms.forEach(term => {
        if (lowerText.includes(term)) score += 5;
      });

      if (s.text === cleanText(s.origin.title)) {
        score += 8;
      }

      if (s.text.length < 15) score -= 10;
      if (s.text.length > 100) score -= 5;
      if (s.text.length > 150) score -= 15;

      s.score = score;
    });

    sentences.sort((a, b) => b.score - a.score);

    const selectedSentences = [];
    for (const s of sentences) {
      if (selectedSentences.length >= 3) break;
      if (s.score < 5) continue;
      
      const isDuplicate = selectedSentences.some(selected => {
        const setA = new Set(selected.split(' '));
        const setB = new Set(s.text.split(' '));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return (intersection.size / union.size) > 0.4;
      });

      if (!isDuplicate) {
        let text = s.text;
        if (!/[.!?]$/.test(text)) {
          text += '.';
        }
        selectedSentences.push(text);
      }
    }

    if (selectedSentences.length === 0) {
      const topTitles = todayNews.slice(0, 3).map(item => cleanText(item.title));
      return {
        isToday: true,
        summary: topTitles
      };
    }

    return {
      isToday: true,
      summary: selectedSentences
    };
  }

  function renderStockNews(stock, newsItems) {
    if (!newsContainer || !newsCountBadge || !newsSummaryBox || !newsList) return;

    newsCountBadge.textContent = String(newsItems.length);
    newsSummaryBox.innerHTML = '';
    newsList.innerHTML = '';

    if (newsItems.length === 0) {
      newsSummaryBox.className = 'news-summary-box';
      newsSummaryBox.textContent = '최근 등록된 관련 뉴스 기사가 없습니다.';
      newsContainer.classList.remove('hidden');
      return;
    }

    const { isToday, summary } = generateNewsSummary(newsItems, stock);
    
    newsSummaryBox.className = 'news-summary-box';
    if (typeof summary === 'string') {
      newsSummaryBox.textContent = summary;
    } else if (Array.isArray(summary)) {
      const ul = document.createElement('ul');
      summary.forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        ul.appendChild(li);
      });
      newsSummaryBox.appendChild(ul);
    }

    newsItems.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'news-list-item';
      
      const titleEl = document.createElement('div');
      titleEl.className = 'news-item-title';
      titleEl.textContent = item.title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      const metaEl = document.createElement('div');
      metaEl.className = 'news-item-meta';

      const officeEl = document.createElement('span');
      officeEl.className = 'news-item-office';
      officeEl.textContent = item.office;

      const timeEl = document.createElement('span');
      timeEl.className = 'news-item-time';
      
      const now = new Date();
      const isTodayItem = item.datetime.toDateString() === now.toDateString();
      if (isTodayItem) {
        timeEl.textContent = `${String(item.datetime.getHours()).padStart(2, '0')}:${String(item.datetime.getMinutes()).padStart(2, '0')}`;
      } else {
        timeEl.textContent = `${item.datetime.getFullYear()}.${String(item.datetime.getMonth() + 1).padStart(2, '0')}.${String(item.datetime.getDate()).padStart(2, '0')}`;
      }

      metaEl.appendChild(officeEl);
      metaEl.appendChild(timeEl);
      itemEl.appendChild(titleEl);
      itemEl.appendChild(metaEl);

      itemEl.addEventListener('click', () => {
        if (item.url) {
          window.open(item.url, '_blank');
        }
      });

      newsList.appendChild(itemEl);
    });

    newsContainer.classList.remove('hidden');
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


  async function loadExchangeRates() {
    try {
      // exchangerate.fun: 무료 · 키 없음 · 1시간 갱신
      const res = await fetch('/api/exchangefun/latest?base=USD&symbols=KRW,JPY');
      if (!res.ok) throw new Error('exchangerate.fun fetch failed');
      const data = await res.json();

      const usdRate = data.rates?.KRW;
      const jpyRate = data.rates?.JPY ? (1 / data.rates.JPY) * 100 * usdRate / usdRate * data.rates.KRW / data.rates.JPY * 100 : null;
      // JPY: 1달러당 엔 → 100엔당 원 = (KRW/USD) / (JPY/USD) * 100
      const jpy100Rate = usdRate / data.rates.JPY * 100;

      // USD 요소 업데이트
      const usdRateEl = document.getElementById('usd-rate');
      const usdChangeEl = document.getElementById('usd-change');
      if (usdRateEl && usdRate) {
        usdRateEl.textContent = `${usdRate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KRW`;
      }
      if (usdChangeEl) usdChangeEl.textContent = '';

      // JPY 요소 업데이트 (100엔당 원화)
      const jpyRateEl = document.getElementById('jpy-rate');
      const jpyChangeEl = document.getElementById('jpy-change');
      if (jpyRateEl && jpy100Rate) {
        jpyRateEl.textContent = `${jpy100Rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KRW`;
      }
      if (jpyChangeEl) jpyChangeEl.textContent = '';

      // 시각: API의 timestamp 필드 (Unix 초)
      const updatedEl = document.getElementById('exchange-updated');
      if (updatedEl && data.timestamp) {
        const timeStr = new Intl.DateTimeFormat('ko-KR', {
          timeZone: 'Asia/Seoul',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date(data.timestamp * 1000));
        updatedEl.textContent = `Updated at: ${timeStr} KST`;
      }
    } catch (err) {
      console.error('Exchange rate error:', err);
      const usdRateEl = document.getElementById('usd-rate');
      const jpyRateEl = document.getElementById('jpy-rate');
      if (usdRateEl) usdRateEl.textContent = '연결 실패';
      if (jpyRateEl) jpyRateEl.textContent = '연결 실패';
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
      if (activeIndex >= 0 && activeIndex < filteredStocks.length) {
        openedFromFavorites = false;
        selectStock(filteredStocks[activeIndex]);
      }
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
      !favoritePanelToggle.contains(e.target) &&
      !(favoritesRefreshBtn && favoritesRefreshBtn.contains(e.target)) &&
      // 즐겨찾기에서 연 상세정보 패널 내부를 클릭한 경우에는 패널을 닫지 않음
      !(openedFromFavorites && infoPanel && infoPanel.contains(e.target))
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
      favoritesRefreshBtn.classList.remove('completed'); // 이전 완료 상태 제거
      try {
        await refreshFavoriteAlerts();
      } catch (e) {
        console.error('Manual alerts refresh failed:', e);
      } finally {
        // 시각적 피드백 효과를 위해 최소 600ms 회전 애니메이션 유지
        setTimeout(() => {
          favoritesRefreshBtn.classList.remove('spinning');
          favoritesRefreshBtn.classList.add('completed'); // 완료 상태 추가
          favoritesRefreshBtn.blur();
        }, 600);
      }
    });

    // 마우스가 새로고침 버튼을 벗어나거나 포커스가 완전히 해제(blur)될 때 완료 상태 해제
    favoritesRefreshBtn.addEventListener('mouseleave', () => {
      favoritesRefreshBtn.classList.remove('completed');
    });
    favoritesRefreshBtn.addEventListener('blur', () => {
      favoritesRefreshBtn.classList.remove('completed');
    });
    favoritesRefreshBtn.addEventListener('touchend', () => {
      setTimeout(() => {
        favoritesRefreshBtn.blur();
        favoritesRefreshBtn.classList.remove('completed');
      }, 350);
    });
  }

  if (favoritesOrderToggleBtn) {
    favoritesOrderToggleBtn.addEventListener('click', () => {
      favoritesOrderEditing = !favoritesOrderEditing;
      favoritesOrderToggleBtn.classList.toggle('active', favoritesOrderEditing);
      favoritesOrderToggleBtn.textContent = favoritesOrderEditing ? '완료' : '순서 변경';
      renderFavoritePanel();
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
  loadThemeBoard();
  
  // 환율 표기 시작 (exchangerate.fun · 1시간 갱신)
  loadExchangeRates();
  
  setInterval(() => {
    refreshFavoriteAlerts();
    loadThemeBoard();
  }, 5 * 60 * 1000);

  // 환율은 1시간마다 갱신 (API 갱신 주기에 맞춤)
  setInterval(loadExchangeRates, 60 * 60 * 1000);

  // ==========================================================================
  // Pull-To-Refresh Touch Gesture Implementation
  // ==========================================================================
  if (ptrContainer && ptrText) {
    let ptrStartY = 0;
    let ptrStartX = 0;
    let ptrActive = false;
    let ptrRefreshing = false;

    window.addEventListener('touchstart', (e) => {
      // 스크롤이 탑에 있고, 세션이 리프레시 중이 아닐 때만 시작
      if (window.scrollY === 0 && !ptrRefreshing) {
        const touch = e.touches[0];
        ptrStartY = touch.pageY;
        ptrStartX = touch.pageX;
        ptrActive = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!ptrActive || ptrRefreshing) return;

      const touch = e.touches[0];
      const distY = touch.pageY - ptrStartY;
      const distX = touch.pageX - ptrStartX;

      // 아래로 당기는 방향이며 세로 제스처가 우세한 경우
      if (distY > 0 && Math.abs(distY) > Math.abs(distX)) {
        // 모바일 브라우저의 기본 당겨서 새로고침 동작 방지
        if (e.cancelable) {
          e.preventDefault();
        }

        const height = Math.min(60, distY * 0.4);
        ptrContainer.style.height = `${height}px`;
        ptrContainer.classList.add('active');

        if (height >= 20) { // threshold(20px 실측값 기준, distY * 0.4가 20px이 되는 지점은 distY가 50px일 때)
          ptrText.textContent = 'RELEASE TO REFRESH...';
          ptrText.style.color = '#ff0055'; // 상승 네온 칼라
        } else {
          ptrText.textContent = 'PULL TO REFRESH...';
          ptrText.style.color = '#00ffcc'; // 시안 네온 칼라
        }
      } else {
        // 위로 밀거나 가로 스크롤 시 리셋
        ptrActive = false;
        ptrContainer.style.height = '0px';
        ptrContainer.classList.remove('active');
      }
    }, { passive: false });

    window.addEventListener('touchend', async () => {
      if (!ptrActive || ptrRefreshing) return;
      ptrActive = false;

      const currentHeight = parseFloat(ptrContainer.style.height) || 0;

      if (currentHeight >= 20) {
        ptrRefreshing = true;
        // REFRESHING... 텍스트 대신 8비트 픽셀 스켈레톤 바들 삽입
        ptrText.innerHTML = `
          <div style="display: flex; gap: 6px; align-items: center; justify-content: center; height: 16px;">
            <div class="skeleton-box" style="width: 24px; height: 8px; border: 1px solid #bd00ff !important;"></div>
            <div class="skeleton-box" style="width: 56px; height: 8px; border: 1px solid #bd00ff !important;"></div>
            <div class="skeleton-box" style="width: 36px; height: 8px; border: 1px solid #bd00ff !important;"></div>
          </div>
        `;
        ptrContainer.style.height = '45px'; // 로딩 중 높이 고정

        try {
          // 병렬로 즐겨찾기, 테마보드, 환율 데이터 일제히 새로고침
          await Promise.allSettled([
            refreshFavoriteAlerts(),
            loadThemeBoard(),
            loadExchangeRates()
          ]);
        } catch (err) {
          console.warn('Pull-to-refresh reload failed:', err);
        } finally {
          // 완료 피드백을 조금 유지한 후 부드럽게 닫기
          setTimeout(() => {
            ptrContainer.style.height = '0px';
            ptrContainer.classList.remove('active');
            ptrRefreshing = false;
            // 텍스트 원래대로 복원
            ptrText.textContent = 'PULL TO REFRESH...';
            ptrText.style.color = '#00ffcc';
          }, 600);
        }
      } else {
        // 임계값 미만일 땐 닫기
        ptrContainer.style.height = '0px';
        ptrContainer.classList.remove('active');
      }
    }, { passive: true });
  }

  // Vercel Analytics 동적 런타임 주입 (Vite 빌드 시 에러 방지)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const analyticsScript = document.createElement('script');
    analyticsScript.src = '/_vercel/insights/script.js';
    analyticsScript.defer = true;
    analyticsScript.setAttribute('data-sdknode', 'true');
    document.body.appendChild(analyticsScript);
  }
});

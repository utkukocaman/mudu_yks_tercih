/**
 * YKS Veri Analitiği Portalı (2015-2025)
 * Core Logic & Apache ECharts Orchestrator
 * Features: Dark/Light Mode Theme Switcher, Searchable Department Dropdown, Mobile Responsive
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global App State
  const state = {
    metricType: 'rank', // 'rank' or 'baseScore'
    selectedUnis: [], // Starts completely empty
    selectedDept: '', // Initialized empty
    selectedScholarships: ['Burslu', '%50 İndirimli', 'Ücretsiz', 'Genel'],
    // Tercih Robotu & Hedef Filtresi State
    targetValue: null,
    targetMetric: 'rank',
    targetTolerance: 10,
    targetDirection: 'both'
  };

  // ECharts Instances
  let trendChart = null;
  let radarChart = null;
  let rangeChart = null;
  let quotaChart = null;

  // Initialize App in STRICT correct order
  initCharts();
  initDOM();
  initThemeSwitcher();

  function initThemeSwitcher() {
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeToggleText = document.getElementById('themeToggleText');

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('yks_portal_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
      if (themeToggleText) themeToggleText.textContent = 'Açık Tema';
    }

    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');

        if (isLight) {
          if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
          if (themeToggleText) themeToggleText.textContent = 'Açık Tema';
          localStorage.setItem('yks_portal_theme', 'light');
        } else {
          if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
          if (themeToggleText) themeToggleText.textContent = 'Koyu Tema';
          localStorage.setItem('yks_portal_theme', 'dark');
        }

        // Re-render charts so tooltip backgrounds match theme seamlessly
        renderAll();
      });
    }
  }

  function initDOM() {
    // Department Dropdown Elements
    const deptDropdownBtn = document.getElementById('deptDropdownBtn');
    const deptDropdownMenu = document.getElementById('deptDropdownMenu');
    const deptSearchInput = document.getElementById('deptSearchInput');

    // University Dropdown Elements
    const uniDropdownBtn = document.getElementById('uniDropdownBtn');
    const uniDropdownMenu = document.getElementById('uniDropdownMenu');
    const uniSearchInput = document.getElementById('uniSearchInput');
    const btnSelectAll = document.getElementById('btnSelectAllUnis');
    const btnClearAll = document.getElementById('btnClearAllUnis');

    const metricRankBtn = document.getElementById('btnMetricRank');
    const metricScoreBtn = document.getElementById('btnMetricScore');
    const scholarshipToggles = document.querySelectorAll('.btn-toggle-burs');

    // Populate Department List with Search
    populateDepartmentDropdown();

    // Toggle Dept Dropdown Menu
    if (deptDropdownBtn && deptDropdownMenu) {
      deptDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (uniDropdownMenu) uniDropdownMenu.classList.remove('show');
        deptDropdownMenu.classList.toggle('show');
      });
    }

    // Toggle Uni Dropdown Menu
    if (uniDropdownBtn && uniDropdownMenu) {
      uniDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!state.selectedDept) {
          alert('Lütfen önce bir bölüm seçiniz.');
          return;
        }
        if (deptDropdownMenu) deptDropdownMenu.classList.remove('show');
        uniDropdownMenu.classList.toggle('show');
      });
    }

    // Close Dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (deptDropdownMenu && !deptDropdownMenu.contains(e.target) && !deptDropdownBtn.contains(e.target)) {
        deptDropdownMenu.classList.remove('show');
      }
      if (uniDropdownMenu && !uniDropdownMenu.contains(e.target) && !uniDropdownBtn.contains(e.target)) {
        uniDropdownMenu.classList.remove('show');
      }
    });

    // Search Department Filter
    if (deptSearchInput) {
      deptSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('#deptRadioList .dropdown-item-radio');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
    }

    // Search University Filter
    if (uniSearchInput) {
      uniSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('#uniCheckboxList .dropdown-item-checkbox');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
    }

    // "Tümünü Seç" Button
    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        const visibleCheckboxes = document.querySelectorAll('#uniCheckboxList .dropdown-item-checkbox:not([style*="display: none"]) input[type="checkbox"]');
        visibleCheckboxes.forEach(cb => cb.checked = true);
        updateSelectedUnisFromCheckboxes();
        renderAll();
      });
    }

    // "Tümünü İptal Et" Button
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#uniCheckboxList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        state.selectedUnis = [];
        updateUniDropdownTriggerLabel();
        renderAll();
      });
    }

    // Scholarship Toggle Listeners
    scholarshipToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const burs = btn.getAttribute('data-burs');
        btn.classList.toggle('active');

        if (btn.classList.contains('active')) {
          if (!state.selectedScholarships.includes(burs)) {
            state.selectedScholarships.push(burs);
            if (burs === 'Ücretsiz') state.selectedScholarships.push('Genel');
          }
        } else {
          state.selectedScholarships = state.selectedScholarships.filter(s => s !== burs && (burs !== 'Ücretsiz' || s !== 'Genel'));
        }
        renderAll();
      });
    });

    if (metricRankBtn && metricScoreBtn) {
      metricRankBtn.addEventListener('click', () => {
        state.metricType = 'rank';
        metricRankBtn.classList.add('active');
        metricScoreBtn.classList.remove('active');
        renderTrendChart();
      });

      metricScoreBtn.addEventListener('click', () => {
        state.metricType = 'baseScore';
        metricScoreBtn.classList.add('active');
        metricRankBtn.classList.remove('active');
        renderTrendChart();
      });
    }

    // ==========================================
    // Tercih Robotu & Hedef Filtre Olay Dinleyicileri
    // ==========================================
    const targetValueInput = document.getElementById('targetValueInput');
    const targetMetricType = document.getElementById('targetMetricType');
    const targetToleranceInput = document.getElementById('targetToleranceInput');
    const targetDirectionSelect = document.getElementById('targetDirectionSelect');
    const btnResetTargetFilter = document.getElementById('btnResetTargetFilter');

    if (targetValueInput) {
      targetValueInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        state.targetValue = val !== '' ? parseFloat(val) : null;
        renderAll();
      });
    }

    if (targetMetricType) {
      targetMetricType.addEventListener('change', (e) => {
        state.targetMetric = e.target.value;
        renderAll();
      });
    }

    if (targetToleranceInput) {
      targetToleranceInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        state.targetTolerance = val !== '' ? parseFloat(val) : 0;
        renderAll();
      });
    }

    if (targetDirectionSelect) {
      targetDirectionSelect.addEventListener('change', (e) => {
        state.targetDirection = e.target.value;
        renderAll();
      });
    }

    if (btnResetTargetFilter) {
      btnResetTargetFilter.addEventListener('click', () => {
        state.targetValue = null;
        state.targetTolerance = 10;
        state.targetMetric = 'rank';
        state.targetDirection = 'both';

        if (targetValueInput) targetValueInput.value = '';
        if (targetToleranceInput) targetToleranceInput.value = '10';
        if (targetMetricType) targetMetricType.value = 'rank';
        if (targetDirectionSelect) targetDirectionSelect.value = 'both';

        renderAll();
      });
    }

    // Info Popover Toggle Listeners (?)
    const infoBtns = document.querySelectorAll('.info-icon-btn');
    infoBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const infoId = btn.getAttribute('data-info');
        const popover = document.getElementById(infoId);
        
        // Close all other popovers
        document.querySelectorAll('.info-popover').forEach(p => {
          if (p !== popover) p.classList.remove('show');
        });

        if (popover) popover.classList.toggle('show');
      });
    });

    // Close popovers on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.info-popover') && !e.target.closest('.info-icon-btn')) {
        document.querySelectorAll('.info-popover').forEach(p => p.classList.remove('show'));
      }
    });

    window.addEventListener('resize', () => {
      if (trendChart) trendChart.resize();
      if (radarChart) radarChart.resize();
      if (rangeChart) rangeChart.resize();
      if (quotaChart) quotaChart.resize();
      renderRadarChart(); // Re-calculate radar radius dynamically
    });

    renderAll();
  }

  function populateDepartmentDropdown() {
    const listContainer = document.getElementById('deptRadioList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    YKS_DATABASE.departments.forEach(dept => {
      const div = document.createElement('div');
      div.className = 'dropdown-item-radio';
      if (dept.id === state.selectedDept) div.classList.add('selected');

      div.innerHTML = `
        <span><b>${dept.name}</b></span>
        <small style="color:var(--accent-cyan); font-weight:600;">${dept.scoreType}</small>
      `;

      div.addEventListener('click', () => {
        state.selectedDept = dept.id;
        state.selectedUnis = []; // NO AUTO-SELECT: Reset selected universities to ZERO
        
        // Mark selected in UI
        document.querySelectorAll('#deptRadioList .dropdown-item-radio').forEach(i => i.classList.remove('selected'));
        div.classList.add('selected');

        // Update trigger button label
        const deptLabel = document.getElementById('deptDropdownLabel');
        if (deptLabel) deptLabel.innerHTML = `<i class="fa-solid fa-book-open"></i> ${dept.name} (${dept.scoreType})`;

        // Close dropdown
        const deptMenu = document.getElementById('deptDropdownMenu');
        if (deptMenu) deptMenu.classList.remove('show');

        // Populate universities for this department with ALL UNCHECKED
        populateUniversitiesForDept(dept.id);
        renderAll();
      });

      listContainer.appendChild(div);
    });
  }

  function populateUniversitiesForDept(deptId) {
    const listContainer = document.getElementById('uniCheckboxList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (!deptId) {
      updateUniDropdownTriggerLabel();
      return;
    }

    // Find all records for this department
    const records = YKS_DATABASE.records.filter(r => r.depId === deptId);
    const availableUniIds = [...new Set(records.map(r => r.uniId))];
    const availableUnis = YKS_DATABASE.universities.filter(u => availableUniIds.includes(u.id));

    availableUnis.forEach((uni) => {
      const label = document.createElement('label');
      label.className = 'dropdown-item-checkbox';

      const isChecked = state.selectedUnis.includes(uni.id);
      label.innerHTML = `
        <input type="checkbox" value="${uni.id}" ${isChecked ? 'checked' : ''}>
        <span>${uni.name.trim()} <small style="color:var(--text-dim)">[${uni.type} - ${uni.city.trim()}]</small></span>
      `;

      const cb = label.querySelector('input');
      cb.addEventListener('change', () => {
        updateSelectedUnisFromCheckboxes();
        renderAll();
      });

      listContainer.appendChild(label);
    });

    updateUniDropdownTriggerLabel();
  }

  function updateSelectedUnisFromCheckboxes() {
    const checked = Array.from(document.querySelectorAll('#uniCheckboxList input[type="checkbox"]:checked')).map(cb => cb.value);
    state.selectedUnis = checked;
    updateUniDropdownTriggerLabel();
  }

  function updateUniDropdownTriggerLabel() {
    const countBadge = document.getElementById('uniSelectCount');
    const labelSpan = document.getElementById('uniDropdownLabel');
    const count = state.selectedUnis.length;
    const hasTarget = state.targetValue !== null && state.targetValue !== undefined && !isNaN(state.targetValue) && state.targetValue > 0;

    if (countBadge) countBadge.textContent = count === 0 ? 'Tümü' : `${count} Seçili`;

    if (labelSpan) {
      if (count === 0) {
        labelSpan.innerHTML = `<i class="fa-solid fa-building-columns"></i> Tüm Üniversiteler Dahil`;
      } else if (count === 1) {
        const uni = YKS_DATABASE.universities.find(u => u.id === state.selectedUnis[0]);
        labelSpan.innerHTML = `<i class="fa-solid fa-university"></i> ${uni ? uni.name.trim() : '1 Üniversite'}`;
      } else {
        labelSpan.innerHTML = `<i class="fa-solid fa-university"></i> ${count} Üniversite Karşılaştırılıyor`;
      }
    }
  }

  function initCharts() {
    const elTrend = document.getElementById('trendChart');
    const elRadar = document.getElementById('radarChart');
    const elRange = document.getElementById('rangeChart');
    const elQuota = document.getElementById('quotaChart');

    if (elTrend) trendChart = echarts.init(elTrend);
    if (elRadar) radarChart = echarts.init(elRadar);
    if (elRange) rangeChart = echarts.init(elRange);
    if (elQuota) quotaChart = echarts.init(elQuota);
  }

  function renderAll() {
    renderKPIs();
    renderTrendChart();
    renderRadarChart();
    renderRangeChart();
    renderQuotaChart();
    renderTable();
  }

  function getThemeColors() {
    const isLight = document.body.classList.contains('light-mode');
    return {
      tooltipBg: isLight ? '#ffffff' : '#121524',
      tooltipBorder: isLight ? '#cbd5e1' : '#2a304d',
      textColor: isLight ? '#1e293b' : '#f0f3fe',
      axisColor: isLight ? '#475569' : '#8c96b5',
      radarAxisNameColor: isLight ? '#0f172a' : '#00f2fe',
      splitLine: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
    };
  }

  // Helper Functions to filter data by University, Dept, Scholarship AND Target Robot Filters
  function getFilteredRecords() {
    const hasTargetFilter = state.targetValue !== null && state.targetValue !== undefined && !isNaN(state.targetValue) && state.targetValue > 0;

    // Normal modda: Bölüm seçili değilse ve Hedef Filtresi yoksa boş dizi dön.
    if (!state.selectedDept && !hasTargetFilter) return [];

    let records = YKS_DATABASE.records;

    // 1. Bölüm Filtresi (Eğer bir bölüm seçildiyse)
    if (state.selectedDept) {
      records = records.filter(r => r.depId === state.selectedDept);
    }

    // 2. Üniversite Filtresi (Eğer kullanıcı özel üniversite seçmişse onları alır; seçmediyse TÜMÜNÜ kapsar!)
    if (state.selectedUnis && state.selectedUnis.length > 0) {
      records = records.filter(r => state.selectedUnis.includes(r.uniId));
    }

    // 3. Burs Tipi Filtresi
    if (state.selectedScholarships && state.selectedScholarships.length > 0) {
      records = records.filter(r => state.selectedScholarships.includes(r.scholarship));
    }

    // 4. Tercih Robotu & Hedef Filtresi Mantığı
    if (hasTargetFilter) {
      const targetVal = parseFloat(state.targetValue);
      const tolPercent = parseFloat(state.targetTolerance) || 0;
      const tolRatio = tolPercent / 100;
      const metric = state.targetMetric || 'rank';
      const direction = state.targetDirection || 'both';

      records = records.filter(r => {
        // En güncel geçerli metrik değerini bul (2025, 2024, 2023...)
        let val = null;
        for (let i = YKS_DATABASE.years.length - 1; i >= 0; i--) {
          const yr = YKS_DATABASE.years[i];
          if (r.data && r.data[yr] && r.data[yr][metric] !== undefined && r.data[yr][metric] !== null && r.data[yr][metric] > 0) {
            val = r.data[yr][metric];
            break;
          }
        }
        if (val === null) return false;

        if (metric === 'rank') {
          // Sıralama Metriği: Küçük sayılar daha iyi (örn: 35, 1.000, 50.000)
          // Derece yapılan sıralamalarda (örn: 35. sıra) dar aralık kalmaması için akıllı esneklik bandı uygulanır.
          const percentSpan = targetVal * tolRatio;
          const effectiveSpan = Math.max(percentSpan, tolPercent > 0 ? 2500 : 200);

          if (tolPercent === 0) {
            const minR = Math.max(1, targetVal - 500);
            const maxR = targetVal + 500;
            return val >= minR && val <= maxR;
          }

          const minRank = Math.max(1, targetVal - effectiveSpan);
          const maxRank = targetVal + effectiveSpan;

          if (direction === 'both') {
            return val >= minRank && val <= maxRank;
          } else if (direction === 'safe') { // Güvenli / Sıralama Düşerse
            return val >= targetVal && val <= Math.max(maxRank, targetVal + 10000);
          } else if (direction === 'reach') { // Yüksek hedef
            return val >= minRank && val <= targetVal;
          }
        } else {
          // Taban Puan Metriği: Büyük sayılar daha iyi (örn: 450, 550)
          const percentSpan = targetVal * tolRatio;
          const effectiveSpan = Math.max(percentSpan, tolPercent > 0 ? 15 : 5);

          if (tolPercent === 0) {
            return Math.abs(val - targetVal) <= 5;
          }
          const minScore = targetVal - effectiveSpan;
          const maxScore = targetVal + effectiveSpan;

          if (direction === 'both') {
            return val >= minScore && val <= maxScore;
          } else if (direction === 'safe') { // Puan düşerse
            return val <= targetVal && val >= minScore;
          } else if (direction === 'reach') { // Yüksek hedef
            return val >= targetVal && val <= maxScore;
          }
        }
        return true;
      });
    }

    return records;
  }

  function getProgramSeriesName(r) {
    if (!r) return '';
    const uni = YKS_DATABASE.universities.find(u => u.id === r.uniId);
    const uniName = uni ? uni.name.trim() : (r.uniId ? r.uniId.trim() : '');
    const dept = YKS_DATABASE.departments.find(d => d.id === r.depId);
    const baseDeptName = dept ? dept.name.trim() : '';

    const tags = [];
    
    // Extract qualifications from fullName e.g. "(KKTC Uyruklu)", "(İngilizce)", "(İkinci Öğretim)", "(M.T.O.K.)"
    if (r.fullName && baseDeptName) {
      const full = r.fullName.trim();
      const matches = full.match(/\(([^)]+)\)/g);
      if (matches) {
        matches.forEach(m => {
          const clean = m.replace(/[()]/g, '').trim();
          if (clean && !tags.includes(clean)) tags.push(clean);
        });
      }
    }

    const sc = r.scholarship ? r.scholarship.trim() : '';
    if (sc && sc !== 'Genel' && sc !== 'Ücretsiz' && !tags.includes(sc)) {
      tags.push(sc);
    } else if (sc && tags.length === 0) {
      tags.push(sc);
    }

    if (tags.length > 0) {
      return `${uniName} (${tags.join(' - ')})`;
    }
    return uniName;
  }

  // 1. KPI Cards Render
  function renderKPIs() {
    const filtered = getFilteredRecords();
    let minRank = Infinity;
    let maxScore = 0;

    filtered.forEach(r => {
      const years = Object.keys(r.data);
      years.forEach(y => {
        const item = r.data[y];
        if (item && item.rank && item.rank > 0 && item.rank < minRank) minRank = item.rank;
        if (item && item.baseScore && item.baseScore > maxScore) maxScore = item.baseScore;
      });
    });

    const elRank = document.getElementById('kpiMinRank');
    const elScore = document.getElementById('kpiMaxScore');
    const elDept = document.getElementById('kpiSelectedDept');

    if (elRank) elRank.textContent = minRank === Infinity ? '-' : `#${minRank.toLocaleString()}`;
    if (elScore) elScore.textContent = maxScore === 0 ? '-' : `${maxScore} Puan`;
    
    const deptInfo = YKS_DATABASE.departments.find(d => d.id === state.selectedDept);
    const hasTarget = state.targetValue !== null && state.targetValue !== undefined && !isNaN(state.targetValue) && state.targetValue > 0;
    if (elDept) {
      if (deptInfo) {
        elDept.textContent = deptInfo.name;
      } else if (hasTarget) {
        const metricSymbol = state.targetMetric === 'rank' ? '#' : '';
        const unitSymbol = state.targetMetric === 'baseScore' ? ' Puan' : '';
        elDept.textContent = `Hedef: ${metricSymbol}${state.targetValue.toLocaleString()}${unitSymbol} (±%${state.targetTolerance})`;
      } else {
        elDept.textContent = 'Seçilmedi';
      }
    }
  }

  // 2. Trend Line Chart (2015-2025)
  function renderTrendChart() {
    if (!trendChart) return;
    const filtered = getFilteredRecords();
    const isRank = state.metricType === 'rank';
    const tc = getThemeColors();
    const hasTarget = state.targetValue !== null && state.targetValue !== undefined && !isNaN(state.targetValue) && state.targetValue > 0;

    if (filtered.length === 0) {
      let emptyMsg = 'Lütfen Önce Bir Bölüm Seçiniz';
      if (hasTarget) {
        emptyMsg = 'Hedef Kriterlerinize Uyan Program Bulunamadı (Esneklik Yüzdesini Artırabilirsiniz)';
      } else if (state.selectedDept) {
        emptyMsg = 'Seçili Kriterlerde Kayıt Bulunamadı';
      }
      trendChart.clear();
      trendChart.setOption({
        backgroundColor: 'transparent',
        title: {
          text: emptyMsg,
          textStyle: { color: tc.axisColor, fontSize: 13 },
          left: 'center',
          top: 'center'
        }
      });
      return;
    }
    
    // Ensure 100% unique series names if duplicate names occur in filtered set
    const nameCounts = {};
    filtered.forEach(r => {
      const name = getProgramSeriesName(r);
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    const series = filtered.map((r, idx) => {
      let seriesName = getProgramSeriesName(r);
      if (nameCounts[seriesName] > 1 && r.osymCode) {
        seriesName = `${seriesName} [Kod:${r.osymCode}]`;
      }
      const dataPoints = YKS_DATABASE.years.map(yr => {
        if (r.data[yr]) {
          const val = r.data[yr][state.metricType];
          return (val !== undefined && val !== null && val > 0) ? val : null;
        }
        return null;
      });

      const colors = ['#0284c7', '#e11d48', '#7c3aed', '#16a34a', '#d97706', '#2563eb', '#ff6b6b', '#1dd1a1'];
      const color = colors[idx % colors.length];

      return {
        name: seriesName,
        type: 'line',
        smooth: true,
        connectNulls: true,
        symbolSize: 8,
        lineStyle: { width: 3, color: color },
        itemStyle: { color: color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${color}33` },
            { offset: 1, color: `${color}00` }
          ])
        },
        data: dataPoints
      };
    });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tc.tooltipBg,
        borderColor: tc.tooltipBorder,
        textStyle: { color: tc.textColor },
        formatter: function(params) {
          if (!params || !Array.isArray(params) || params.length === 0) return '';
          let res = `<b style="color:var(--accent-cyan);">${params[0].name ? params[0].name : ''} Yılı Trend Analizi</b><br/>`;
          params.forEach(p => {
            if (p && p.value !== null && p.value !== undefined) {
              const valStr = isRank ? `#${p.value.toLocaleString()}` : `${p.value} Puan`;
              res += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:8px;height:8px;background-color:${p.color}"></span> ${p.seriesName}: <b>${valStr}</b><br/>`;
            } else if (p) {
              res += `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:8px;height:8px;background-color:${p.color}"></span> ${p.seriesName}: <b>Veri Yok</b><br/>`;
            }
          });
          return res;
        }
      },
      legend: {
        textStyle: { color: tc.axisColor },
        top: 0
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: YKS_DATABASE.years,
        axisLine: { lineStyle: { color: tc.tooltipBorder } },
        axisLabel: { color: tc.axisColor }
      },
      yAxis: {
        type: 'value',
        inverse: isRank,
        axisLine: { lineStyle: { color: tc.tooltipBorder } },
        splitLine: { lineStyle: { color: tc.splitLine } },
        axisLabel: {
          color: tc.axisColor,
          formatter: (val) => isRank ? `#${val ? val.toLocaleString() : 0}` : `${val}`
        }
      },
      series: series
    };

    trendChart.setOption(option, true);
  }

  // 3. Radar Chart (360° Fitted Radar Config - High Contrast Titles in Both Themes)
  function renderRadarChart() {
    if (!radarChart) return;
    const filtered = getFilteredRecords();
    const year = 2025;
    const tc = getThemeColors();
    const isMobile = window.innerWidth <= 768;

    if (filtered.length === 0) {
      radarChart.clear();
      radarChart.setOption({
        backgroundColor: 'transparent',
        title: {
          text: 'Seçili Kriterlerde Kayıt Bulunamadı',
          textStyle: { color: tc.axisColor, fontSize: 13 },
          left: 'center',
          top: 'center'
        }
      });
      return;
    }

    const radarSeriesData = filtered.map((r, idx) => {
      const seriesName = getProgramSeriesName(r);
      const d = r.data[year] || r.data[2024] || r.data[2023] || {};
      
      const rankScore = (d.rank && d.rank > 0) ? Math.max(10, 100 - Math.log10(d.rank) * 16) : 40;
      const baseScore = d.baseScore ? (d.baseScore / 600) * 100 : 50;
      const fillRate = d.quota ? (d.filled / d.quota) * 100 : 90;
      const gapRatio = (d.ceilingScore && d.baseScore) ? 100 - (d.ceilingScore - d.baseScore) * 2 : 75;

      const colors = ['#0284c7', '#e11d48', '#7c3aed', '#16a34a', '#d97706', '#2563eb'];
      const color = colors[idx % colors.length];

      return {
        name: seriesName,
        value: [
          Math.round(rankScore),
          Math.round(baseScore),
          Math.round(fillRate),
          Math.round(gapRatio)
        ],
        itemStyle: { color: color },
        areaStyle: { color: `${color}33` }
      };
    });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: tc.tooltipBg,
        borderColor: tc.tooltipBorder,
        textStyle: { color: tc.textColor }
      },
      legend: { textStyle: { color: tc.axisColor }, bottom: 0 },
      radar: {
        center: ['50%', '52%'],
        radius: isMobile ? '38%' : '54%',
        indicator: [
          { name: 'Başarı Sırası Gücü', max: 100 },
          { name: 'Taban Puan Gücü', max: 100 },
          { name: 'Kontenjan Doluluğu', max: 100 },
          { name: 'Puan Makası Dengesi', max: 100 }
        ],
        axisName: {
          color: tc.radarAxisNameColor, // Crystal clear contrast color (#00f2fe in Dark, #0f172a in Light)
          fontSize: isMobile ? 10 : 12,
          fontWeight: 800,
          padding: [-3, 0]
        },
        splitArea: {
          areaStyle: {
            color: document.body.classList.contains('light-mode') 
              ? ['rgba(241, 245, 249, 0.7)', 'rgba(226, 232, 240, 0.9)']
              : ['rgba(22, 27, 46, 0.4)', 'rgba(10, 12, 20, 0.6)']
          }
        },
        splitLine: { lineStyle: { color: tc.splitLine } }
      },
      series: [{
        type: 'radar',
        data: radarSeriesData
      }]
    };

    radarChart.setOption(option, true);
  }

  // 4. Ceiling vs Base Score Band Area Chart
  function renderRangeChart() {
    if (!rangeChart) return;
    const filtered = getFilteredRecords();
    const uniData = filtered[0];
    const tc = getThemeColors();

    if (!uniData) {
      rangeChart.clear();
      rangeChart.setOption({
        backgroundColor: 'transparent',
        title: {
          text: 'Seçili Kriterlerde Kayıt Bulunamadı',
          textStyle: { color: tc.axisColor, fontSize: 13 },
          left: 'center',
          top: 'center'
        }
      });
      return;
    }

    const seriesName = getProgramSeriesName(uniData);
    const years = YKS_DATABASE.years;
    
    const baseScores = years.map(y => (uniData.data[y] && uniData.data[y].baseScore) ? uniData.data[y].baseScore : null);
    const ceilingScores = years.map(y => (uniData.data[y] && uniData.data[y].ceilingScore) ? uniData.data[y].ceilingScore : null);

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: `${seriesName} - Tavan vs Taban Puan Makası`,
        textStyle: { color: tc.axisColor, fontSize: 12 },
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tc.tooltipBg,
        borderColor: tc.tooltipBorder,
        textStyle: { color: tc.textColor }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: tc.tooltipBorder } },
        axisLabel: { color: tc.axisColor }
      },
      yAxis: {
        type: 'value',
        min: 150,
        max: 600,
        axisLine: { lineStyle: { color: tc.tooltipBorder } },
        splitLine: { lineStyle: { color: tc.splitLine } },
        axisLabel: { color: tc.axisColor }
      },
      series: [
        {
          name: 'Taban Puan (Son Giren)',
          type: 'line',
          data: baseScores,
          connectNulls: true,
          lineStyle: { color: '#e11d48', width: 2 },
          itemStyle: { color: '#e11d48' }
        },
        {
          name: 'Tavan Puan (1. Giren)',
          type: 'line',
          data: ceilingScores,
          connectNulls: true,
          lineStyle: { color: '#16a34a', width: 2 },
          itemStyle: { color: '#16a34a' }
        }
      ]
    };

    rangeChart.setOption(option, true);
  }

  // 5. Quota vs Filled Bar Chart
  function renderQuotaChart() {
    if (!quotaChart) return;
    const filtered = getFilteredRecords();
    const years = YKS_DATABASE.years;
    const tc = getThemeColors();

    if (filtered.length === 0) {
      quotaChart.clear();
      quotaChart.setOption({
        backgroundColor: 'transparent',
        title: {
          text: 'Seçili Kriterlerde Kayıt Bulunamadı',
          textStyle: { color: tc.axisColor, fontSize: 13 },
          left: 'center',
          top: 'center'
        }
      });
      return;
    }

    const series = filtered.map((r, idx) => {
      const seriesName = getProgramSeriesName(r);
      const quotas = years.map(y => r.data[y] ? r.data[y].quota : 0);

      const colors = ['#0284c7', '#e11d48', '#7c3aed', '#16a34a', '#d97706', '#2563eb'];
      return {
        name: seriesName,
        type: 'bar',
        barGap: 0,
        itemStyle: { color: colors[idx % colors.length] },
        data: quotas
      };
    });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: tc.tooltipBg,
        borderColor: tc.tooltipBorder,
        textStyle: { color: tc.textColor }
      },
      legend: { textStyle: { color: tc.axisColor }, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: tc.tooltipBorder } },
        axisLabel: { color: tc.axisColor }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: tc.tooltipBorder } },
        splitLine: { lineStyle: { color: tc.splitLine } },
        axisLabel: { color: tc.axisColor }
      },
      series: series
    };

    quotaChart.setOption(option, true);
  }

  // 6. Data Table Render
  function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filtered = getFilteredRecords();

    filtered.forEach(r => {
      const uni = YKS_DATABASE.universities.find(u => u.id === r.uniId);
      const dept = YKS_DATABASE.departments.find(d => d.id === r.depId);
      
      const latestData = r.data[2025] || r.data[2024] || r.data[2023] || {};
      const prevData = r.data[2024] || r.data[2023] || r.data[2022] || {};

      const rankDiff = (prevData.rank && latestData.rank) ? prevData.rank - latestData.rank : 0;
      const rankDiffText = rankDiff > 0 
        ? `<span style="color:var(--accent-green)">▲ +${rankDiff.toLocaleString()} sıra yükseldi</span>` 
        : (rankDiff < 0 ? `<span style="color:var(--accent-magenta)">▼ ${rankDiff.toLocaleString()}</span>` : '-');

      let bursClass = 'burs-badge';
      if (r.scholarship === 'Burslu') bursClass += ' burslu';
      else if (r.scholarship === '%50 İndirimli') bursClass += ' indirim50';
      else if (r.scholarship === 'Ücretli') bursClass += ' ucretli';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${uni ? uni.name : r.uniId}</b></td>
        <td>${dept ? dept.name : r.depId}</td>
        <td><span class="${bursClass}">${r.scholarship}</span></td>
        <td><span class="rank-badge">${(latestData.rank && latestData.rank > 0) ? '#' + latestData.rank.toLocaleString() : '-'}</span></td>
        <td><span class="score-badge">${latestData.baseScore ? latestData.baseScore : '-'}</span></td>
        <td>${latestData.quota ? latestData.quota : '-'}</td>
        <td>${rankDiffText}</td>
      `;
      tbody.appendChild(tr);
    });
  }
});






















    const DB_URL = 'https://btumflgeykoxjyukdhia.supabase.co';
    const DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dW1mbGdleWtveGp5dWtkaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUxMTQsImV4cCI6MjEwNzY0MTExNH0.jX2aAnyCPdA5bzEhxUJH2_37-SlDXwLNUWiE3AgCgAE'; 
    const ONLINE_TABLE_CANDIDATES = ['Data_Online', 'Data_Onlie'];

    let dbClient;
    let session = null;
    let currentData = null;
    let rawOn = [];
    let targetOn = 0;

    // Helper Format Angka & Teks
    const fmt = (v) => (v || 0).toLocaleString('id-ID');

    function loadOnlineModule() {
      if (!dbClient) return;

      (async () => {
        const candidates = ['Data_Online', 'Data_Onlie'];
        let rows = [];

        for (const tableName of candidates) {
          try {
            const { data, error } = await dbClient.from(tableName).select('*').order('Tanggal', { ascending: false });
            if (!error && Array.isArray(data) && data.length) {
              rows = data;
              break;
            }
          } catch (err) {
            console.warn('Cek table online gagal:', tableName, err);
          }
        }

        rawOn = (rows || []).map((item) => {
          const tgl = normalizeDateValue(item.Tanggal || item.tanggal || item.Tgl || item.tgl || '');
          const sShopee = numberFromValue(item.Sales_Shopee ?? item.sShopee ?? item.Shopee ?? item.sales_shopee ?? 0);
          const sTiktok = numberFromValue(item.Sales_Tiktok ?? item.sTiktok ?? item.Tiktok ?? item.sales_tiktok ?? 0);
          const sWeb = numberFromValue(item.Sales_Web ?? item.sWeb ?? item.Web ?? item.sales_web ?? 0);
          const totalS = sShopee + sTiktok + sWeb;
          return { tgl, sShopee, sTiktok, sWeb, totalS };
        });

        try {
          const { data: targetRows, error: targetErr } = await dbClient
            .from('Ref_Cabang')
            .select('Target_Online,target_online,Target_Bulanan,target_bulanan')
            .or('ID_Cabang.eq.ONLINE,ID_Cabang.eq.online,ID_Cabang.eq.ALL,ID_Cabang.eq.all')
            .limit(1);

          if (!targetErr && Array.isArray(targetRows) && targetRows.length) {
            const val = Number(targetRows[0].Target_Online ?? targetRows[0].target_online ?? targetRows[0].Target_Bulanan ?? targetRows[0].target_bulanan ?? 0);
            targetOn = Number.isFinite(val) ? val : 0;
          } else {
            targetOn = 0;
          }
        } catch (err) {
          console.warn('Gagal mengambil target online:', err);
          targetOn = 0;
        }

        updateOnlineDashboard();
      })();
    }

    function updateOnlineDashboard() {
      const channel = document.getElementById('onChannelFilter') ? document.getElementById('onChannelFilter').value : 'all';
      const today = new Date();
      const cM = today.getMonth();
      const cY = today.getFullYear();

      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const kemarenDate = new Date(todayDateOnly);
      kemarenDate.setDate(kemarenDate.getDate() - 1);
      const yStr = kemarenDate.toISOString().split('T')[0];

      let cards = { yes: { s: 0, t: 0, w: 0, tot: 0 }, mon: { s: 0, t: 0, w: 0, tot: 0 }, ytd: { s: 0, t: 0, w: 0, tot: 0 } };
      let matrix = { Shopee: Array(12).fill(0), Tiktok: Array(12).fill(0), Web: Array(12).fill(0), Summary: Array(12).fill(0) };
      let donut = { Shopee: 0, Tiktok: 0, Web: 0 };

      let labels7 = [];
      let values7 = [];

      for (let i = 6; i >= 0; i--) {
        let d = new Date(todayDateOnly);
        d.setDate(d.getDate() - i);
        labels7.push(d.getDate().toString());
        values7.push(0);
      }

      rawOn.forEach((item) => {
        if (!item.tgl && !item.Tanggal && !item.tanggal) return;

        const itemDate = item.tgl || item.Tanggal || item.tanggal || '';
        const parts = String(itemDate).split('-');
        if (parts.length !== 3) return;

        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const m = d.getMonth();
        const y = d.getFullYear();
        const itemStr = itemDate;

        if (y === cY) {
          if (itemStr === yStr) {
            cards.yes.s += Number(item.sShopee || 0);
            cards.yes.t += Number(item.sTiktok || 0);
            cards.yes.w += Number(item.sWeb || 0);
            cards.yes.tot += Number(item.totalS || 0);
          }

          if (m === cM) {
            cards.mon.s += Number(item.sShopee || 0);
            cards.mon.t += Number(item.sTiktok || 0);
            cards.mon.w += Number(item.sWeb || 0);
            cards.mon.tot += Number(item.totalS || 0);
            donut.Shopee += Number(item.sShopee || 0);
            donut.Tiktok += Number(item.sTiktok || 0);
            donut.Web += Number(item.sWeb || 0);
          }

          cards.ytd.s += Number(item.sShopee || 0);
          cards.ytd.t += Number(item.sTiktok || 0);
          cards.ytd.w += Number(item.sWeb || 0);
          cards.ytd.tot += Number(item.totalS || 0);

          const isS = channel === 'all' || channel === 'Shopee';
          const isT = channel === 'all' || channel === 'Tiktok';
          const isW = channel === 'all' || channel === 'Web';
          const valFiltered = (isS ? Number(item.sShopee || 0) : 0) + (isT ? Number(item.sTiktok || 0) : 0) + (isW ? Number(item.sWeb || 0) : 0);

          matrix.Shopee[m] += Number(item.sShopee || 0);
          matrix.Tiktok[m] += Number(item.sTiktok || 0);
          matrix.Web[m] += Number(item.sWeb || 0);
          matrix.Summary[m] += valFiltered;

          const diffDays = Math.floor((todayDateOnly - d) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 6) {
            values7[6 - diffDays] += valFiltered;
          }
        }
      });

      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.innerText = fmt(v);
      };

      set('onYesS', cards.yes.s);
      set('onYesT', cards.yes.t);
      set('onYesW', cards.yes.w);
      set('onYesTot', cards.yes.tot);
      set('onMonS', cards.mon.s);
      set('onMonT', cards.mon.t);
      set('onMonW', cards.mon.w);
      set('onMonTot', cards.mon.tot);
      set('onYtdS', cards.ytd.s);
      set('onYtdT', cards.ytd.t);
      set('onYtdW', cards.ytd.w);
      set('onYtdTot', cards.ytd.tot);

      renderTargetOn(cards.mon.tot, targetOn);
      renderLineChartOnline(labels7, values7);
      renderOnlineMatrixTable(matrix, 'onMatrixSales', 'Rp');
      renderDonutOnline(donut);
    }

    function renderTargetOn(actual, target) {
      const panel = document.getElementById('onTargetPanel');
      if (!panel) return;

      const pct = target > 0 ? Math.min((actual / target) * 100, 100).toFixed(1) : 0;
      panel.innerHTML = `
        <p class="label-mini !mb-3 text-cyan-400 font-bold uppercase text-[9px]">Target MTD Online</p>
        <div class="relative pt-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] font-black italic text-white">${pct}%</span>
            <span class="text-[9px] text-white/50 italic">Target: ${fmt(target)}</span>
          </div>
          <div class="overflow-hidden h-1.5 flex rounded bg-cyan-900">
            <div style="width:${pct}%" class="bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
          </div>
          <p class="text-[9px] mt-2 text-white/50 italic">Achieved: <span class="text-white font-bold">Rp ${fmt(actual)}</span></p>
        </div>
      `;
    }

    function renderLineChartOnline(labels, dataValues) {
      const canvas = document.getElementById('cLineOnline');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (window.myLineOn) window.myLineOn.destroy();

      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      window.myLineOn = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Sales Online',
            data: dataValues,
            borderColor: '#06b6d4',
            borderWidth: 3,
            fill: true,
            backgroundColor: gradient,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#06b6d4'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 8 } } },
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 8 } } }
          }
        }
      });
    }

    function renderOnlineMatrixTable(matrixData, targetId, prefix) {
      const container = document.getElementById(targetId);
      if (!container) return;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      let html = `<table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/10 text-white/40 uppercase text-[8px]">
            <th class="p-2">Channel</th>
            ${months.map((m) => `<th class="p-2 text-center">${m}</th>`).join('')}
            <th class="p-2 text-right bg-white/5">TOTAL</th>
          </tr>
        </thead>
        <tbody class="text-white text-[9px]">`;

      Object.keys(matrixData).forEach((channel) => {
        const arr = matrixData[channel] || [];
        const rowTotal = arr.reduce((a, b) => a + b, 0);
        const isSum = channel === 'Summary';
        html += `<tr class="border-b border-white/5 ${isSum ? 'bg-cyan-500/10 font-bold' : ''}">
          <td class="p-2 text-white/70">${channel}</td>
          ${arr.map((val) => `<td class="p-2 text-center">${val > 0 ? fmt(val) : '-'}</td>`).join('')}
          <td class="p-2 text-right bg-white/5 ${isSum ? 'text-cyan-400' : ''}">${fmt(rowTotal)}</td>
        </tr>`;
      });

      html += `</tbody></table>`;
      container.innerHTML = html;
    }

    function renderDonutOnline(data) {
      const canvas = document.getElementById('onDonutShare');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (window.myDonutOn) window.myDonutOn.destroy();

      const total = (data.Shopee || 0) + (data.Tiktok || 0) + (data.Web || 0);
      const vals = [data.Shopee || 0, data.Tiktok || 0, data.Web || 0];
      const colors = ['#06b6d4', '#fb923c', '#a855f7'];

      window.myDonutOn = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Shopee', 'Tiktok', 'Web'],
          datasets: [{
            data: vals,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          cutout: '70%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });

      let legendHtml = '';
      ['Shopee', 'Tiktok', 'Web'].forEach((lab, i) => {
        const pct = total > 0 ? ((vals[i] / total) * 100).toFixed(1) : 0;
        legendHtml += `
          <div class="flex justify-between items-center py-1 border-b border-white/5">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" style="background:${colors[i]}"></div>
              <span class="text-white/60 text-[10px]">${lab}</span>
            </div>
            <span class="font-bold text-white text-[10px]">${pct}%</span>
          </div>`;
      });

      const legEl = document.getElementById('onDonutLeg');
      if (legEl) legEl.innerHTML = legendHtml;
    }

    // Helper Format Angka & Teks
    const kFmt = (v) => { if (v === 0) return '-'; if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'; if (v >= 1000) return (v / 1000).toFixed(0) + 'K'; return v; };

    try {
      dbClient = window.supabase.createClient(DB_URL, DB_KEY);
    } catch (err) {
      console.error("Gagal menginisialisasi Supabase:", err);
    }

    function setAuthScreen(mode) {
      const loginPage = document.getElementById('loginPage');
      const mainArea = document.getElementById('mainArea');
      if (!loginPage || !mainArea) return;

      const showLogin = mode === 'login';
      loginPage.style.display = showLogin ? 'flex' : 'none';
      mainArea.style.display = showLogin ? 'none' : 'flex';
    }

    window.addEventListener('DOMContentLoaded', () => {
      setupYearSelector();
      bindThousandInput('#posX');
      bindThousandInput('#fPosX');
      bindThousandInput('#grab');
      bindThousandInput('#fGrab');
      bindThousandInput('#shopee');
      bindThousandInput('#fShopee');
      bindThousandInput('#tiktok');
      bindThousandInput('#fTiktok');
      bindThousandInput('#web');
      bindThousandInput('#fWeb');

      const savedSession = localStorage.getItem('mr_v20_session');
      setAuthScreen('login');

      if (!savedSession) {
        document.body.classList.add('app-ready');
        return;
      }

      try {
        const parsed = JSON.parse(savedSession);
        if (!parsed || (!parsed.Username && !parsed.username)) {
          throw new Error('session tidak valid');
        }

        session = parsed;
        localStorage.setItem('currentUser', JSON.stringify(parsed));
        activateMainApp(session);
      } catch (e) {
        console.error('Gagal memparsing sesi:', e);
        localStorage.removeItem('mr_v20_session');
        localStorage.removeItem('currentUser');
        session = null;
        setAuthScreen('login');
      }

      document.body.classList.add('app-ready');
    });

    function setupYearSelector() { 
      const s = document.getElementById('matrixYear'); 
      if(!s) return;
      const cur = new Date().getFullYear(); 
      let h = ""; 
      for(let i=cur; i>=2024; i--) { 
        h += `<option value="${i}">${i}</option>`; 
      } 
      s.innerHTML = h; 
    }

    async function doLogin() {
      const u = document.getElementById('user').value.trim();
      const p = document.getElementById('pass').value.trim();

      if (!u || !p) {
        Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'Username dan Password wajib diisi!' });
        return;
      }

      try {
        const { data, error } = await dbClient
          .from('Ref_User')
          .select('*')
          .eq('Username', u);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Gagal Database', text: error.message });
          return;
        }

        if (!data || data.length === 0) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: 'Username tidak ditemukan di database!' });
          return;
        }

        const userObj = data[0];
        if (userObj.password !== p) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: 'Password salah!' });
          return;
        }

        session = userObj;
        localStorage.setItem('mr_v20_session', JSON.stringify(userObj));
        localStorage.setItem('currentUser', JSON.stringify(userObj));
        activateMainApp(userObj);
        
        Swal.fire({ icon: 'success', title: 'Berhasil', text: `Selamat datang, ${userObj.Username}!`, timer: 1200, showConfirmButton: false });

      } catch (err) {
        console.error('Error sistem login:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal terhubung ke database Supabase.' });
      }
    }

    function activateMainApp(userObj) {
      setAuthScreen('app');

      const navUserName = document.getElementById('navUserName');
      const navUserRole = document.getElementById('navUserRole');
      const navUserInitial = document.getElementById('navUserInitial');

      if (navUserName) navUserName.innerText = userObj.Username || userObj.username || 'USER';
      if (navUserRole) navUserRole.innerText = userObj.Role || userObj.role || 'MEMBER';

      const uname = userObj.Username || userObj.username || 'U';
      if (navUserInitial) navUserInitial.innerText = uname.charAt(0).toUpperCase();

      const savedTab = localStorage.getItem('mr_v20_tab');
      if (window.innerWidth < 768) {
        if (!savedTab || savedTab === 'dashboard' || savedTab === 'dashboardFinance') {
          showTab('menu');
          return;
        }
      }

      const lastTab = savedTab || 'dashboard';
      showTab(lastTab);
    }

    function toggleSubmenu(element) {
      const submenu = element.nextElementSibling;
      const icon = element.querySelector('.fa-chevron-down');
      if (submenu) {
        submenu.classList.toggle('hidden');
        if (icon) {
          icon.style.transform = submenu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      }
    }

    function showTab(id) { 
      if (id === 'logistik_analysis') id = 'logistikAnalysis';

      if (id === 'menu') {
        const allTabs = [
          'dashboard','input','search','analisa', 'po', 'purchase', 'payment-plan', 'purchase-analisa', 'supplier-analisa', 'logistik', 'logistikAnalysis', 'gm', 'online', 'grafik', 'grafikBar', 
          'payment', 'dashboardFinance', 'financeInput', 'paymentSearch', 'accountTransfer', 'info-promo',
          'settingsUsers','settingsCabang', 'settingsSupplier', 'settingsApk', 'settingsZap', 'profile'
        ];
        allTabs.forEach(t => {
          const el = document.getElementById('tab-' + t);
          if (el) el.classList.add('hidden');
        });

        const menuTab = document.getElementById('tab-menu');
        if (menuTab) menuTab.classList.remove('hidden');

        const headEl = document.getElementById('headerTitle');
        if (headEl) headEl.innerText = 'RPS APP INTEGRATED';
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
          btn.classList.remove('active');
          const onclick = btn.getAttribute('onclick');
          if (onclick && onclick.includes(`showTab('menu')`)) {
            btn.classList.add('active');
          }
        });

        localStorage.setItem('mr_v20_tab', 'menu');
        return;
      }

      if (id === 'profile') {
        const menuTabEl = document.getElementById('tab-menu');
        if (menuTabEl) menuTabEl.classList.add('hidden');

        const tabsProfileCheck = [
          'dashboard','input','search','analisa', 'po', 'purchase', 'payment-plan', 'purchase-analisa', 'supplier-analisa', 'logistik', 'logistikAnalysis', 'gm', 'online', 'grafik', 'grafikBar', 
          'payment', 'dashboardFinance', 'financeInput', 'paymentSearch', 'accountTransfer', 'info-promo',
          'settingsUsers','settingsCabang', 'settingsSupplier', 'settingsApk', 'settingsZap'
        ];
        tabsProfileCheck.forEach(t => {
          const el = document.getElementById('tab-' + t);
          if (el) el.classList.add('hidden');
        });

        const profileTab = document.getElementById('tab-profile');
        if (profileTab) profileTab.classList.remove('hidden');
        
        const headEl = document.getElementById('headerTitle');
        if (headEl) headEl.innerText = 'PROFIL AKUN PENGGUNA';
        
        if (typeof loadActiveProfile === "function") loadActiveProfile();
        localStorage.setItem('mr_v20_tab', 'profile');
        return;
      }

      const activeSession = session || JSON.parse(localStorage.getItem('currentUser')) || {};
      const roleSekarang = (activeSession.role || activeSession.Role || "").toUpperCase();
      const branchSekarang = (activeSession.branchId || activeSession.cabang || "").toLowerCase();
      
      const isInitializing = !session && !localStorage.getItem('currentUser');
      const isOwner = isInitializing || (roleSekarang.includes("OWNER") || roleSekarang.includes("SUPER ADMIN") || branchSekarang === "all");
      const isAdmin = isInitializing || (roleSekarang.includes("ADMIN")); 
      
      const menuKhususOwner = [
        'payment-plan', 'payment', 'dashboardFinance', 'financeInput', 'paymentSearch', 'accountTransfer', 
        'settingsCabang','settingsSupplier', 'settingsApk', 'settingsZap'
      ];
      
      const isMenuUsers = (id === 'settingsUsers');

      if (!isInitializing && menuKhususOwner.includes(id) && !isOwner) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Hanya untuk Owner!' });
        }
        return showTab('dashboard'); 
      }
      
      if (!isInitializing && isMenuUsers && !isOwner && !isAdmin) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Hanya untuk Owner & Admin!' });
        }
        return showTab('dashboard');
      }

      const profileTabEl = document.getElementById('tab-profile');
      if (profileTabEl) profileTabEl.classList.add('hidden');
      
      const menuTabEl = document.getElementById('tab-menu');
      if (menuTabEl) menuTabEl.classList.add('hidden');

      const tabs = [
        'dashboard','input','search','analisa', 'po', 'purchase', 'payment-plan', 'purchase-analisa', 'supplier-analisa', 'logistik', 'logistikAnalysis', 'gm', 'online', 'grafik', 'grafikBar', 
        'payment', 'dashboardFinance', 'financeInput', 'paymentSearch', 'accountTransfer', 'info-promo',
        'settingsUsers','settingsCabang', 'settingsSupplier', 'settingsApk', 'settingsZap'
      ];
      
      tabs.forEach(t => { 
        const contentEl = document.getElementById('tab-' + t);
        const navEl = document.getElementById('nav-' + t);
        
        if(contentEl) {
          contentEl.classList.add('hidden'); 
        }
        
        if(navEl) {
          navEl.classList.remove('active-menu', 'text-yellow-500', 'text-yellow-400', 'text-purple-400', 'text-cyan-400', 'text-green-400', 'text-amber-400', 'text-orange-400', 'text-emerald-400', 'text-indigo-400', 'text-teal-400', 'bg-white/10');
          navEl.classList.add('text-white/50'); 
          
          if (menuKhususOwner.includes(t) && !isOwner) {
            navEl.classList.add('hidden');
          } else if (menuKhususOwner.includes(t) && isOwner) {
            navEl.classList.remove('hidden');
          }
        }
      }); 

      let targetTab = document.getElementById('tab-' + id);
      if (!targetTab && id === 'logistik_analysis') {
        targetTab = document.getElementById('tab-logistik_analysis');
      }
      
      if(targetTab) {
        targetTab.classList.remove('hidden');
      } else {
        console.error("Tab tidak ditemukan: tab-" + id);
      }

      switch(id) {
        case 'dashboard': if (typeof updateUI === "function") updateUI(); break;
        case 'dashboardFinance': if (typeof loadOwnerDashboardData === "function") loadOwnerDashboardData(); break; 
        case 'financeInput': if (typeof loadFinanceDropdownOptions === "function") loadFinanceDropdownOptions(); if (typeof resetFinanceForm === "function") resetFinanceForm(); break;
        case 'payment-plan': if (typeof loadPaymentPlanData === "function") loadPaymentPlanData(); break;
        case 'payment': if (typeof loadDaftarPembayaran === "function") loadDaftarPembayaran(); break;
        case 'paymentSearch': if (typeof clearPaymentSearch === "function") clearPaymentSearch(); break; 
        case 'accountTransfer': if (typeof clearMutationSearch === "function") clearMutationSearch(); if (typeof loadMutationBankDropdown === "function") loadMutationBankDropdown(); break; 
        case 'online': if (typeof loadOnlineModule === "function") loadOnlineModule(); break;
        case 'grafik': if (typeof loadGrafikModule === "function") loadGrafikModule(); break;
        case 'grafikBar': break; 
        case 'search': if (typeof loadSearchData === "function") loadSearchData(); break;
        case 'logistik': if (typeof LogistikApp !== 'undefined') LogistikApp.init(); break;
        case 'logistikAnalysis': if (typeof loadLogistikAnalysisModule === "function") loadLogistikAnalysisModule(); break;
        case 'gm': if (typeof loadGMData === "function") loadGMData(); break;
        case 'info-promo': if (typeof loadInfoPromoData === "function") loadInfoPromoData(); break;
        case 'po': if (typeof loadPOTab === "function") loadPOTab(); break;
        case 'purchase': if (typeof loadBeliTab === "function") loadBeliTab(); break;
        case 'purchase-analisa': break; 
        case 'supplier-analisa': break; 
        case 'input': 
          if (typeof setToday === "function") setToday();
          if (typeof loadSalesHistory === "function") loadSalesHistory();
          if (typeof loadOnlineHistory === "function") loadOnlineHistory();
          if (typeof updateUI === "function") updateUI();
          break;
        case 'settingsUsers': if (typeof loadUsersSettings === "function") loadUsersSettings(); break;
        case 'settingsCabang': if (typeof loadCabangSettings === "function") loadCabangSettings(); break;
        case 'settingsSupplier': if (typeof loadSupplierSettings === "function") loadSupplierSettings(); break;
        case 'settingsApk': if (typeof loadConfigSettings === "function") loadConfigSettings(); break;
        case 'settingsZap': if (typeof loadZapData === "function") loadZapData(); break;
      }

      const activeNav = document.getElementById('nav-' + id);
      if(activeNav) {
        activeNav.classList.remove('text-white/50');
        let activeColor = 'text-yellow-500'; 
        if (id === 'logistik') activeColor = 'text-purple-400';
        if (id === 'logistikAnalysis') activeColor = 'text-indigo-400';
        if (id === 'info-promo') activeColor = 'text-cyan-400';
        if (id === 'purchase-analisa') activeColor = 'text-cyan-400'; 
        if (id === 'supplier-analisa') activeColor = 'text-teal-400'; 
        if (id === 'gm') activeColor = 'text-teal-400'; 
        if (id === 'online' || id === 'payment' || id === 'payment-plan') activeColor = 'text-cyan-400'; 
        if (id === 'grafik' || id === 'grafikBar') activeColor = 'text-green-400'; 
        if (id === 'dashboardFinance') activeColor = 'text-amber-400'; 
        if (id === 'financeInput') activeColor = 'text-orange-400'; 
        if (id === 'paymentSearch') activeColor = 'text-yellow-400'; 
        if (id === 'accountTransfer') activeColor = 'text-emerald-400'; 
        
        activeNav.classList.add('active-menu', activeColor, 'bg-white/10');
      }

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        const onclick = btn.getAttribute('onclick');
        if (onclick && (onclick.includes(`showTab('${id}')`) || onclick.includes(`showTab('logistik_analysis')`))) {
          btn.classList.add('active');
        }
      });

      const headEl = document.getElementById('headerTitle');
      if(headEl) {
        const titles = {
          'dashboard': 'DASHBOARD UTAMA', 
          'input': 'INPUT DATA BARU', 
          'search': 'PENCARIAN DATA',
          'analisa': 'ANALISA DATA', 
          'po': 'PURCHASE ORDER (PO)', 
          'purchase': 'DATA PEMBELIAN',
          'payment-plan': 'PAYMENT PLAN & INVOICE',
          'purchase-analisa': 'PURCHASE ANALYSIS',
          'supplier-analisa': 'SUPPLIER ANALYSIS', 
          'logistik': 'MANAJEMEN LOGISTIK', 
          'logistikAnalysis': 'LOGISTIK ANALYSIS',
          'info-promo': 'INFO PROMO LOGISTIK',
          'gm': 'DATA PRODUK GRABMERCHANT', 
          'online': 'DASHBOARD SALES ONLINE', 
          'grafik': 'GRAFIK ANALISA YOY',
          'grafikBar': 'COMPARATIVE BAR & GROWTH ANALYTICS', 
          'payment': 'DATA PEMBAYARAN SUPPLIER', 
          'dashboardFinance': 'FINANCE MANAGEMENT DASHBOARD',
          'financeInput': 'BATCH REKENING TRANSACTION MUTASI', 
          'paymentSearch': 'PAYMENT SUPPLIER REPORT',
          'accountTransfer': 'ACCOUNT TRANSFER MUTASI REKENING', 
          'settingsUsers': 'MANAJEMEN USERS',
          'settingsCabang': 'MANAJEMEN CABANG',
          'settingsSupplier': 'MANAJEMEN SUPPLIER',
          'settingsApk': 'KONFIGURASI APLIKASI',
          'settingsZap': 'ZAP DATA MONITORING'
        };
        headEl.innerText = titles[id] || id.toUpperCase();
      }

      localStorage.setItem('mr_v20_tab', id); 
    }

    function logout() {
      localStorage.removeItem('mr_v20_session');
      localStorage.removeItem('currentUser');
      session = null;
      setAuthScreen('login');
      document.getElementById('user').value = '';
      document.getElementById('pass').value = '';
    }

    function formatRp(value) {
      const num = Number(value || 0);
      return `Rp ${num.toLocaleString('id-ID')}`;
    }

    function formatAngka(value) {
      const num = Number(value || 0);
      return num.toLocaleString('id-ID');
    }

    function cleanNum(value) {
      if (value === null || value === undefined || value === '') return 0;
      const cleaned = String(value).replace(/[^0-9.-]/g, '');
      if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : 0;
    }

    function getRowValue(row, keys) {
      for (const key of keys) {
        if (row && Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== undefined && row[key] !== '') {
          return row[key];
        }
      }
      return 0;
    }

    function formatTanggalTeks(tglStr) {
      if (!tglStr) return tglStr;
      const raw = String(tglStr).trim();
      if (!raw) return raw;
      const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
      const normalized = datePart.includes('/') ? datePart.replace(/\//g, '-') : datePart;
      const parts = normalized.split('-');
      if (parts.length !== 3) return normalized;

      let tgl = parts[0];
      let bln = parts[1];
      let thn = parts[2];

      if (tgl.length === 4) {
        thn = parts[0];
        bln = parts[1];
        tgl = parts[2];
      }

      const bulanMap = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
        '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
      };

      return `${String(tgl).padStart(2, '0')}-${bulanMap[String(bln).padStart(2, '0')] || bln}-${thn}`;
    }

    function formatTanggalCabang(tglStr) {
      if (!tglStr) return tglStr;
      const raw = String(tglStr).trim();
      if (!raw) return raw;
      const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
      const normalized = datePart.includes('/') ? datePart.replace(/\//g, '-') : datePart;
      const parts = normalized.split('-');
      if (parts.length !== 3) return normalized;

      let tgl = parts[0];
      let bln = parts[1];
      let thn = parts[2];

      if (tgl.length === 4) {
        thn = parts[0];
        bln = parts[1];
        tgl = parts[2];
      }

      const bulanMap = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
        '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
      };

      return `${String(tgl).padStart(2, '0')}-${bulanMap[String(bln).padStart(2, '0')] || bln}-${thn}`;
    }

    async function getRpsSummaryByDate(dateInput) {
      const targetDate = String(dateInput || '').trim();
      if (!targetDate || !dbClient) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      const normalized = normalizeDateValue(targetDate);
      const end = new Date(`${normalized}T23:59:59`);
      if (Number.isNaN(end.getTime())) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      const start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0);
      const { data, error } = await dbClient.from('Data_Penjualan').select('*');
      if (error) throw error;

      const harian = { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 };
      const mtd = { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 };

      for (const row of data || []) {
        const rawDate = row.Tanggal || row.tanggal || row.Tgl || row.tgl;
        if (!rawDate) continue;

        const normalizedRowDate = normalizeDateValue(rawDate);
        const rowDate = normalizedRowDate ? new Date(`${normalizedRowDate}T00:00:00`) : null;
        if (!rowDate || Number.isNaN(rowDate.getTime())) continue;

        const pos = cleanNum(getRowValue(row, ['Sales_PosX', 'Sales_POSX', 'PosX', 'posX']));
        const frekPos = cleanNum(getRowValue(row, ['Freq_PosX', 'Freq_POSX', 'FreqPosX', 'freqPosX']));
        const grab = cleanNum(getRowValue(row, ['Sales_Grabmart', 'Sales_Grab', 'Grabmart', 'grab']));
        const frekGrab = cleanNum(getRowValue(row, ['Freq_Grabmart', 'Freq_Grab', 'FreqGrabmart', 'freqGrab']));

        if (rowDate >= start && rowDate <= end) {
          mtd.pos += pos;
          mtd.frekPos += frekPos;
          mtd.grab += grab;
          mtd.frekGrab += frekGrab;
        }

        if (rowDate.toDateString() === end.toDateString()) {
          harian.pos += pos;
          harian.frekPos += frekPos;
          harian.grab += grab;
          harian.frekGrab += frekGrab;
        }
      }

      return { harian, mtd };
    }

    async function getCabangSummaryByDate(dateInput, cabangCode) {
      const targetDate = String(dateInput || '').trim();
      const cabangInput = String(cabangCode || '').trim();
      if (!targetDate || !cabangInput || !dbClient) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      const normalizeBranchName = (value) => {
        const cleaned = String(value || '').trim().toLowerCase();
        return cleaned.replace(/[^a-z]/g, '');
      };

      const branchKey = normalizeBranchName(cabangInput);
      const branchAliases = {
        kgd: ['kgd', 'kelapagading'],
        cdk: ['cdk', 'cilandak'],
        pkp: ['pkp', 'pondokkelapa'],
        cpy: ['cpy', 'cipayung']
      };

      const normalized = normalizeDateValue(targetDate);
      const end = new Date(`${normalized}T23:59:59`);
      if (Number.isNaN(end.getTime())) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      const startOfMonth = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0);
      const { data, error } = await dbClient.from('Data_Penjualan').select('*');
      if (error) throw error;

      const harian = { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 };
      const mtd = { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 };

      for (const row of data || []) {
        const rawDate = row.Tanggal || row.tanggal || row.Tgl || row.tgl;
        if (!rawDate) continue;

        const normalizedRowDate = normalizeDateValue(rawDate);
        const rowDate = normalizedRowDate ? new Date(`${normalizedRowDate}T00:00:00`) : null;
        if (!rowDate || Number.isNaN(rowDate.getTime())) continue;

        const rowCabang = normalizeBranchName(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || '');
        const matchesCabang = Object.keys(branchAliases).some((key) => {
          if (branchKey !== key) return false;
          return branchAliases[key].includes(rowCabang);
        });
        if (!matchesCabang) continue;

        const pos = Number(row.Sales_PosX ?? row.Sales_POSX ?? row.PosX ?? row.posX ?? 0) || 0;
        const grab = Number(row.Sales_Grabmart ?? row.Sales_Grab ?? row.Grabmart ?? row.grab ?? 0) || 0;
        const frekPos = Number(row.Freq_PosX ?? row.Freq_POSX ?? row.FreqPosX ?? row.freqPosX ?? 0) || 0;
        const frekGrab = Number(row.Freq_Grabmart ?? row.Freq_Grab ?? row.FreqGrabmart ?? row.freqGrab ?? 0) || 0;

        if (rowDate >= startOfMonth && rowDate <= end) {
          mtd.pos += pos;
          mtd.grab += grab;
          mtd.frekPos += frekPos;
          mtd.frekGrab += frekGrab;
        }

        if (rowDate.toDateString() === end.toDateString()) {
          harian.pos += pos;
          harian.grab += grab;
          harian.frekPos += frekPos;
          harian.frekGrab += frekGrab;
        }
      }

      return { harian, mtd };
    }

    async function getRpsSummaryByRange(startDate, endDate) {
      if (!dbClient) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      let start = String(startDate || '').trim();
      let end = String(endDate || '').trim();
      if (!end && start) end = start;
      if (!start && end) {
        const firstDay = new Date(`${end}T12:00:00`);
        start = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
      }
      if (!start || !end) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      const normalizedStart = normalizeDateValue(start);
      const normalizedEnd = normalizeDateValue(end);
      const startDateObj = new Date(`${normalizedStart}T00:00:00`);
      const endDateObj = new Date(`${normalizedEnd}T23:59:59`);
      if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) return { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      const rangeStart = startDateObj <= endDateObj ? startDateObj : endDateObj;
      const rangeEnd = startDateObj <= endDateObj ? endDateObj : startDateObj;
      const { data, error } = await dbClient.from('Data_Penjualan').select('*');
      if (error) throw error;

      const region = { harian: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 }, mtd: { pos: 0, frekPos: 0, frekGrab: 0, grab: 0 } };

      for (const row of data || []) {
        const rawDate = row.Tanggal || row.tanggal || row.Tgl || row.tgl;
        if (!rawDate) continue;

        const normalizedRowDate = normalizeDateValue(rawDate);
        const rowDate = normalizedRowDate ? new Date(`${normalizedRowDate}T00:00:00`) : null;
        if (!rowDate || Number.isNaN(rowDate.getTime())) continue;
        if (rowDate < rangeStart || rowDate > rangeEnd) continue;

        const pos = cleanNum(getRowValue(row, ['Sales_PosX', 'Sales_POSX', 'PosX', 'posX']));
        const frekPos = cleanNum(getRowValue(row, ['Freq_PosX', 'Freq_POSX', 'FreqPosX', 'freqPosX']));
        const grab = cleanNum(getRowValue(row, ['Sales_Grabmart', 'Sales_Grab', 'Grabmart', 'grab']));
        const frekGrab = cleanNum(getRowValue(row, ['Freq_Grabmart', 'Freq_Grab', 'FreqGrabmart', 'freqGrab']));

        region.mtd.pos += pos;
        region.mtd.frekPos += frekPos;
        region.mtd.grab += grab;
        region.mtd.frekGrab += frekGrab;

        if (rowDate.toDateString() === rangeEnd.toDateString()) {
          region.harian.pos += pos;
          region.harian.frekPos += frekPos;
          region.harian.grab += grab;
          region.harian.frekGrab += frekGrab;
        }
      }

      return region;
    }

    function updateStatusTombolRPS() {
      const btn = document.getElementById('btnRPS');
      if (!btn) return;

      const tglHariIni = new Date().toISOString().split('T')[0];
      const cabangWajib = ['kgd', 'cdk', 'pkp', 'cpy'];

      if (!dbClient) {
        btn.disabled = true;
        btn.classList.add('bg-gray-400', 'cursor-not-allowed');
        btn.classList.remove('bg-emerald-600', 'text-white');
        return;
      }

      dbClient.from('Data_Penjualan').select('Tanggal, ID_Cabang').then(({ data, error }) => {
        if (error) {
          btn.disabled = true;
          btn.classList.add('bg-gray-400', 'cursor-not-allowed');
          btn.classList.remove('bg-emerald-600', 'text-white');
          return;
        }

        const hadir = new Set();
        (data || []).forEach((row) => {
          const rawDate = row.Tanggal || row.tanggal || row.Tgl || row.tgl;
          const rowDate = String(rawDate || '').split('T')[0];
          if (!rowDate || rowDate !== tglHariIni) return;
          const cabang = String(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || '').trim().toLowerCase();
          if (cabang && cabangWajib.includes(cabang)) hadir.add(cabang);
        });

        const isLengkap = cabangWajib.every((cabang) => hadir.has(cabang));
        btn.disabled = !isLengkap;

        if (isLengkap) {
          btn.classList.remove('bg-gray-400', 'cursor-not-allowed');
          btn.classList.add('bg-emerald-600', 'text-white');
        } else {
          btn.classList.add('bg-gray-400', 'cursor-not-allowed');
          btn.classList.remove('bg-emerald-600', 'text-white');
        }
      });
    }

    function cekDanBukaModal(event, tanggal) {
      const btn = event && event.currentTarget ? event.currentTarget : document.getElementById('btnRPS');
      if (btn && btn.disabled) {
        Swal.fire({
          icon: 'info',
          title: 'Data Belum Lengkap',
          text: 'Pastikan cabang KGD, CDK, PKP, dan CPY sudah mengisi data untuk tanggal ini!'
        });
        return;
      }

      const targetDate = tanggal || new Date().toISOString().split('T')[0];
      return prosesLaporanRPS(targetDate, targetDate);
    }

    function bukaModalRPS(tanggalInput) {
      let tglStr = tanggalInput;
      if (!tglStr) {
        tglStr = new Date().toISOString().split('T')[0];
      } else {
        const dateObj = new Date(tanggalInput);
        if (!Number.isNaN(dateObj.getTime())) tglStr = dateObj.toISOString().split('T')[0];
      }

      const mulai = document.getElementById('tglMulai');
      const selesai = document.getElementById('tglSelesai');
      if (mulai) mulai.value = tglStr;
      if (selesai) selesai.value = tglStr;

      const modal = document.getElementById('modalRPS');
      if (modal) modal.classList.remove('hidden');
    }

    async function prosesLaporanRPS(startDateInput = null, endDateInput = null) {
      let filter = {
        start: startDateInput,
        end: endDateInput
      };

      const mulaiEl = document.getElementById('tglMulai');
      const selesaiEl = document.getElementById('tglSelesai');
      const modal = document.getElementById('modalRPS');

      if (mulaiEl && selesaiEl) {
        filter.start = mulaiEl.value || startDateInput;
        filter.end = selesaiEl.value || endDateInput;
      }

      if (!filter.start || !filter.end) {
        const endDate = filter.end || filter.start || new Date().toISOString().split('T')[0];
        const endObj = new Date(`${endDate}T12:00:00`);
        filter.start = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-01`;
        filter.end = endDate;
      }

      if (modal) {
        modal.classList.add('hidden');
      }

      Swal.fire({ title: 'Menyusun Laporan...', didOpen: () => Swal.showLoading() });

      try {
        const res = await getRpsSummaryByRange(filter.start, filter.end);
        Swal.close();

        const tglDisplay = formatTanggalTeks(filter.end);
        const pesan = `Alhamdulillah, Aamiin Ya Rabbal'alamiin\n\n` +
          `Total Penjualan Keseluruhan PT RPS\n\n` +
          `Total Penjualan Harian Keseluruhan Outlet PT RPS\n` +
          `Tanggal : ${tglDisplay}\n` +
          `Sales : Rp ${formatAngka(res.harian.pos)}\n` +
          `Frek : ${formatAngka(res.harian.frekPos || 0)}\n` +
          `GrabMart : Rp ${formatAngka(res.harian.grab)}\n` +
          `Frek GM : ${formatAngka(res.harian.frekGrab || 0)}\n\n\n` +
          `Periode: s/d ${tglDisplay}\n` +
          `Sales : Rp ${formatAngka(res.mtd.pos)}\n` +
          `Frek : ${formatAngka(res.mtd.frekPos || 0)}\n` +
          `GrabMart : Rp ${formatAngka(res.mtd.grab)}\n` +
          `Frek GM : ${formatAngka(res.mtd.frekGrab || 0)}`;

        triggerWhatsApp(pesan, 'Laporan Total RPS');
      } catch (error) {
        Swal.close();
        console.error('Gagal proses laporan RPS:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Data laporan RPS tidak bisa diproses.' });
      }
    }

    async function copyCabangForDate(cabangCode, dateInput) {
      const cabang = String(cabangCode || '').toUpperCase();
      const tanggal = normalizeDateValue(dateInput || new Date().toISOString().split('T')[0]) || dateInput || new Date().toISOString().split('T')[0];
      const namaCabang = {
        KGD: 'Kelapa Gading',
        CDK: 'Cilandak',
        PKP: 'Pondok Kelapa',
        CPY: 'Cipayung'
      }[cabang] || cabang || 'Cabang';

      Swal.fire({
        title: 'Sedang Menghitung...',
        html: `Mohon tunggu, sedang memproses data <b>${namaCabang.toUpperCase()}</b>`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const summary = await getCabangSummaryByDate(tanggal, cabang);
        const dStr = formatTanggalTeks(tanggal);

        Swal.close();
        const pesan = `Assalamualaikum Warahmatullahi Wabarakatuh\n\n` +
          `Laporan Penjualan Harian STS ${namaCabang}\n` +
          `Tanggal : ${dStr}\n` +
          `Sales : Rp ${formatAngka(summary.harian.pos)}\n` +
          `Frek POS : ${formatAngka(summary.harian.frekPos || 0)}\n` +
          `Grabmart : Rp ${formatAngka(summary.harian.grab)}\n` +
          `Frek GM : ${formatAngka(summary.harian.frekGrab || 0)}\n\n` +
          `s.d Tanggal : ${dStr}\n` +
          `Sales : Rp ${formatAngka(summary.mtd.pos)}\n` +
          `Frek POS : ${formatAngka(summary.mtd.frekPos || 0)}\n` +
          `Grabmart : Rp ${formatAngka(summary.mtd.grab)}\n` +
          `Frek GM : ${formatAngka(summary.mtd.frekGrab || 0)}`;

        triggerWhatsApp(pesan, `Laporan Cabang ${namaCabang}`);
      } catch (error) {
        Swal.close();
        console.error('Gagal copy cabang:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Data cabang tidak bisa diolah.' });
      }
    }

    async function copyCabang(jsonStr) {
      const raw = String(jsonStr || '').replace(/&quot;/g, '"');
      const r = JSON.parse(raw);
      const cabang = String(r.cabang || '').toUpperCase();
      const tanggal = r.tglStr || r.Tanggal || r.tanggal || new Date().toISOString().split('T')[0];
      await copyCabangForDate(cabang, tanggal);
    }

    async function copyTotalForDate(dateInput) {
      const rawDate = normalizeDateValue(dateInput || new Date().toISOString().split('T')[0]);
      const tglInput = rawDate || dateInput || new Date().toISOString().split('T')[0];
      const tglDisplay = formatTanggalTeks(tglInput);

      Swal.fire({ title: 'Menghitung...', didOpen: () => Swal.showLoading() });

      try {
        const res = await getRpsSummaryByDate(tglInput);
        Swal.close();
        const pesan = `Alhamdulillah, Aamiin Ya Rabbal'alamiin\n\n` +
          `Total Penjualan Keseluruhan PT RPS\n\n` +
          `Total Penjualan Harian Keseluruhan Outlet PT RPS\n` +
          `Tanggal : ${tglDisplay}\n` +
          `Sales : Rp ${formatAngka(res.harian.pos)}\n` +
          `Frek : ${formatAngka(res.harian.frekPos || 0)}\n` +
          `GrabMart : Rp ${formatAngka(res.harian.grab)}\n` +
          `Frek GM : ${formatAngka(res.harian.frekGrab || 0)}\n\n\n` +
          `Periode: s/d ${tglDisplay}\n` +
          `Sales : Rp ${formatAngka(res.mtd.pos)}\n` +
          `Frek : ${formatAngka(res.mtd.frekPos || 0)}\n` +
          `GrabMart : Rp ${formatAngka(res.mtd.grab)}\n` +
          `Frek GM : ${formatAngka(res.mtd.frekGrab || 0)}`;

        triggerWhatsApp(pesan, 'Laporan Total RPS');
      } catch (error) {
        Swal.close();
        console.error('Gagal copy total RPS:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Data total RPS tidak bisa diolah.' });
      }
    }

    async function copyTotal(btn) {
      const row = btn && btn.closest ? btn.closest('tr') : null;
      if (!row) return;

      const tglMentahInput = row.cells[0].innerText.trim().split(' ')[0];
      const rawDate = normalizeDateValue(tglMentahInput);
      const tglInput = rawDate || tglMentahInput;
      await copyTotalForDate(tglInput);
    }

    function triggerWhatsApp(pesan, judul) {
      const safeCopy = async () => {
        try {
          await navigator.clipboard.writeText(pesan);
        } catch (error) {
          const textarea = document.createElement('textarea');
          textarea.value = pesan;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      };

      safeCopy().finally(() => {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disalin!',
          text: judul + ' telah siap dikirim.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        });
      });
    }

    function buildSalesWaText(row, mode = 'cabang') {
      const tanggal = normalizeHistoryDate(row.Tanggal || row.tanggal || row.Tgl || row.tgl || '');
      const cabang = String(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || row.Unit || row.unit || 'ALL').toUpperCase();
      const posX = numberFromValue(row.Sales_PosX ?? row.Sales_POSX ?? row.PosX ?? row.posX ?? 0);
      const grab = numberFromValue(row.Sales_Grabmart ?? row.Sales_Grab ?? row.Grabmart ?? row.grab ?? 0);
      const freqPos = numberFromValue(row.Freq_PosX ?? row.Freq_POSX ?? row.FreqPosX ?? row.freqPosX ?? 0);
      const freqGrab = numberFromValue(row.Freq_Grabmart ?? row.Freq_Grab ?? row.FreqGrabmart ?? row.freqGrab ?? 0);
      const total = posX + grab;

      if (mode === 'total') {
        return [
          '_Alhamdulillah, Aamiin Ya Rabbal\'alamiin_',
          '',
          '*Total Penjualan Keseluruhan PT RPS*',
          '',
          '*Total Penjualan Harian Keseluruhan Outlet PT RPS*',
          `Tanggal : *${tanggal}*`,
          `Sales : *Rp ${formatRp(posX).replace('Rp ', '')}*`,
          `Frek : *${formatAngka(freqPos)}*`,
          `GrabMart : *Rp ${formatRp(grab).replace('Rp ', '')}*`,
          `Frek GM : *${formatAngka(freqGrab)}*`,
          '',
          `*Periode: s/d ${tanggal}*`,
          `Sales : *Rp ${formatRp(total).replace('Rp ', '')}*`,
          `Frek : *${formatAngka(freqPos + freqGrab)}*`,
          `GrabMart : *Rp ${formatRp(total).replace('Rp ', '')}*`,
          `Frek GM : *${formatAngka(freqPos + freqGrab)}*`
        ].join('\n');
      }

      return [
        'Assalamualaikum Warahmatullahi Wabarakatuh',
        '',
        `*Laporan Penjualan Harian STS ${cabang}*`,
        `Tanggal : *${tanggal}*`,
        `Sales : *Rp ${formatRp(posX).replace('Rp ', '')}*`,
        `Frek POS : *${formatAngka(freqPos)}*`,
        `Grabmart : *Rp ${formatRp(grab).replace('Rp ', '')}*`,
        `Frek GM : *${formatAngka(freqGrab)}*`,
        '',
        `*s.d Tanggal : ${tanggal}*`,
        `Sales : *Rp ${formatRp(total).replace('Rp ', '')}*`,
        `Frek POS : *${formatAngka(freqPos + freqGrab)}*`,
        `Grabmart : *Rp ${formatRp(total).replace('Rp ', '')}*`,
        `Frek GM : *${formatAngka(freqPos + freqGrab)}*`
      ].join('\n');
    }

    function buildOnlineWaText(row, mode = 'cabang') {
      const tanggal = normalizeHistoryDate(row.Tanggal || row.tanggal || row.Tgl || row.tgl || '');
      const cabang = String(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || row.Unit || row.unit || 'ONLINE').toUpperCase();
      const shopee = numberFromValue(row.Sales_Shopee ?? row.Shopee ?? row.sales_shopee ?? 0);
      const freqShopee = numberFromValue(row.Freq_Shopee ?? row.freq_shopee ?? 0);
      const tiktok = numberFromValue(row.Sales_Tiktok ?? row.Tiktok ?? row.sales_tiktok ?? 0);
      const freqTiktok = numberFromValue(row.Freq_Tiktok ?? row.freq_tiktok ?? 0);
      const web = numberFromValue(row.Sales_Web ?? row.Web ?? row.sales_web ?? 0);
      const freqWeb = numberFromValue(row.Freq_Web ?? row.freq_web ?? 0);
      const total = shopee + tiktok + web;
      const title = mode === 'total' ? `*TOTAL ONLINE - ${cabang}*` : `*ONLINE CABANG ${cabang}*`;

      return [
        title,
        `Tanggal: ${tanggal}`,
        `Shopee: ${formatRp(shopee)} | Frek: ${freqShopee}`,
        `Tiktok: ${formatRp(tiktok)} | Frek: ${freqTiktok}`,
        `Web: ${formatRp(web)} | Frek: ${freqWeb}`,
        `Total: ${formatRp(total)}`,
        '',
        'Terima kasih.'
      ].join('\n');
    }

    async function copyTextToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    async function handleCopyToWa(row, tableType, mode = 'cabang') {
      if (tableType === 'sales') {
        const rawDate = row.Tanggal || row.tanggal || row.Tgl || row.tgl || new Date().toISOString().split('T')[0];
        const normalizedDate = normalizeDateValue(rawDate) || rawDate;
        const cabangCode = String(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || '').toUpperCase();

        if (mode === 'cabang') {
          await copyCabangForDate(cabangCode, normalizedDate);
          return;
        }

        if (mode === 'total') {
          await copyTotalForDate(normalizedDate);
          return;
        }
      }

      const text = tableType === 'sales' ? buildSalesWaText(row, mode) : buildOnlineWaText(row, mode);
      const titleText = tableType === 'sales' ? 'Laporan Sales' : 'Laporan Online';

      try {
        await copyTextToClipboard(text);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disalin!',
          text: titleText + ' telah siap dikirim.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        });
      } catch (error) {
        console.error('Gagal copy to WA:', error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Teks tidak bisa disalin, silakan coba lagi.'
        });
      }
    }

    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy-wa]');
      if (!button) return;

      try {
        const tableType = button.dataset.copyWa;
        const mode = button.dataset.copyMode || 'cabang';
        const rowText = button.dataset.row;
        if (!rowText) return;

        const row = JSON.parse(decodeURIComponent(rowText));
        await handleCopyToWa(row, tableType, mode);
      } catch (error) {
        console.error('Gagal menangani tombol copy WA:', error);
      }
    });

    function normalizeHistoryDate(value) {
      if (!value) return '-';
      const raw = String(value).trim();
      const base = raw.split('T')[0].split(' ')[0];
      const cleaned = base.replace(/\//g, '-');
      const parts = cleaned.split('-');
      if (parts.length !== 3) return raw;

      let y = parts[0];
      let m = parts[1];
      let d = parts[2];

      if (d.length === 4) {
        y = parts[2];
        m = parts[1];
        d = parts[0];
      }

      const bulanMap = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
        '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
      };

      return `${String(d).padStart(2, '0')}-${bulanMap[String(m).padStart(2, '0')] || m}-${y}`;
    }

    function sanitizeNumericString(value) {
      if (value === null || value === undefined) return '';
      let str = String(value).trim();
      if (!str) return '';
      str = str.replace(/\s+/g, '');
      str = str.replace(/\./g, '');
      str = str.replace(/,/g, '');
      str = str.replace(/[^\d-]/g, '');
      if (str === '-' || str === '') return '';
      return str;
    }

    function numberFromValue(value, fallback = 0) {
      if (value === null || value === undefined || value === '') return fallback;
      const cleaned = sanitizeNumericString(value);
      if (!cleaned) return fallback;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : fallback;
    }

    function readNumericInput(id, fallback = 0) {
      const el = document.getElementById(id);
      if (!el) return fallback;
      const raw = sanitizeNumericString(el.value);
      if (!raw) return fallback;
      const value = Number(raw);
      return Number.isFinite(value) ? value : fallback;
    }

    function normalizeDateValue(value) {
      if (!value) return '';
      const raw = String(value).trim();
      if (!raw) return '';
      const iso = raw.includes('T') ? raw.split('T')[0] : raw;
      const slash = iso.includes('/') ? iso.split('/') : null;
      if (slash && slash.length === 3) {
        const [d, m, y] = slash;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const dashed = iso.replace(/\//g, '-');
      const parts = dashed.split('-');
      if (parts.length === 3) {
        const [a, b, c] = parts;
        if (a.length === 4) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
        if (c.length === 4) return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
      }
      return iso;
    }

    function normalizeCabangValue(value) {
      const raw = String(value ?? '').trim();
      if (!raw) return 'ALL';
      const upper = raw.toUpperCase();
      return upper.includes('ONLINE') ? 'ONLINE' : upper;
    }

    function formatInputNumber(value) {
      if (value === null || value === undefined || value === '') return '';
      const cleaned = sanitizeNumericString(value);
      if (!cleaned) return '';
      const num = Number(cleaned);
      if (!Number.isFinite(num)) return '';
      return num.toLocaleString('id-ID');
    }

    function applyThousandFormatInput(inputEl) {
      if (!inputEl) return;
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      const raw = sanitizeNumericString(inputEl.value);
      const formatted = raw ? Number(raw).toLocaleString('id-ID') : '';
      inputEl.value = formatted;
      const nextPos = Math.max(0, Math.min(start, formatted.length));
      inputEl.setSelectionRange(nextPos, nextPos);
      if (typeof inputEl.oninput === 'function') {
        inputEl.oninput = null;
      }
    }

    function bindThousandInput(selector) {
      const input = document.querySelector(selector);
      if (!input) return;
      input.addEventListener('input', (event) => {
        const raw = sanitizeNumericString(event.target.value);
        event.target.value = raw ? Number(raw).toLocaleString('id-ID') : '';
      });
    }

    function bindAllNumericInputs() {
      ['#posX', '#fPosX', '#grab', '#fGrab', '#shopee', '#fShopee', '#tiktok', '#fTiktok', '#web', '#fWeb'].forEach((selector) => {
        const input = document.querySelector(selector);
        if (!input) return;
        input.addEventListener('input', (event) => {
          const raw = sanitizeNumericString(event.target.value);
          event.target.value = raw ? Number(raw).toLocaleString('id-ID') : '';
        });
      });
    }

    function getSalesRowRef(row) {
      const id = row && (row.id ?? row.ID ?? row.Id ?? row.row_id ?? row.rowId);
      const date = row && (row.Tanggal ?? row.tanggal ?? row.Tgl ?? row.tgl ?? '');
      const branch = row && (row.ID_Cabang ?? row.id_cabang ?? row.Cabang ?? row.cabang ?? row.Unit ?? row.unit ?? 'ALL');
      return {
        id: id !== undefined && id !== null && id !== '' ? Number(id) : null,
        date: normalizeDateValue(date),
        branch: normalizeCabangValue(branch)
      };
    }

    function getOnlineRowRef(row) {
      const id = row && (row.id ?? row.ID ?? row.Id ?? row.row_id ?? row.rowId);
      const date = row && (row.Tanggal ?? row.tanggal ?? row.Tgl ?? row.tgl ?? '');
      const branch = row && (row.ID_Cabang ?? row.id_cabang ?? row.Cabang ?? row.cabang ?? row.Unit ?? row.unit ?? 'ONLINE');
      return {
        id: id !== undefined && id !== null && id !== '' ? Number(id) : null,
        date: normalizeDateValue(date),
        branch: normalizeCabangValue(branch)
      };
    }

    function setSalesFormForEdit(row) {
      const ref = getSalesRowRef(row);
      document.getElementById('inDate').value = ref.date || '';
      document.getElementById('posX').value = formatInputNumber(numberFromValue(row.Sales_PosX ?? row.Sales_POSX ?? row.PosX ?? row.posX ?? 0, 0));
      document.getElementById('fPosX').value = numberFromValue(row.Freq_PosX ?? row.Freq_POSX ?? row.FreqPosX ?? row.freqPosX ?? 0, 0);
      document.getElementById('grab').value = formatInputNumber(numberFromValue(row.Sales_Grabmart ?? row.Sales_Grab ?? row.Grabmart ?? row.grab ?? 0, 0));
      document.getElementById('fGrab').value = numberFromValue(row.Freq_Grabmart ?? row.Freq_Grab ?? row.FreqGrabmart ?? row.freqGrab ?? 0, 0);
      document.getElementById('editId').value = ref.id ?? '';
      document.getElementById('editBranch').value = ref.branch || 'ALL';
      document.getElementById('btnS').textContent = 'Update Sales';
      document.getElementById('btnCancel').classList.remove('hidden');
      document.getElementById('formTitle').textContent = 'EDIT SALES';
      document.getElementById('inDate').focus();
    }

    function setOnlineFormForEdit(row) {
      const ref = getOnlineRowRef(row);
      document.getElementById('inDateOnline').value = ref.date || '';
      document.getElementById('shopee').value = formatInputNumber(numberFromValue(row.Sales_Shopee ?? row.Shopee ?? row.sales_shopee ?? 0, 0));
      document.getElementById('fShopee').value = numberFromValue(row.Freq_Shopee ?? row.freq_shopee ?? 0, 0);
      document.getElementById('tiktok').value = formatInputNumber(numberFromValue(row.Sales_Tiktok ?? row.Tiktok ?? row.sales_tiktok ?? 0, 0));
      document.getElementById('fTiktok').value = numberFromValue(row.Freq_Tiktok ?? row.freq_tiktok ?? 0, 0);
      document.getElementById('web').value = formatInputNumber(numberFromValue(row.Sales_Web ?? row.Web ?? row.sales_web ?? 0, 0));
      document.getElementById('fWeb').value = numberFromValue(row.Freq_Web ?? row.freq_web ?? 0, 0);
      document.getElementById('editIdOnline').value = ref.id ?? '';
      document.getElementById('editOnlineKey').value = `${ref.date}|${ref.branch}`;
      document.getElementById('editOnlineBranch').value = ref.branch || 'ONLINE';
      document.getElementById('btnO').textContent = 'Update Online';
      document.getElementById('btnCancelOnline').classList.remove('hidden');
      document.getElementById('formTitleOnline').textContent = 'EDIT ONLINE';
      document.getElementById('inDateOnline').focus();
    }

    function cancelEdit() {
      document.getElementById('editId').value = '';
      document.getElementById('editBranch').value = '';
      document.getElementById('inDate').value = '';
      document.getElementById('posX').value = '';
      document.getElementById('fPosX').value = '';
      document.getElementById('grab').value = '';
      document.getElementById('fGrab').value = '';
      document.getElementById('btnS').textContent = 'Simpan Sales';
      document.getElementById('btnCancel').classList.add('hidden');
      document.getElementById('formTitle').textContent = 'INPUT SALES';
    }

    function cancelEditOnline() {
      document.getElementById('editIdOnline').value = '';
      document.getElementById('editOnlineKey').value = '';
      document.getElementById('editOnlineBranch').value = '';
      document.getElementById('inDateOnline').value = '';
      document.getElementById('shopee').value = '';
      document.getElementById('fShopee').value = '';
      document.getElementById('tiktok').value = '';
      document.getElementById('fTiktok').value = '';
      document.getElementById('web').value = '';
      document.getElementById('fWeb').value = '';
      document.getElementById('btnO').textContent = 'Simpan Online';
      document.getElementById('btnCancelOnline').classList.add('hidden');
      document.getElementById('formTitleOnline').textContent = 'INPUT ONLINE';
    }

    async function save() {
      if (!dbClient) return;

      const dateValue = normalizeDateValue(document.getElementById('inDate').value);
      const posValue = readNumericInput('posX', 0);
      const freqPosValue = readNumericInput('fPosX', 0);
      const grabValue = readNumericInput('grab', 0);
      const freqGrabValue = readNumericInput('fGrab', 0);
      const editId = document.getElementById('editId').value;
      const branchValue = normalizeCabangValue(document.getElementById('editBranch').value || session?.ID_Cabang || session?.branchId || session?.Cabang || 'ALL');

      if (!dateValue) {
        Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'Tanggal wajib diisi.' });
        return;
      }

      if (posValue === 0) {
        Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'PosX wajib diisi.' });
        return;
      }

      if (freqPosValue === 0) {
        Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'Frek PosX wajib diisi.' });
        return;
      }

      const payload = {
        Tanggal: dateValue,
        ID_Cabang: branchValue,
        Sales_PosX: posValue,
        Freq_PosX: freqPosValue,
        Sales_Grabmart: grabValue,
        Freq_Grabmart: freqGrabValue
      };

      try {
        let duplicateQuery = dbClient.from('Data_Penjualan').select('id, Tanggal, ID_Cabang').eq('Tanggal', dateValue).eq('ID_Cabang', branchValue);
        if (editId) duplicateQuery = duplicateQuery.neq('id', Number(editId));

        const { data: duplicateRows, error: duplicateError } = await duplicateQuery;
        if (duplicateError) throw duplicateError;

        if (duplicateRows && duplicateRows.length > 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Data sudah tersimpan',
            text: 'Tanggal dan cabang ini sudah ada di Data_Penjualan. Silakan hapus data lama lalu input kembali.'
          });
          return;
        }

        if (editId) {
          const { error } = await dbClient.from('Data_Penjualan').update(payload).eq('id', Number(editId));
          if (error) throw error;
        } else {
          const { error } = await dbClient.from('Data_Penjualan').insert([payload]);
          if (error) throw error;
        }

        cancelEdit();
        await loadSalesHistory();
        Swal.fire({ icon: 'success', title: 'Berhasil', text: editId ? 'Data sales berhasil diperbarui.' : 'Data sales berhasil ditambah.' });
      } catch (error) {
        console.error('Gagal simpan sales:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Proses simpan sales gagal.' });
      }
    }

    async function saveOnline() {
      if (!dbClient) return;

      const dateValue = normalizeDateValue(document.getElementById('inDateOnline').value);
      const shopeeValue = readNumericInput('shopee', 0);
      const freqShopeeValue = readNumericInput('fShopee', 0);
      const tiktokValue = readNumericInput('tiktok', 0);
      const freqTiktokValue = readNumericInput('fTiktok', 0);
      const webValue = readNumericInput('web', 0);
      const freqWebValue = readNumericInput('fWeb', 0);
      const editId = document.getElementById('editIdOnline').value;
      const branchValue = normalizeCabangValue(document.getElementById('editOnlineBranch').value || session?.ID_Cabang || session?.branchId || session?.Cabang || 'ONLINE');

      if (!dateValue) {
        Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'Tanggal wajib diisi.' });
        return;
      }

      const payload = {
        Tanggal: dateValue,
        ID_Cabang: branchValue,
        Sales_Shopee: shopeeValue,
        Freq_Shopee: freqShopeeValue,
        Sales_Tiktok: tiktokValue,
        Freq_Tiktok: freqTiktokValue,
        Sales_Web: webValue,
        Freq_Web: freqWebValue
      };

      try {
        if (editId) {
          const { error } = await dbClient.from('Data_Online').update(payload).eq('id', Number(editId));
          if (error) throw error;
        } else {
          const { error } = await dbClient.from('Data_Online').insert([payload]);
          if (error) throw error;
        }

        cancelEditOnline();
        await loadOnlineHistory();
        Swal.fire({ icon: 'success', title: 'Berhasil', text: editId ? 'Data online berhasil diperbarui.' : 'Data online berhasil ditambah.' });
      } catch (error) {
        console.error('Gagal simpan online:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Proses simpan online gagal.' });
      }
    }

    async function editSalesRow(rowId, rowDate, rowBranch) {
      try {
        let row = null;
        const idValue = rowId !== null && rowId !== undefined && rowId !== '' && rowId !== 'null' ? Number(rowId) : null;
        if (idValue) {
          const { data, error } = await dbClient.from('Data_Penjualan').select('*').eq('id', idValue).limit(1);
          if (!error && data && data.length) row = data[0];
        }

        if (!row && rowDate) {
          const { data, error } = await dbClient.from('Data_Penjualan').select('*').eq('Tanggal', normalizeDateValue(rowDate)).eq('ID_Cabang', normalizeCabangValue(rowBranch || 'ALL')).limit(1);
          if (!error && data && data.length) row = data[0];
        }

        if (!row) {
          Swal.fire({ icon: 'error', title: 'Data tidak ditemukan', text: 'Row yang ingin di-edit tidak ditemukan di database.' });
          return;
        }

        setSalesFormForEdit(row);
      } catch (error) {
        console.error('Gagal edit sales:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak bisa membuka form edit sales.' });
      }
    }

    async function deleteSalesRow(rowId, rowDate, rowBranch) {
      const targetId = rowId !== null && rowId !== undefined && rowId !== '' && rowId !== 'null' ? Number(rowId) : null;
      const confirmed = await Swal.fire({
        title: 'Yakin hapus data ini?',
        text: 'Data yang dihapus tidak bisa dikembalikan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
      });

      if (!confirmed.isConfirmed) return;

      try {
        let idValue = targetId;
        if (!idValue && rowDate) {
          const rowToDelete = await dbClient.from('Data_Penjualan').select('id').eq('Tanggal', normalizeDateValue(rowDate)).eq('ID_Cabang', normalizeCabangValue(rowBranch || 'ALL')).limit(1);
          if (rowToDelete.data && rowToDelete.data.length) {
            idValue = rowToDelete.data[0].id;
          }
        }

        if (!idValue) {
          Swal.fire({ icon: 'warning', title: 'Tidak ada target', text: 'Data yang akan dihapus tidak ditemukan.' });
          return;
        }

        const { error } = await dbClient.from('Data_Penjualan').delete().eq('id', idValue);
        if (error) throw error;
        await loadSalesHistory();
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data sales berhasil dihapus.' });
      } catch (error) {
        console.error('Gagal hapus sales:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Data sales gagal dihapus.' });
      }
    }

    async function editOnlineRow(rowId, rowDate, rowBranch) {
      try {
        let row = null;
        const idValue = rowId !== null && rowId !== undefined && rowId !== '' && rowId !== 'null' ? Number(rowId) : null;
        if (idValue) {
          const { data, error } = await dbClient.from('Data_Online').select('*').eq('id', idValue).limit(1);
          if (!error && data && data.length) row = data[0];
        }

        if (!row && rowDate) {
          const { data, error } = await dbClient.from('Data_Online').select('*').eq('Tanggal', normalizeDateValue(rowDate)).eq('ID_Cabang', normalizeCabangValue(rowBranch || 'ONLINE')).limit(1);
          if (!error && data && data.length) row = data[0];
        }

        if (!row) {
          Swal.fire({ icon: 'error', title: 'Data tidak ditemukan', text: 'Row online yang ingin di-edit tidak ditemukan di database.' });
          return;
        }

        setOnlineFormForEdit(row);
      } catch (error) {
        console.error('Gagal edit online:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak bisa membuka form edit online.' });
      }
    }

    async function deleteOnlineRow(rowId, rowDate, rowBranch) {
      const targetId = rowId !== null && rowId !== undefined && rowId !== '' && rowId !== 'null' ? Number(rowId) : null;
      const confirmed = await Swal.fire({
        title: 'Yakin hapus data ini?',
        text: 'Data yang dihapus tidak bisa dikembalikan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
      });

      if (!confirmed.isConfirmed) return;

      try {
        let idValue = targetId;
        if (!idValue && rowDate) {
          const rowToDelete = await dbClient.from('Data_Online').select('id').eq('Tanggal', normalizeDateValue(rowDate)).eq('ID_Cabang', normalizeCabangValue(rowBranch || 'ONLINE')).limit(1);
          if (rowToDelete.data && rowToDelete.data.length) {
            idValue = rowToDelete.data[0].id;
          }
        }

        if (!idValue) {
          Swal.fire({ icon: 'warning', title: 'Tidak ada target', text: 'Data yang akan dihapus tidak ditemukan.' });
          return;
        }

        const { error } = await dbClient.from('Data_Online').delete().eq('id', idValue);
        if (error) throw error;
        await loadOnlineHistory();
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data online berhasil dihapus.' });
      } catch (error) {
        console.error('Gagal hapus online:', error);
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Data online gagal dihapus.' });
      }
    }

    async function loadSalesHistory() {
      const table = document.getElementById('hTable');
      if (!table || !dbClient) return;

      try {
        const { data, error } = await dbClient
          .from('Data_Penjualan')
          .select('*')
          .order('Tanggal', { ascending: false })
          .limit(75);

        if (error) throw error;

        if (!data || !data.length) {
          table.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada data sales.</td></tr>';
          return;
        }

        table.innerHTML = data.map((row) => {
          const tanggal = normalizeHistoryDate(row.Tanggal || row.tanggal || row.Tgl || row.tgl || '');
          const cabang = String(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || 'ALL').toUpperCase();
          const posX = numberFromValue(row.Sales_PosX ?? row.Sales_POSX ?? row.PosX ?? row.posX ?? 0);
          const grab = numberFromValue(row.Sales_Grabmart ?? row.Sales_Grab ?? row.Grabmart ?? row.grab ?? 0);
          const freqPos = numberFromValue(row.Freq_PosX ?? row.Freq_POSX ?? row.FreqPosX ?? row.freqPosX ?? 0);
          const freqGrab = numberFromValue(row.Freq_Grabmart ?? row.Freq_Grab ?? row.FreqGrabmart ?? row.freqGrab ?? 0);
          const total = posX + grab;
          const totalFreq = freqPos + freqGrab;

          const salesId = row.id ?? row.ID ?? row.Id ?? row.row_id ?? row.rowId ?? null;
          const salesDate = normalizeDateValue(row.Tanggal || row.tanggal || row.Tgl || row.tgl || '');
          const salesBranch = normalizeCabangValue(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || row.Unit || row.unit || 'ALL');

          return `
            <tr class="border-b border-[#343b47] hover:bg-white/5 align-middle">
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-gray-200">${tanggal}</div>
                  <div class="mt-0.5 text-[8px] uppercase tracking-wide text-gray-400">${cabang}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-cyan-300">${formatRp(posX)}</div>
                  <div class="mt-0.5 text-[8px] text-cyan-200/80">F: ${freqPos}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-green-300">${formatRp(grab)}</div>
                  <div class="mt-0.5 text-[8px] text-green-200/80">F: ${freqGrab}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle text-right">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-black text-white">${formatRp(total)}</div>
                  <div class="mt-0.5 text-[8px] text-gray-400">TF: ${totalFreq}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="flex items-center justify-center gap-1">
                  <button type="button" data-copy-wa="sales" data-copy-mode="cabang" data-row="${encodeURIComponent(JSON.stringify(row))}" class="px-1.5 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[8px] font-black uppercase leading-none">Cabang</button>
                  <button type="button" data-copy-wa="sales" data-copy-mode="total" data-row="${encodeURIComponent(JSON.stringify(row))}" class="px-1.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[8px] font-black uppercase leading-none">RPS</button>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <button type="button" onclick="editSalesRow(${salesId ?? 'null'}, '${salesDate}', '${salesBranch}')" class="px-1.5 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[8px] font-black uppercase leading-none">Edit</button>
                  <button type="button" onclick="deleteSalesRow(${salesId ?? 'null'}, '${salesDate}', '${salesBranch}')" class="px-1.5 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30 text-[8px] font-black uppercase leading-none">Hapus</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      } catch (error) {
        console.error('Gagal memuat history Data_Penjualan:', error);
        table.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-300">Gagal memuat history sales.</td></tr>';
      }
    }

    async function loadOnlineHistory() {
      const table = document.getElementById('hTableOnline');
      if (!table || !dbClient) return;

      const candidates = ['Data_Online', 'Data_Onlie'];
      let rows = [];

      for (const tableName of candidates) {
        try {
          const { data, error } = await dbClient.from(tableName).select('*').order('Tanggal', { ascending: false }).limit(75);
          if (!error && Array.isArray(data) && data.length) {
            rows = data;
            break;
          }
        } catch (err) {
          console.warn('Cek table online gagal:', tableName, err);
        }
      }

      try {
        if (!rows.length) {
          table.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada data online.</td></tr>';
          return;
        }

        table.innerHTML = rows.map((row) => {
          const tanggal = normalizeHistoryDate(row.Tanggal || row.tanggal || row.Tgl || row.tgl || '');
          const cabang = String(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || 'ONLINE').toUpperCase();
          const shopee = numberFromValue(row.Sales_Shopee ?? row.Shopee ?? row.sales_shopee ?? 0);
          const freqShopee = numberFromValue(row.Freq_Shopee ?? row.freq_shopee ?? 0);
          const tiktok = numberFromValue(row.Sales_Tiktok ?? row.Tiktok ?? row.sales_tiktok ?? 0);
          const freqTiktok = numberFromValue(row.Freq_Tiktok ?? row.freq_tiktok ?? 0);
          const web = numberFromValue(row.Sales_Web ?? row.Web ?? row.sales_web ?? 0);
          const freqWeb = numberFromValue(row.Freq_Web ?? row.freq_web ?? 0);
          const total = shopee + tiktok + web;
          const totalFreq = freqShopee + freqTiktok + freqWeb;
          const onlineId = row.id ?? row.ID ?? row.Id ?? row.row_id ?? row.rowId ?? null;
          const onlineDate = normalizeDateValue(row.Tanggal || row.tanggal || row.Tgl || row.tgl || '');
          const onlineBranch = normalizeCabangValue(row.ID_Cabang || row.id_cabang || row.Cabang || row.cabang || row.Unit || row.unit || 'ONLINE');

          return `
            <tr class="border-b border-[#343b47] hover:bg-white/5 align-middle">
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-gray-200">${tanggal}</div>
                  <div class="mt-0.5 text-[8px] uppercase tracking-wide text-gray-400">${cabang}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-orange-300">${formatRp(shopee)}</div>
                  <div class="mt-0.5 text-[8px] text-orange-200/80">F: ${freqShopee}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-pink-300">${formatRp(tiktok)}</div>
                  <div class="mt-0.5 text-[8px] text-pink-200/80">F: ${freqTiktok}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-bold text-blue-300">${formatRp(web)}</div>
                  <div class="mt-0.5 text-[8px] text-blue-200/80">F: ${freqWeb}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle text-right">
                <div class="leading-[1.15]">
                  <div class="text-[10px] font-black text-white">${formatRp(total)}</div>
                  <div class="mt-0.5 text-[8px] text-gray-400">F: ${totalFreq}</div>
                </div>
              </td>
              <td class="p-1.5 align-middle">
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <button type="button" onclick="editOnlineRow(${onlineId ?? 'null'}, '${onlineDate}', '${onlineBranch}')" class="px-1.5 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[8px] font-black uppercase leading-none">Edit</button>
                  <button type="button" onclick="deleteOnlineRow(${onlineId ?? 'null'}, '${onlineDate}', '${onlineBranch}')" class="px-1.5 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30 text-[8px] font-black uppercase leading-none">Hapus</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      } catch (error) {
        console.error('Gagal memuat history Data_Online:', error);
        table.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-300">Gagal memuat history online.</td></tr>';
      }
    }

    async function getDashboardData(userRole, branchId, filterBranch = null, filterYear = null) {
  try {
    console.log("Memuat seluruh data dashboard dari Supabase (Bypass Limit 1000 & Strict Match)...");

    let allSalesRows = [];
    let pageSize = 1000;
    let page = 0;
    let fetchMore = true;

    while (fetchMore) {
      let start = page * pageSize;
      let end = start + pageSize - 1;
      
      let { data, error } = await dbClient
        .from('Data_Penjualan')
        .select('*')
        .order('Tanggal', { ascending: false })
        .range(start, end);

      if (error) {
        console.error("Gagal mengambil batch Data_Penjualan:", error);
        break;
      }

      if (data && data.length > 0) {
        allSalesRows = allSalesRows.concat(data);
        if (data.length < pageSize) {
          fetchMore = false;
        } else {
          page++;
        }
      } else {
        fetchMore = false;
      }
    }

    // Ambil data referensi cabang dari tabel Ref_Cabang
    let cabangRes = await dbClient.from('Ref_Cabang').select('*');
    let cabangRows = cabangRes.data || [];

    let targetsM = {};
    let targetsY = {};
    let currentRealYear = new Date().getFullYear();
    let currYear = filterYear ? parseInt(filterYear) : currentRealYear;
    
    let monthsElapsed = (currYear === currentRealYear) ? (new Date().getMonth() + 1) : 12;

    cabangRows.forEach(r => {
      if (r.ID_Cabang) {
        let b = r.ID_Cabang.toString().toLowerCase().trim();
        let tBulanan = Number(r.Target_Bulanan) || Number(r.target_bulanan) || 0;
        targetsM[b] = tBulanan;
        targetsY[b] = tBulanan * monthsElapsed;
      }
    });

    const activeFilterBranch = (filterBranch && filterBranch !== 'all' && filterBranch !== '') ? filterBranch.toLowerCase().trim() : 'all';
    const branches = ['kgd', 'cdk', 'pkp', 'cpy'];

    let matrixSales = { pos: {}, grab: {} };
    let matrixFreq = { pos: {}, grab: {} };

    branches.forEach(b => {
      matrixSales.pos[b] = new Array(12).fill(0);
      matrixSales.grab[b] = new Array(12).fill(0);
      matrixFreq.pos[b] = new Array(12).fill(0);
      matrixFreq.grab[b] = new Array(12).fill(0);
    });

    let last7Days = [];
    let now = new Date();
    for (let i = 6; i >= 0; i--) {
      let d = new Date(now);
      d.setDate(now.getDate() - i);
      let yyyy = d.getFullYear();
      let mm = String(d.getMonth() + 1).padStart(2, '0');
      let dd = String(d.getDate()).padStart(2, '0');
      last7Days.push({ dateStr: `${yyyy}-${mm}-${dd}`, label: `${dd}/${mm}`, pos: 0, grab: 0 });
    }

    const createDataObj = () => ({ pos: 0, grab: 0 });
    let monY = { kgd: createDataObj(), cdk: createDataObj(), pkp: createDataObj(), cpy: createDataObj(), total: createDataObj() };
    let monM = { kgd: createDataObj(), cdk: createDataObj(), pkp: createDataObj(), cpy: createDataObj(), total: createDataObj() };
    let monYearTotal = { kgd: createDataObj(), cdk: createDataObj(), pkp: createDataObj(), cpy: createDataObj(), total: createDataObj() };
    let contribPos = { kgd: 0, cdk: 0, pkp: 0, cpy: 0 }, contribGrab = { kgd: 0, cdk: 0, pkp: 0, cpy: 0 };
    
    let totalPos = 0, totalGrab = 0, totalFreqP = 0, totalFreqG = 0, validEntries = [];

    let yesterdayObj = new Date(now);
    yesterdayObj.setDate(now.getDate() - 1);
    let targetYesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`;
    let activeMonthIdx = yesterdayObj.getMonth(); 

    let ytdStartDate = `${currYear}-01-01`;
    let ytdEndDate = (currYear === currentRealYear) ? targetYesterdayStr : `${currYear}-12-31`;

    let cardCollected = { kgd: false, cdk: false, pkp: false, cpy: false };

    allSalesRows.forEach((row, index) => {
      if (!row.Tanggal || !row.ID_Cabang) return;

      // PARSING TANGGAL YANG AMAN & ROBUST (Menangani format T, spasi, atau garis miring /)
      let rawTanggal = row.Tanggal ? row.Tanggal.toString().trim() : '';
      let rawTglStr = rawTanggal.split('T')[0].split(' ')[0].replace(/\//g, '-');
      let dateParts = rawTglStr.split('-');
      if (dateParts.length < 3) return;

      let rYear = Number(dateParts[0]);
      let rMonthIdx = Number(dateParts[1]) - 1;
      let rDateStr = rawTglStr;

      let rawBranch = row.ID_Cabang.toString().toLowerCase().trim();
      let branch = branches.includes(rawBranch) ? rawBranch : null;
      if (!branch) {
        if (rawBranch.includes('kgd')) branch = 'kgd';
        else if (rawBranch.includes('cdk')) branch = 'cdk';
        else if (rawBranch.includes('pkp')) branch = 'pkp';
        else if (rawBranch.includes('cpy')) branch = 'cpy';
      }
      if (!branch) return;

      let vP = Number(row.Sales_PosX) || 0;
      let fP = Number(row.Freq_PosX) || 0;
      let vG = Number(row.Sales_Grabmart) || 0;
      let fG = Number(row.Freq_Grabmart) || 0;

      // Tangkap data untuk 5 card kemarin (Target Yesterday)
      if (rDateStr === targetYesterdayStr && !cardCollected[branch]) {
        monY[branch].pos = vP;
        monY[branch].grab = vG;
        cardCollected[branch] = true;
      }

      if (rYear === currYear) {
        if (activeFilterBranch === 'all' || branch === activeFilterBranch) {
          matrixSales.pos[branch][rMonthIdx] += vP;
          matrixSales.grab[branch][rMonthIdx] += vG;
          matrixFreq.pos[branch][rMonthIdx] += fP;
          matrixFreq.grab[branch][rMonthIdx] += fG;

          monYearTotal[branch].pos += vP;
          monYearTotal[branch].grab += vG;
        }

        if (rDateStr >= ytdStartDate && rDateStr <= ytdEndDate) {
          if (activeFilterBranch === 'all' || branch === activeFilterBranch) {
            totalPos += vP;
            totalGrab += vG;
            totalFreqP += fP;
            totalFreqG += fG;
          }
        }
      }

      if (rYear === currentRealYear && rMonthIdx === activeMonthIdx) {
        if (activeFilterBranch === 'all' || branch === activeFilterBranch) {
          monM[branch].pos += vP;
          monM[branch].grab += vG;
          monM.total.pos += vP;
          monM.total.grab += vG;
          if (contribPos.hasOwnProperty(branch)) {
            contribPos[branch] += vP;
            contribGrab[branch] += vG;
          }
        }
      }

      last7Days.forEach(day => {
        if (rDateStr === day.dateStr) {
          if (activeFilterBranch === 'all' || branch === activeFilterBranch) {
            day.pos += vP;
            day.grab += vG;
          }
        }
      });

      if (rYear === currYear) {
        validEntries.push({
          id: row.id || (index + 2),
          tgl: new Date(rYear, rMonthIdx, Number(dateParts[2])),
          cabang: branch.toUpperCase(),
          pVal: vP,
          gVal: vG,
          fP: fP,
          fG: fG,
          isoDate: rDateStr
        });
      }
    });

    // Hitung total keseluruhan untuk 5 card kemarin secara aman (jika kosong tetap tampil 0)
    monY.total.pos = monY.kgd.pos + monY.cdk.pos + monY.pkp.pos + monY.cpy.pos;
    monY.total.grab = monY.kgd.grab + monY.cdk.grab + monY.pkp.grab + monY.cpy.grab;

    return {
      status: "success",
      totalPos,
      totalGrab,
      totalFreqP,
      totalFreqG,
      totalFreq: (totalFreqP + totalFreqG),
      monY,
      monM,
      monYearTotal,
      targetsM,
      targetsY,
      contribPos,
      contribGrab,
      matrixSales,
      matrixFreq,
      lineLabels: last7Days.map(d => d.label),
      linePos: last7Days.map(d => d.pos),
      lineGrab: last7Days.map(d => d.grab)
    };
  } catch (e) {
    console.error("Error getDashboardData:", e);
    return { status: "error", message: e.toString() };
  }
}

async function updateUI() { 
  const branchFilterEl = document.getElementById('branchFilter');
  const matrixYearEl = document.getElementById('matrixYear');

  const f = branchFilterEl ? branchFilterEl.value : 'all';
  const y = matrixYearEl ? matrixYearEl.value : new Date().getFullYear(); 

  if (matrixYearEl && matrixYearEl.options.length === 0) {
    const currentY = new Date().getFullYear();
    for (let yr = currentY; yr >= currentY - 4; yr--) {
      let opt = document.createElement('option');
      opt.value = yr;
      opt.innerText = yr;
      if (yr == y) opt.selected = true;
      matrixYearEl.appendChild(opt);
    }
  }

  let role = (typeof session !== 'undefined' && session && session.role) ? session.role : 'OWNER';
  let bId = (typeof session !== 'undefined' && session && session.branchId) ? session.branchId : 'all';

  let data = await getDashboardData(role, bId, f, y);

  if (!data || data.status === "error") {
    console.error("Gagal memuat UI dashboard:", data?.message);
    return; 
  }

  currentData = data; 

  const vPosEl = document.getElementById('vPos');
  if (vPosEl) {
    vPosEl.innerText = "Rp " + fmt(data.totalPos); 
    document.getElementById('vGrab').innerText = "Rp " + fmt(data.totalGrab); 
    document.getElementById('vFreq').innerText = fmt(data.totalFreq); 
    document.getElementById('vFreqP').innerText = fmt(data.totalFreqP); 
    document.getElementById('vFreqG').innerText = fmt(data.totalFreqG); 
    
    let totAll = data.totalPos + data.totalGrab || 1; 
    const barPos = document.getElementById('barPos');
    const barGrab = document.getElementById('barGrab');
    if (barPos) barPos.style.width = (data.totalPos / totAll * 100) + "%"; 
    if (barGrab) barGrab.style.width = (data.totalGrab / totAll * 100) + "%"; 

    if (document.getElementById('rowY')) {
      const brs = ['kgd', 'cdk', 'pkp', 'cpy'], cls = ['border-cyan-500', 'border-purple-500', 'border-orange-500', 'border-pink-500']; 
      
      const buildCards = (source, label) => [...brs, 'total'].map((b, i) => { 
        let cardBrd = i < 4 ? cls[i] : 'border-white'; 
        let posVal = source[b] ? source[b].pos : 0;
        let grabVal = source[b] ? source[b].grab : 0;
        return `<div class="card-mon ${cardBrd} glass p-4 bg-[#21252d]"><p class="label-mini mb-3">${b.toUpperCase()} ${label}</p><div class="flex justify-between items-center mb-2"><span class="text-[8px] text-cyan-400 font-black">PosX</span><span class="val-mini text-white font-bold text-[11px]">Rp ${fmt(posVal)}</span></div><div class="flex justify-between items-center"><span class="text-[8px] text-green-400 font-black">Grab</span><span class="val-mini text-white font-bold text-[11px]">Rp ${fmt(grabVal)}</span></div></div>`; 
      }).join('');
      
      document.getElementById('rowY').innerHTML = buildCards(data.monY, 'KEMARIN'); 

      // Render Bar Target Bulanan & Tahunan Berdasarkan Ref_Cabang Supabase
      const buildTargetsWithRPS = (targetSource, currentSource, listId) => { 
        let totalGoal = 0, totalCurr = 0; 
        let h = ""; 
        brs.forEach((b, i) => { 
          let curr = currentSource[b] ? currentSource[b].pos : 0; 
          let goal = targetSource[b] || 0; 
          totalGoal += goal; 
          totalCurr += curr; 
          let prg = goal > 0 ? ((curr / goal) * 100).toFixed(1) : 0; 
          const bgCls = ['bg-cyan-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
          h += `<div><div class="flex justify-between text-[9px] font-bold mb-1"><span class="text-gray-400 uppercase">${b}</span><span class="${prg >= 100 ? 'text-green-400' : 'text-cyan-400'}">${prg}%</span></div><div class="progress-bar"><div class="progress-fill ${bgCls[i]}" style="width: ${Math.min(prg, 100)}%"></div></div></div>`; 
        }); 
        let rpsPrg = totalGoal > 0 ? ((totalCurr / totalGoal) * 100).toFixed(1) : 0; 
        let rpsHtml = `<div class="mb-4 bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner"><div class="flex justify-between text-[10px] font-black mb-1"><span class="text-yellow-400 tracking-wider">RPS PERFORMANCE</span><span class="text-yellow-400">${rpsPrg}%</span></div><div class="progress-bar !h-2.5 !bg-black/40"><div class="progress-fill bg-gradient-to-r from-yellow-600 to-yellow-400" style="width: ${Math.min(rpsPrg, 100)}%"></div></div></div>`; 
        const targetEl = document.getElementById(listId);
        if (targetEl) targetEl.innerHTML = rpsHtml + h; 
      }; 

      buildTargetsWithRPS(data.targetsM, data.monM, 'targetListM'); 
      buildTargetsWithRPS(data.targetsY, data.monYearTotal, 'targetListY');
    }
  }

  // Render Matriks & Chart Dashboard Saja
  renderActiveMatrix();

  if (typeof renderCharts === "function") renderCharts(data); 
}

function renderActiveMatrix() { 
  if (!currentData) return;
  let currentMode = window.matrixMode || 'pos';
  const brs = ['kgd', 'cdk', 'pkp', 'cpy'];

  const renderMatrixTable = (matrixObj, tbodyId) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    let html = '';
    let monthlyTotals = new Array(12).fill(0);
    let grandTotal = 0;

    brs.forEach(b => {
      let rowVals = matrixObj && matrixObj[b] ? matrixObj[b] : Array(12).fill(0);
      let rowTotal = rowVals.reduce((a, c) => a + c, 0);
      
      rowVals.forEach((val, idx) => { monthlyTotals[idx] += val; });
      grandTotal += rowTotal;

      html += `<tr class="border-b border-white/5 hover:bg-white/5"><td class="unit-cell font-bold uppercase">${b}</td>`;
      rowVals.forEach(val => { html += `<td class="text-center font-mono">${val === 0 ? '-' : fmt(val)}</td>`; });
      html += `<td class="total-col font-black text-cyan-400 text-right">${fmt(rowTotal)}</td></tr>`;
    });

    html += `<tr class="border-t-2 border-white/20 bg-slate-900 font-black"><td class="unit-cell uppercase !bg-slate-900 !text-yellow-400">TOTAL</td>`;
    monthlyTotals.forEach(mTotal => { html += `<td class="text-center font-mono !text-yellow-400">${mTotal === 0 ? '-' : fmt(mTotal)}</td>`; });
    html += `<td class="total-col !bg-slate-800 !text-yellow-400 text-right">${fmt(grandTotal)}</td></tr>`;

    tbody.innerHTML = html;
  };

  if (currentData.matrixSales) renderMatrixTable(currentData.matrixSales[currentMode], 'matrixBodySales');
  if (currentData.matrixFreq) renderMatrixTable(currentData.matrixFreq[currentMode], 'matrixBodyFreq');
}

function setMatrixMode(mode) {
  window.matrixMode = mode;
  document.getElementById('mBtnPos').className = mode === 'pos' ? 'matrix-btn active' : 'matrix-btn inactive';
  document.getElementById('mBtnGrab').className = mode === 'grab' ? 'matrix-btn active' : 'matrix-btn inactive';
  renderActiveMatrix();
}
let lChart = null;
let pPos = null;
let pGrab = null;

function renderCharts(data) {
  if (lChart) lChart.destroy();
  if (pPos) pPos.destroy();
  if (pGrab) pGrab.destroy();
  
  const chartCls = ['#22d3ee', '#a855f7', '#f97316', '#ec4899'];
  const labels = ['KGD', 'CDK', 'PKP', 'CPY'];
  
  const ctxWeekly = document.getElementById('weeklyChart') || document.getElementById('cLine');
  if (ctxWeekly) {
    lChart = new Chart(ctxWeekly, {
      type: 'line',
      data: {
        labels: data.lineLabels || [],
        datasets: [
          {
            label: 'PosX',
            data: data.linePos || [],
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34,211,238,0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Grab',
            data: data.lineGrab || [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#ffffff', font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                let val = context.parsed.y || 0;
                return `${label}: Rp ${fmt(val)}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { 
            ticks: { 
              color: '#94a3b8', 
              font: { size: 9 },
              callback: function(value) {
                return kFmt(value);
              }
            }, 
            grid: { color: 'rgba(255,255,255,0.05)' } 
          }
        }
      }
    });
  }

  const createDonut = (id, source) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return new Chart(el, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: [source?.kgd || 0, source?.cdk || 0, source?.pkp || 0, source?.cpy || 0],
          backgroundColor: chartCls,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                let val = context.raw || 0;
                let sum = context.dataset.data.reduce((a, b) => a + b, 0);
                let percentage = sum > 0 ? ((val / sum) * 100).toFixed(1) + '%' : '0%';
                return `${label}: Rp ${fmt(val)} (${percentage})`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'doughnutLabelPercentage',
        afterDatasetsDraw(chart) {
          const { ctx, data } = chart;
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            let total = dataset.data.reduce((acc, dataVal) => acc + dataVal, 0);
            
            meta.data.forEach((element, index) => {
              if (total === 0 || dataset.data[index] === 0) return;
              let percentage = ((dataset.data[index] / total) * 100).toFixed(0) + '%';
              
              const { x, y } = element.tooltipPosition();
              
              ctx.save();
              ctx.font = 'bold 10px sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(percentage, x, y);
              ctx.restore();
            });
          });
        }
      }]
    });
  };

  pPos = createDonut('piePos', data.contribPos);
  pGrab = createDonut('pieGrab', data.contribGrab);
}

  
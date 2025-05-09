// main.js
document.addEventListener("DOMContentLoaded", () => {
  /*———————————
    DARK MODE + CHARTS
    — persistência, toggle e reaplicação imediata nos gráficos
  ———————————*/
  const darkToggle = document.getElementById("dark-mode-toggle");
  const savedDark = localStorage.getItem("crmDarkMode") === "true";

  // aplica tema inicial ao <body> e ao ícone
  document.body.classList.toggle("dark-mode", savedDark);
  darkToggle.textContent = savedDark ? "☀️" : "🌙";

  // inicializa os charts (funções declaradas abaixo)
  const salesChart = initSalesChart();
  const funnelChart = initFunnelChart();

  // aplica tema inicial aos charts
  applyDarkThemeToChart(salesChart);
  applyDarkThemeToChart(funnelChart);

  // listener de toggle de tema
  darkToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("crmDarkMode", isDark);
    darkToggle.textContent = isDark ? "☀️" : "🌙";
    applyDarkThemeToChart(salesChart);
    applyDarkThemeToChart(funnelChart);
  });

  /*———————————
    MOBILE MENU
    — abre/fecha nav em mobile
  ———————————*/
  const hamburger = document.getElementById("hamburger");
  const navList = document.querySelector(".crm-root .nav__list");
  hamburger.addEventListener("click", () => navList.classList.toggle("open"));

  /*———————————
    NAV SWITCH
    — troca de seções e fecha menu mobile
  ———————————*/
  const navItems = document.querySelectorAll(
    ".crm-root .nav__item:not(.nav__item--toggle)"
  );
  const sections = document.querySelectorAll(".crm-root .section");
  navItems.forEach((li) => {
    li.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      li.classList.add("active");
      const target = li.dataset.section;
      sections.forEach((sec) => {
        sec.id === target
          ? sec.classList.add("active")
          : sec.classList.remove("active");
      });
      navList.classList.remove("open");
    });
  });

  /*———————————
    UTILS: DEBOUNCE
  ———————————*/
  function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /*———————————
  TOAST QUEUE
  — enfileira e exibe sem overlap
———————————*/
  const toastContainer = document.getElementById("toast-container");
  let toastQueue = [],
    showingToast = false;

  // agenda o fade-out e, em seguida, a remoção da toast
  function scheduleToastDismiss(toastEl, delay = 3000) {
    // 1) adiciona a classe de saída após 'delay'
    setTimeout(() => {
      toastEl.classList.add("hide");
    }, delay);

    // 2) remove do DOM e dispara a próxima toast
    //    (+400ms = tempo do fade-out definido em CSS)
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
      _showNextToast();
    }, delay + 400);
  }

  function showToast(msg, type = "info", dur = 3000) {
    toastQueue.push({ msg, type, dur });
    if (!showingToast) _showNextToast();
  }

  function _showNextToast() {
    if (!toastQueue.length) {
      showingToast = false;
      return;
    }
    showingToast = true;

    const { msg, type, dur } = toastQueue.shift();
    const t = document.createElement("div");
    t.className = `crm-root toast toast--${type}`;
    t.textContent = msg;
    toastContainer.appendChild(t);

    scheduleToastDismiss(t, dur);
  }

  /*———————————
    DADOS INICIAIS (localStorage)
  ———————————*/
  let leadsDataAll = JSON.parse(localStorage.getItem("crmLeads") || "[]");
  let oppDataAll = JSON.parse(localStorage.getItem("crmOpps") || "[]");
  let tasks = JSON.parse(localStorage.getItem("crmTasks") || "[]");
  let usersData = JSON.parse(localStorage.getItem("crmUsers") || "[]");
  let timeline = JSON.parse(localStorage.getItem("crmTimeline") || "[]");
  let settings = JSON.parse(localStorage.getItem("crmSettings") || "{}");

  /*———————————
    DASHBOARD
    — calcula KPIs e redesenha charts com tema correto
  ———————————*/
  updateDashboard(); // primeiro draw

  function updateDashboard() {
    const totalLeads = leadsDataAll.length;
    const conversions = oppDataAll.filter((o) => o.stage === "fechado").length;
    const revenueValue = oppDataAll
      .filter((o) => o.stage === "fechado")
      .reduce((sum, o) => sum + o.value, 0)
      .toFixed(2);

    // atualiza KPIs
    document.getElementById("kpi-leads").innerText = totalLeads;
    document.getElementById("kpi-conversions").innerText = conversions;
    document.getElementById("kpi-revenue").innerText = revenueValue;

    // redesenha Sales Chart
    const salesLabels = oppDataAll.map((_, i) => `Opo ${i + 1}`);
    const salesData = oppDataAll.map((o) => o.value);
    salesChart.data.labels = salesLabels;
    salesChart.data.datasets[0].data = salesData;
    salesChart.update();

    // redesenha Funnel Chart
    const counts = {
      Visitantes: oppDataAll.length,
      Leads: leadsDataAll.length,
      Oportunidades: oppDataAll.length,
      Conversões: conversions,
    };
    funnelChart.data.labels = Object.keys(counts);
    funnelChart.data.datasets[0].data = Object.values(counts);
    funnelChart.update();

    // reaplica tema nos charts
    applyDarkThemeToChart(salesChart);
    applyDarkThemeToChart(funnelChart);
  }

  /*———————————
    Chart.js: criação e theming
  ———————————*/
  function initSalesChart() {
    const ctx = document.getElementById("chart-sales").getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{ label: "Receita", data: [], borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { ticks: {}, grid: {} }, y: { ticks: {}, grid: {} } },
        plugins: { legend: { labels: {} } },
      },
    });
  }

  function initFunnelChart() {
    const ctx = document.getElementById("chart-funnel").getContext("2d");
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{ label: "Funil", data: [], borderWidth: 1 }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { ticks: {}, grid: {} }, y: { ticks: {}, grid: {} } },
        plugins: { legend: { labels: {} } },
      },
    });
  }

  function applyDarkThemeToChart(chart) {
    const isDark = document.body.classList.contains("dark-mode");
    const tickColor = isDark ? "#fff" : "#333";
    const gridColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";

    chart.options.scales.x.ticks.color = tickColor;
    chart.options.scales.y.ticks.color = tickColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;

    if (chart.options.plugins?.legend) {
      chart.options.plugins.legend.labels.color = tickColor;
    }

    chart.update();
  }

  // 6) Primeira execução
  updateDashboard();

  /*———————————
    LEADS SECTION
    — CRUD, filtro, paginação
  ———————————*/
  const leadsBody = document.querySelector("#leads-table tbody");
  let leadsData = leadsDataAll.slice();
  let leadsPage = 1,
    pageSize = 5;

  function saveLeads() {
    localStorage.setItem("crmLeads", JSON.stringify(leadsDataAll));
  }
  function renderLeads() {
    leadsBody.innerHTML = "";
    const start = (leadsPage - 1) * pageSize;
    leadsData.slice(start, start + pageSize).forEach((l, i) => {
      const idx = start + i;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="lead-select" data-idx="${idx}"/></td>
        <td>${l.nome}</td><td>${l.email}</td><td>${l.telefone}</td><td>${l.status}</td>
        <td>
          <button class="crm-root button btn-edit-lead" data-idx="${idx}">Editar</button>
          <button class="crm-root button btn-del-lead"  data-idx="${idx}">Excluir</button>
        </td>`;
      leadsBody.appendChild(tr);
    });
    renderLeadsPagination();
  }
  function renderLeadsPagination() {
    const pag = document.getElementById("leads-pag");
    pag.innerHTML = "";
    const total = Math.ceil(leadsData.length / pageSize);
    for (let i = 1; i <= total; i++) {
      const btn = document.createElement("button");
      btn.innerText = i;
      btn.className = `crm-root button ${i === leadsPage ? "active" : ""}`;
      btn.onclick = () => {
        leadsPage = i;
        renderLeads();
      };
      pag.appendChild(btn);
    }
  }
  const leadsSearch = document.getElementById("leads-search");
  const statusFilter = document.getElementById("leads-status-filter");
  function filterAndRenderLeads() {
    const term = leadsSearch.value.toLowerCase();
    const status = statusFilter.value;
    leadsData = leadsDataAll.filter(
      (l) =>
        (status === "all" || l.status === status) &&
        [l.nome, l.email, l.telefone, l.status].some((v) =>
          v.toLowerCase().includes(term)
        )
    );
    leadsPage = 1;
    renderLeads();
  }
  leadsSearch.addEventListener("input", debounce(filterAndRenderLeads, 400));
  statusFilter.addEventListener("change", filterAndRenderLeads);
  document.getElementById("select-all-leads").onclick = (e) =>
    document
      .querySelectorAll(".lead-select")
      .forEach((cb) => (cb.checked = e.target.checked));

  document.getElementById("bulk-delete-leads").onclick = () => {
    const toDel = Array.from(document.querySelectorAll(".lead-select"))
      .filter((cb) => cb.checked)
      .map((cb) => +cb.dataset.idx)
      .sort((a, b) => b - a);
    toDel.forEach((i) => leadsDataAll.splice(i, 1));
    saveLeads();
    leadsData = leadsDataAll.slice();
    renderLeads();
    updateDashboard();
    showToast("Leads excluídos", "warning");
    addTimelineEvent("lead", "Bulk delete leads");
  };

  document.getElementById("add-lead-btn").onclick = () => {
    const nome = prompt("Nome:");
    if (!nome) return;
    const email = prompt("Email:");
    if (!email) return;
    const tel = prompt("Telefone:");
    if (!tel) return;
    const st = prompt("Status:");
    if (!st) return;
    leadsDataAll.push({ nome, email, telefone: tel, status: st });
    saveLeads();
    leadsData = leadsDataAll.slice();
    renderLeads();
    updateDashboard();
    showToast("Lead criado", "success");
    addTimelineEvent("lead", `Criou lead "${nome}"`);
  };

  leadsBody.addEventListener("click", (e) => {
    const idx = +e.target.dataset.idx;
    if (e.target.classList.contains("btn-del-lead")) {
      const l = leadsDataAll.splice(idx, 1)[0];
      saveLeads();
      leadsData = leadsDataAll.slice();
      renderLeads();
      updateDashboard();
      showToast("Lead excluído", "warning");
      addTimelineEvent("lead", `Removeu lead "${l.nome}"`);
    }
    if (e.target.classList.contains("btn-edit-lead")) {
      const l = leadsDataAll[idx];
      const novo = prompt("Nome:", l.nome);
      if (!novo) return;
      l.nome = novo;
      saveLeads();
      leadsData = leadsDataAll.slice();
      renderLeads();
      updateDashboard();
      showToast("Lead editado", "info");
      addTimelineEvent("lead", `Editou lead "${novo}"`);
    }
  });

  document.getElementById("import-csv").onclick = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".csv";
    inp.onchange = (e) => {
      const fr = new FileReader();
      fr.onload = (ev) => {
        const rows = ev.target.result.trim().split("\n").slice(1);
        leadsDataAll = rows.map((r) => {
          const [n, e, t, s] = r.split(",");
          return { nome: n, email: e, telefone: t, status: s };
        });
        saveLeads();
        leadsData = leadsDataAll.slice();
        renderLeads();
        updateDashboard();
        showToast("CSV importado", "success");
        addTimelineEvent("lead", "Importou CSV");
      };
      fr.readAsText(e.target.files[0]);
    };
    inp.click();
  };

  document.getElementById("export-csv").onclick = () => {
    const rows = [
      "Nome,Email,Telefone,Status",
      ...leadsDataAll.map((l) =>
        [l.nome, l.email, l.telefone, l.status].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado", "info");
    addTimelineEvent("lead", "Exportou CSV");
  };

  renderLeads();

  /*———————————
    PIPELINE (Kanban + Modal)
    — drag & drop + persistência
  ———————————*/
  const pipelineCols = document.querySelectorAll(".kanban__cards");
  function saveOpps() {
    localStorage.setItem("crmOpps", JSON.stringify(oppDataAll));
  }
  function renderOpps() {
    pipelineCols.forEach((c) => (c.innerHTML = ""));
    oppDataAll.forEach((o, i) => {
      const card = document.createElement("div");
      card.className = "crm-root kanban__card";
      card.draggable = true;
      card.id = `opp-${i}`;
      card.innerHTML = `${o.name}<br>R$ ${o.value.toFixed(2)}`;
      card.addEventListener("dragstart", (e) =>
        e.dataTransfer.setData("text", card.id)
      );
      document
        .querySelector(
          `.kanban__column[data-stage="${o.stage}"] .kanban__cards`
        )
        .appendChild(card);
    });
    updateDashboard();
  }
  pipelineCols.forEach((col) => {
    const parentCol = col.parentElement;
    parentCol.addEventListener("dragover", (e) => e.preventDefault());
    parentCol.addEventListener("drop", (e) => {
      e.preventDefault();
      const idx = +e.dataTransfer.getData("text").split("-")[1];
      oppDataAll[idx].stage = parentCol.dataset.stage;
      saveOpps();
      renderOpps();
      showToast("Estágio alterado", "success");
      addTimelineEvent("opportunity", `Moveu ${oppDataAll[idx].name}`);
    });
  });

  const modal = document.getElementById("modal-opportunity");
  document
    .getElementById("add-opportunity-btn")
    .addEventListener("click", () => modal.classList.add("show"));
  document
    .getElementById("cancel-opp")
    .addEventListener("click", () => modal.classList.remove("show"));
  document.getElementById("save-opp").addEventListener("click", () => {
    const name = document.getElementById("opp-name").value.trim();
    const value = parseFloat(document.getElementById("opp-value").value);
    const stage = document.getElementById("opp-stage").value;
    if (!name || isNaN(value)) {
      showToast("Preencha nome e valor", "warning");
      return;
    }
    oppDataAll.push({ name, value, stage });
    saveOpps();
    renderOpps();
    modal.classList.remove("show");
    document.getElementById("opp-name").value = "";
    document.getElementById("opp-value").value = "";
    showToast("Oportunidade criada", "success");
    addTimelineEvent("opportunity", `Criou ${name}`);
  });
  renderOpps();

  /*———————————
    TAREFAS
    — CRUD + ordenação por dueDate
  ———————————*/
  const tasksList = document.getElementById("tasks-list");
  function saveTasks() {
    localStorage.setItem("crmTasks", JSON.stringify(tasks));
  }
  function renderTasks() {
    tasksList.innerHTML = "";
    tasks
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .forEach((t, i) => {
        const overdue =
          new Date(t.dueDate) < new Date() ? ' style="color:red"' : "";
        const li = document.createElement("li");
        li.innerHTML = `<span${overdue}>${t.title} (vence ${t.dueDate})</span>
          <div>
            <button class="crm-root button btn-edit-task" data-i="${i}">Editar</button>
            <button class="crm-root button btn-del-task" data-i="${i}">Excluir</button>
          </div>`;
        tasksList.appendChild(li);
      });
  }
  document.getElementById("add-task-btn").addEventListener("click", () => {
    const title = prompt("Título:");
    const dueDate = title && prompt("Vencimento (YYYY-MM-DD):");
    if (!title || !dueDate) return;
    tasks.push({ title, dueDate });
    saveTasks();
    renderTasks();
    showToast("Tarefa criada", "success");
    addTimelineEvent("task", `Criou ${title}`);
  });
  tasksList.addEventListener("click", (e) => {
    const i = +e.target.dataset.i;
    if (e.target.classList.contains("btn-del-task")) {
      const t = tasks.splice(i, 1)[0];
      saveTasks();
      renderTasks();
      showToast("Tarefa excluída", "warning");
      addTimelineEvent("task", `Removeu ${t.title}`);
    }
    if (e.target.classList.contains("btn-edit-task")) {
      const t = tasks[i];
      const nt = prompt("Título:", t.title);
      const nd = nt && prompt("Vencimento:", t.dueDate);
      if (!nt || !nd) return;
      t.title = nt;
      t.dueDate = nd;
      saveTasks();
      renderTasks();
      showToast("Tarefa editada", "info");
      addTimelineEvent("task", `Editou ${nt}`);
    }
  });
  renderTasks();

  /*———————————
    TIMELINE
    — grava e filtra eventos
  ———————————*/
  const activityList = document.getElementById("activity-list");
  function saveTimeline() {
    localStorage.setItem("crmTimeline", JSON.stringify(timeline));
  }
  function renderTimeline(filter = "all") {
    activityList.innerHTML = "";
    timeline
      .slice()
      .reverse()
      .filter((ev) => filter === "all" || ev.type === filter)
      .forEach((ev) => {
        const li = document.createElement("li");
        li.textContent = `[${ev.time}] ${ev.text}`;
        activityList.appendChild(li);
      });
  }
  document
    .getElementById("timeline-filter")
    .addEventListener("change", (e) => renderTimeline(e.target.value));
  function addTimelineEvent(type, text) {
    const now = new Date().toLocaleString("pt-BR");
    timeline.push({ type, text, time: now });
    saveTimeline();
    renderTimeline(document.getElementById("timeline-filter").value);
  }
  renderTimeline();

  /*———————————
    RELATÓRIOS
    — gera tabela + export CSV/XLS stub
  ———————————*/
  const reportTable = document.getElementById("report-table");
  function generateReport() {
    reportTable.innerHTML = `
      <thead><tr><th>Seção</th><th>Total</th></tr></thead>
      <tbody>
        <tr><td>Leads</td><td>${leadsDataAll.length}</td></tr>
        <tr><td>Oportunidades</td><td>${oppDataAll.length}</td></tr>
        <tr><td>Tarefas</td><td>${tasks.length}</td></tr>
        <tr><td>Conversões</td><td>${
          oppDataAll.filter((o) => o.stage === "fechado").length
        }</td></tr>
      </tbody>`;
  }
  document.getElementById("export-csv-report").addEventListener("click", () => {
    generateReport();
    const rows = Array.from(reportTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.cells)
        .map((td) => td.innerText)
        .join(",")
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV relatório exportado", "info");
    addTimelineEvent("report", "Exportou relatório CSV");
  });
  document.getElementById("export-xls").addEventListener("click", () => {
    generateReport();
    showToast("XLS relatório stub", "info");
    addTimelineEvent("report", "Exportou relatório XLS");
  });
  generateReport();

  /*———————————
    USUÁRIOS
    — CRUD + permissão Admin
  ———————————*/
  const usersBody = document.querySelector("#users-table tbody");
  function saveUsers() {
    localStorage.setItem("crmUsers", JSON.stringify(usersData));
  }
  function renderUsers() {
    usersBody.innerHTML = "";
    usersData.forEach((u, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nome}</td><td>${u.role}</td><td>${u.status}</td>
        <td>
          <button class="crm-root button btn-edit-user" data-i="${i}">Editar</button>
          <button class="crm-root button btn-del-user"  data-i="${i}">Excluir</button>
        </td>`;
      usersBody.appendChild(tr);
    });
  }
  document.getElementById("add-user-btn").addEventListener("click", () => {
    const nome = prompt("Nome:");
    const role = nome && prompt("Perfil (Admin/Vendedor/Leitura):");
    if (!nome || !role) return;
    usersData.push({ nome, role, status: "Ativo" });
    saveUsers();
    renderUsers();
    showToast("Usuário criado", "success");
    addTimelineEvent("user", `Criou ${nome}`);
  });
  usersBody.addEventListener("click", (e) => {
    const i = +e.target.dataset.i;
    if (e.target.classList.contains("btn-del-user")) {
      const u = usersData.splice(i, 1)[0];
      saveUsers();
      renderUsers();
      showToast("Usuário excluído", "warning");
      addTimelineEvent("user", `Removeu ${u.nome}`);
    }
    if (e.target.classList.contains("btn-edit-user")) {
      const u = usersData[i];
      const novo = prompt("Nome:", u.nome);
      if (!novo) return;
      u.nome = novo;
      saveUsers();
      renderUsers();
      showToast("Usuário editado", "info");
      addTimelineEvent("user", `Editou ${novo}`);
    }
  });
  renderUsers();

  /*———————————
    CONFIGURAÇÕES
    — carrega, salva e aplica restrições
  ———————————*/
  const settingsForm = document.getElementById("settings-form");
  ["currency", "timezone", "branding", "role"].forEach((f) => {
    if (settings[f]) settingsForm[f].value = settings[f];
  });
  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    settings = {
      currency: settingsForm.currency.value,
      timezone: settingsForm.timezone.value,
      branding: settingsForm.branding.value,
      role: settingsForm.role.value,
    };
    localStorage.setItem("crmSettings", JSON.stringify(settings));
    showToast("Configurações salvas", "success");
    addTimelineEvent("config", "Atualizou configurações");
    if (settings.role !== "Admin") {
      document
        .querySelectorAll(".btn-del-user,.btn-edit-user,#add-user-btn")
        .forEach((b) => (b.disabled = true));
    }
  });

  /*———————————
    INTEGRAÇÕES (stub)
  ———————————*/
  document.getElementById("call-integration").addEventListener("click", () => {
    const api = document.getElementById("integration-select").value;
    showToast(`Chamando ${api}`, "info");
    addTimelineEvent("integration", `Stub ${api}`);
  });

  /*———————————
    SCROLLREVEAL
    — reset:false evita re-execuções e flicker
  ———————————*/
  ScrollReveal().reveal(".crm-root .section", {
    distance: "20px",
    duration: 600,
    easing: "ease-out",
    origin: "bottom",
    interval: 100,
    reset: false,
  });
});

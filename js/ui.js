import {
  getPeriods,
  getActivePeriod,
  getActivePeriodId,
  setActivePeriodId,
  addPeriod as storePeriod,
  deletePeriod as storeDeletePeriod,
  addCategoryToActivePeriod,
  deleteCategoryFromActivePeriod,
  addTransactionToActivePeriod,
  deleteTransactionFromActivePeriod
} from "./storage.js";

import {
  getMonthName,
  getWeekdayName,
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateKey,
  parseDateKey,
  formatLongDate,
  isToday
} from "./calendar.js";

let selectedDate = null;
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentView = "calendar";

const CATEGORY_TYPE_LABELS = {
  ingreso: "Ingreso",
  gasto: "Gasto",
  ahorro: "Ahorro",
  budget: "Budget"
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getDateKeyFromInput(value) {
  return value || "";
}

function isDateInsidePeriod(dateKey, period) {
  if (!period || !dateKey) return false;
  if (!period.startDate || !period.endDate) return true;
  return dateKey >= period.startDate && dateKey <= period.endDate;
}

function setCalendarToPeriodStart(period) {
  if (!period?.startDate) return;
  const date = parseDateKey(period.startDate);
  currentMonth = date.getMonth();
  currentYear = date.getFullYear();
}

function getTransactionVisualType(transaction, period) {
  const category = period?.categories?.find((cat) => cat.id === transaction.categoryId);
  return category?.type || transaction.type || "gasto";
}

function getTransactionLabel(transaction, period) {
  const visualType = getTransactionVisualType(transaction, period);

  if (visualType === "ingreso") return "Ingreso";
  if (visualType === "ahorro") return "Ahorro";
  if (visualType === "budget") return "Budget";
  return "Gasto";
}

function getAmountPrefix(transaction) {
  if (transaction.type === "ingreso") return "+";
  return "-";
}

function getPeriodTotals(period) {
  let income = 0;
  let expense = 0;
  let savings = 0;

  if (!period) {
    return { income, expense, savings, balance: 0 };
  }

  Object.values(period.transactions || {}).forEach((dayTransactions) => {
    dayTransactions.forEach((transaction) => {
      if (transaction.type === "ingreso") income += Number(transaction.amount || 0);
      if (transaction.type === "gasto") expense += Number(transaction.amount || 0);
      if (transaction.type === "ahorro") savings += Number(transaction.amount || 0);
    });
  });

  return {
    income,
    expense,
    savings,
    balance: income - expense - savings
  };
}

function getMonthTotals(period) {
  let income = 0;
  let expense = 0;
  let savings = 0;

  if (!period) {
    return { income, expense, savings, balance: 0 };
  }

  Object.entries(period.transactions || {}).forEach(([dateKey, dayTransactions]) => {
    const date = parseDateKey(dateKey);

    if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
      return;
    }

    dayTransactions.forEach((transaction) => {
      if (transaction.type === "ingreso") income += Number(transaction.amount || 0);
      if (transaction.type === "gasto") expense += Number(transaction.amount || 0);
      if (transaction.type === "ahorro") savings += Number(transaction.amount || 0);
    });
  });

  return {
    income,
    expense,
    savings,
    balance: income - expense - savings
  };
}

function getCategoryTotals(period, categoryId) {
  let income = 0;
  let expense = 0;
  let savings = 0;

  Object.values(period.transactions || {}).forEach((dayTransactions) => {
    dayTransactions.forEach((transaction) => {
      if (transaction.categoryId !== categoryId) return;
      if (transaction.type === "ingreso") income += Number(transaction.amount || 0);
      if (transaction.type === "gasto") expense += Number(transaction.amount || 0);
      if (transaction.type === "ahorro") savings += Number(transaction.amount || 0);
    });
  });

  return {
    income,
    expense,
    savings,
    balance: income - expense - savings
  };
}

function getBudgetStatusClass(spent, budget) {
  if (!budget || budget <= 0) return "status-neutral";
  const ratio = spent / budget;
  if (ratio >= 1) return "status-danger";
  if (ratio >= 0.8) return "status-warning";
  return "status-good";
}

function getBudgetStatusText(spent, budget) {
  if (!budget || budget <= 0) return "Sin límite";
  const ratio = spent / budget;
  if (ratio >= 1) return "Pasado";
  if (ratio >= 0.8) return "Cuidado";
  return "Saludable";
}

function showElement(id) {
  document.getElementById(id).classList.remove("hidden-view");
}

function hideElement(id) {
  document.getElementById(id).classList.add("hidden-view");
}

export function openHomePage() {
  showElement("homePage");
  hideElement("workspace");
  renderHomePeriods();
}

export function openWorkspace() {
  const period = getActivePeriod();

  if (!period) {
    openHomePage();
    return;
  }

  hideElement("homePage");
  showElement("workspace");
  renderAll();
}

export function bypassHome() {
  const period = getActivePeriod();

  if (period) {
    openWorkspace();
    return;
  }

  openPeriodPopup();
}

export function goToPreviousMonth() {
  currentMonth--;

  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }

  renderCurrentView();
}

export function goToNextMonth() {
  currentMonth++;

  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }

  renderCurrentView();
}

export function openCategoryPopup() {
  if (!getActivePeriod()) {
    alert("Primero crea o selecciona un periodo.");
    openPeriodPopup();
    return;
  }

  updateCategoryTypeUI();
  document.getElementById("categoryPopup").style.display = "flex";
}

export function closeCategoryPopup() {
  document.getElementById("categoryPopup").style.display = "none";
}

export function openPeriodPopup() {
  updatePeriodStyleUI();
  document.getElementById("periodPopup").style.display = "flex";
}

export function closePeriodPopup() {
  document.getElementById("periodPopup").style.display = "none";
}

export function openTransactionPopup(dateKey) {
  const period = getActivePeriod();

  if (!period) {
    alert("Primero crea o selecciona un periodo.");
    openPeriodPopup();
    return;
  }

  if (!isDateInsidePeriod(dateKey, period)) {
    alert("Esta fecha está fuera del periodo seleccionado.");
    return;
  }

  selectedDate = dateKey;
  updateCategorySelect();
  updateTransactionTypeUI();
  updateSelectedDateLabel();
  document.getElementById("transactionPopup").style.display = "flex";
}

export function closeTransactionPopup() {
  document.getElementById("transactionPopup").style.display = "none";
}

export function switchToCalendarView() {
  currentView = "calendar";

  document.getElementById("calendarView").classList.remove("hidden-view");
  document.getElementById("calendarView").classList.add("active-view");
  document.getElementById("listView").classList.remove("active-view");
  document.getElementById("listView").classList.add("hidden-view");
  document.getElementById("calendarViewBtn").classList.add("active");
  document.getElementById("listViewBtn").classList.remove("active");

  renderCalendar();
}

export function switchToListView() {
  currentView = "list";

  document.getElementById("listView").classList.remove("hidden-view");
  document.getElementById("listView").classList.add("active-view");
  document.getElementById("calendarView").classList.remove("active-view");
  document.getElementById("calendarView").classList.add("hidden-view");
  document.getElementById("listViewBtn").classList.add("active");
  document.getElementById("calendarViewBtn").classList.remove("active");

  renderListView();
}

export function renderAll() {
  renderHomePeriods();
  renderPeriods();
  renderCategories();
  updateCategorySelect();
  updateTransactionTypeUI();
  renderCurrentView();
}

export function renderCurrentView() {
  updateHeaderTitle();
  renderActivePeriodBar();
  renderMonthSummary();

  if (currentView === "calendar") {
    renderCalendar();
  } else {
    renderListView();
  }
}

function updateHeaderTitle() {
  const title = document.getElementById("calendarTitle");
  title.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
}

function renderActivePeriodBar() {
  const period = getActivePeriod();
  const name = document.getElementById("activePeriodName");
  const style = document.getElementById("activePeriodStyle");

  if (!period) {
    name.textContent = "Sin periodo activo";
    style.textContent = "Libre";
    return;
  }

  name.textContent = `${period.name} • ${period.startDate || "sin inicio"} a ${period.endDate || "sin final"}`;
  style.textContent = period.style || "libre";
}

function updateSelectedDateLabel() {
  const label = document.getElementById("selectedDateLabel");

  if (!selectedDate) {
    label.textContent = "Sin seleccionar";
    return;
  }

  const date = parseDateKey(selectedDate);
  label.textContent = `${getWeekdayName(date)}, ${formatLongDate(date)}`;
}

export function renderMonthSummary() {
  const period = getActivePeriod();
  const totals = getMonthTotals(period);

  document.getElementById("monthIncome").textContent = money(totals.income);
  document.getElementById("monthExpense").textContent = money(totals.expense);
  document.getElementById("monthSavings").textContent = money(totals.savings);

  const balance = document.getElementById("monthBalance");
  balance.textContent = money(totals.balance);
  balance.classList.toggle("ingreso", totals.balance >= 0);
  balance.classList.toggle("gasto", totals.balance < 0);
}

export function renderCalendar() {
  updateHeaderTitle();

  const period = getActivePeriod();
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  if (!period) {
    grid.innerHTML = `<div class="list-empty">No hay periodo activo.</div>`;
    return;
  }

  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayTransactions = period.transactions[dateKey] || [];
    const insidePeriod = isDateInsidePeriod(dateKey, period);

    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    if (!insidePeriod) cell.classList.add("outside-period");
    if (isToday(currentYear, currentMonth, day)) cell.classList.add("today");
    if (selectedDate === dateKey) cell.classList.add("selected-day");

    if (insidePeriod) {
      cell.addEventListener("click", () => openTransactionPopup(dateKey));
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;

    const transactionContainer = document.createElement("div");
    transactionContainer.className = "day-transactions";

    let total = 0;

    dayTransactions.slice(0, 3).forEach((transaction) => {
      const visualType = getTransactionVisualType(transaction, period);
      const item = document.createElement("div");
      item.className = `transaction-item ${visualType}`;
      item.textContent = `${transaction.categoryName || transaction.description || "Movimiento"}: ${money(transaction.amount)}`;
      transactionContainer.appendChild(item);

      if (transaction.type === "ingreso") total += Number(transaction.amount);
      if (transaction.type === "gasto" || transaction.type === "ahorro") total -= Number(transaction.amount);
    });

    const summary = document.createElement("div");
    summary.className = "transaction-summary";

    if (dayTransactions.length > 0) {
      summary.textContent = `Disponible: ${money(total)}`;
    } else if (!insidePeriod) {
      summary.textContent = "Fuera del periodo";
    }

    cell.appendChild(dayNumber);
    cell.appendChild(transactionContainer);
    cell.appendChild(summary);
    grid.appendChild(cell);
  }
}

export function renderListView() {
  updateHeaderTitle();

  const period = getActivePeriod();
  const container = document.getElementById("listContainer");
  container.innerHTML = "";

  if (!period) {
    container.innerHTML = `<div class="list-empty">No hay periodo activo.</div>`;
    return;
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const monthDays = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayTransactions = period.transactions[dateKey] || [];

    if (dayTransactions.length > 0) {
      monthDays.push({ day, dateKey, transactions: dayTransactions });
    }
  }

  if (monthDays.length === 0) {
    container.innerHTML = `<div class="list-empty">No hay movimientos registrados en este mes para este periodo.</div>`;
    return;
  }

  monthDays.forEach(({ day, dateKey, transactions }) => {
    const date = parseDateKey(dateKey);
    const weekday = getWeekdayName(date);

    const group = document.createElement("div");
    group.className = "list-day-group";

    const header = document.createElement("div");
    header.className = "list-day-header";

    const headerLeft = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "list-day-title";
    title.textContent = `${day} ${weekday}`;

    const subtitle = document.createElement("p");
    subtitle.className = "list-day-subtitle";
    subtitle.textContent = formatLongDate(date);

    const addBtn = document.createElement("button");
    addBtn.className = "list-add-btn";
    addBtn.type = "button";
    addBtn.textContent = "+ Añadir";
    addBtn.addEventListener("click", () => openTransactionPopup(dateKey));

    headerLeft.appendChild(title);
    headerLeft.appendChild(subtitle);
    header.appendChild(headerLeft);
    header.appendChild(addBtn);

    const items = document.createElement("div");
    items.className = "list-items";

    let total = 0;

    transactions.forEach((transaction) => {
      const visualType = getTransactionVisualType(transaction, period);
      const card = document.createElement("div");
      card.className = `list-card ${visualType}`;

      const left = document.createElement("div");
      left.className = "list-card-left";

      const cardTitle = document.createElement("div");
      cardTitle.className = "list-card-title";
      cardTitle.textContent = transaction.categoryName || "Movimiento";

      const cardSubtitle = document.createElement("div");
      cardSubtitle.className = "list-card-subtitle";
      cardSubtitle.textContent = [
        getTransactionLabel(transaction, period),
        transaction.description
      ].filter(Boolean).join(" • ");

      const right = document.createElement("div");
      right.className = "list-card-right";

      const amount = document.createElement("div");
      amount.className = "list-card-amount";
      amount.textContent = `${getAmountPrefix(transaction)}${money(transaction.amount)}`;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Borrar";
      deleteBtn.addEventListener("click", () => {
        const confirmed = confirm("¿Seguro que deseas borrar este movimiento?");
        if (!confirmed) return;

        deleteTransactionFromActivePeriod(dateKey, transaction.id);
        renderAll();
      });

      left.appendChild(cardTitle);
      left.appendChild(cardSubtitle);
      right.appendChild(amount);
      right.appendChild(deleteBtn);
      card.appendChild(left);
      card.appendChild(right);
      items.appendChild(card);

      if (transaction.type === "ingreso") total += Number(transaction.amount);
      if (transaction.type === "gasto" || transaction.type === "ahorro") total -= Number(transaction.amount);
    });

    const totalEl = document.createElement("div");
    totalEl.className = "day-total";
    totalEl.innerHTML = `Disponible del día: <strong>${money(total)}</strong>`;

    group.appendChild(header);
    group.appendChild(items);
    group.appendChild(totalEl);
    container.appendChild(group);
  });
}

export function renderHomePeriods() {
  const periods = getPeriods();
  const container = document.getElementById("homePeriodList");
  container.innerHTML = "";

  if (periods.length === 0) {
    container.innerHTML = `<div class="list-empty">No hay periodos todavía. Crea uno para empezar.</div>`;
    return;
  }

  periods.forEach((period) => {
    const card = document.createElement("div");
    card.className = "home-period-card";

    const text = document.createElement("div");
    text.innerHTML = `<strong>${period.name}</strong><span>${period.startDate || "sin inicio"} a ${period.endDate || "sin final"} • ${period.style}</span>`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Abrir";
    button.addEventListener("click", () => selectPeriod(period.id));

    card.appendChild(text);
    card.appendChild(button);
    container.appendChild(card);
  });
}

export function renderPeriods() {
  const periods = getPeriods();
  const activeId = getActivePeriodId();
  const list = document.getElementById("periodList");
  list.innerHTML = "";

  if (periods.length === 0) {
    list.innerHTML = `<div class="item empty-state-card">No hay periodos todavía.</div>`;
    return;
  }

  periods.forEach((period) => {
    const row = document.createElement("div");
    row.className = "item-row";

    if (period.id === activeId) row.classList.add("active");

    const box = document.createElement("div");
    box.className = "item";

    const totals = getPeriodTotals(period);
    const remaining = Number(period.budget || 0) - totals.expense - totals.savings;
    const statusClass = getBudgetStatusClass(totals.expense + totals.savings, Number(period.budget || 0));
    const statusText = getBudgetStatusText(totals.expense + totals.savings, Number(period.budget || 0));

    box.innerHTML = `
      <div class="item-content">
        <div class="item-title">${period.name}</div>
        <div class="item-meta">
          <span class="status-badge">${period.style}</span>
          <span>${period.startDate || "sin inicio"} → ${period.endDate || "sin final"}</span>
          <span class="budget-badge">Budget: ${money(period.budget)}</span>
          <span class="gasto-text">Gastado: ${money(totals.expense)}</span>
          <span class="ahorro-text">Ahorrado: ${money(totals.savings)}</span>
          <span>Restante: ${money(remaining)}</span>
          <span class="budget-status ${statusClass}">${statusText}</span>
        </div>
      </div>
    `;

    const selectBtn = document.createElement("button");
    selectBtn.className = "select-period-btn";
    selectBtn.type = "button";
    selectBtn.textContent = period.id === activeId ? "Activo" : "Abrir";
    selectBtn.addEventListener("click", () => selectPeriod(period.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn small-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Borrar";
    deleteBtn.addEventListener("click", () => deletePeriod(period.id));

    row.appendChild(box);
    row.appendChild(selectBtn);
    row.appendChild(deleteBtn);
    list.appendChild(row);
  });
}

export function selectPeriod(periodId) {
  const period = getPeriods().find((item) => item.id === periodId);
  if (!period) return;

  setActivePeriodId(periodId);
  selectedDate = null;
  setCalendarToPeriodStart(period);
  openWorkspace();
}

export function addPeriod() {
  const nameInput = document.getElementById("periodName");
  const startInput = document.getElementById("periodStart");
  const endInput = document.getElementById("periodEnd");
  const styleInput = document.getElementById("periodStyle");
  const budgetInput = document.getElementById("periodBudget");

  const startDate = getDateKeyFromInput(startInput.value);
  const endDate = getDateKeyFromInput(endInput.value);
  const style = styleInput.value;
  const defaultName = startDate && endDate ? `${startDate} a ${endDate}` : "Nuevo periodo";

  if (!startDate || !endDate) {
    alert("Añade fecha inicial y fecha final.");
    return;
  }

  if (endDate < startDate) {
    alert("La fecha final no puede ser antes de la fecha inicial.");
    return;
  }

  const period = storePeriod({
    name: nameInput.value.trim() || defaultName,
    startDate,
    endDate,
    style,
    budget: style === "libre" ? 0 : Number(budgetInput.value || 0)
  });

  nameInput.value = "";
  startInput.value = "";
  endInput.value = "";
  budgetInput.value = "";
  styleInput.value = "libre";

  closePeriodPopup();
  setCalendarToPeriodStart(period);
  openWorkspace();
}

export function deletePeriod(periodId) {
  const confirmed = confirm("¿Seguro que deseas borrar este periodo? Se borrarán sus categorías y movimientos.");
  if (!confirmed) return;

  storeDeletePeriod(periodId);
  const next = getActivePeriod();

  if (next) {
    setCalendarToPeriodStart(next);
    openWorkspace();
  } else {
    renderAll();
    openHomePage();
  }
}

export function renderCategories() {
  const period = getActivePeriod();
  const list = document.getElementById("categoryList");
  list.innerHTML = "";

  if (!period) {
    list.innerHTML = `<div class="item empty-state-card">Selecciona un periodo primero.</div>`;
    return;
  }

  if (period.categories.length === 0) {
    list.innerHTML = `<div class="item empty-state-card">No hay categorías todavía.</div>`;
    return;
  }

  period.categories.forEach((category) => {
    const totals = getCategoryTotals(period, category.id);
    const spentForBudget = category.type === "budget" ? totals.expense : 0;
    const remaining = Number(category.budget || 0) - spentForBudget;
    const statusClass = getBudgetStatusClass(spentForBudget, Number(category.budget || 0));
    const statusText = getBudgetStatusText(spentForBudget, Number(category.budget || 0));

    const row = document.createElement("div");
    row.className = "item-row";

    const box = document.createElement("div");
    box.className = `item category-item ${category.type}`;

    let metaHTML = "";

    if (category.type === "ingreso") {
      metaHTML = `<span class="ingreso-text">Ingresos: ${money(totals.income)}</span>`;
    } else if (category.type === "gasto") {
      metaHTML = `<span class="gasto-text">Gastado: ${money(totals.expense)}</span>`;
    } else if (category.type === "ahorro") {
      metaHTML = `<span class="ahorro-text">Ahorrado: ${money(totals.savings)}</span>`;
    } else {
      metaHTML = `
        <span class="budget-badge">Budget: ${money(category.budget)}</span>
        <span class="gasto-text">Gastado: ${money(spentForBudget)}</span>
        <span>Restante: ${money(remaining)}</span>
        <span class="budget-status ${statusClass}">${statusText}</span>
      `;
    }

    box.innerHTML = `
      <div class="item-content">
        <div class="item-title-row">
          <span class="item-title">${category.name}</span>
          <span class="type-badge ${category.type}">${CATEGORY_TYPE_LABELS[category.type]}</span>
        </div>
        <div class="item-meta">${metaHTML}</div>
      </div>
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn small-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Borrar";
    deleteBtn.addEventListener("click", () => deleteCategory(category.id, category.name));

    row.appendChild(box);
    row.appendChild(deleteBtn);
    list.appendChild(row);
  });
}

export function addCategory() {
  const titleInput = document.getElementById("catTitulo");
  const typeInput = document.getElementById("catType");
  const budgetInput = document.getElementById("catBudget");

  const name = titleInput.value.trim();
  const type = typeInput.value;
  const budget = type === "budget" ? Number(budgetInput.value || 0) : 0;
  const period = getActivePeriod();

  if (!period) {
    alert("Primero crea o selecciona un periodo.");
    return;
  }

  if (!name) {
    alert("Añade un nombre para la categoría.");
    return;
  }

  if (period.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    alert("Ya existe una categoría con ese nombre en este periodo.");
    return;
  }

  addCategoryToActivePeriod({ name, type, budget });

  titleInput.value = "";
  typeInput.value = "ingreso";
  budgetInput.value = "";
  updateCategoryTypeUI();
  closeCategoryPopup();
  renderAll();
}

export function deleteCategory(categoryId, categoryName) {
  const confirmed = confirm(`¿Seguro que deseas borrar "${categoryName}"? También se borrarán sus movimientos del calendario.`);
  if (!confirmed) return;

  deleteCategoryFromActivePeriod(categoryId);
  renderAll();
}

export function updateCategorySelect() {
  const period = getActivePeriod();
  const select = document.getElementById("categoriaSelect");
  select.innerHTML = '<option value="">Sin categoría / tipo manual</option>';

  if (!period) return;

  period.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.name} (${CATEGORY_TYPE_LABELS[category.type]})`;
    select.appendChild(option);
  });
}

export function updateCategoryTypeUI() {
  const type = document.getElementById("catType").value;
  const wrapper = document.getElementById("catBudgetWrapper");
  const help = document.getElementById("categoryTypeHelp");

  if (type === "budget") {
    wrapper.classList.remove("hidden-view");
  } else {
    wrapper.classList.add("hidden-view");
  }

  if (type === "ingreso") help.textContent = "Ingreso: registra dinero que entra, como nómina, propinas o regalos.";
  if (type === "gasto") help.textContent = "Gasto: registra pagos obligatorios o gastos directos, como carro, celular o luz.";
  if (type === "ahorro") help.textContent = "Ahorro: registra dinero separado para una meta, como viaje, emergencia o equipo.";
  if (type === "budget") help.textContent = "Budget: define un límite para gastar en esa categoría, como fast food o hobbies.";
}

export function updateTransactionTypeUI() {
  const period = getActivePeriod();
  const select = document.getElementById("categoriaSelect");
  const manualWrapper = document.getElementById("manualTypeWrapper");
  const typeBox = document.getElementById("selectedCategoryTypeBox");
  const typeLabel = document.getElementById("selectedCategoryTypeLabel");
  const help = document.getElementById("transactionTypeHelp");

  if (!select || !manualWrapper || !typeBox || !typeLabel || !help) return;

  const category = period?.categories?.find((cat) => cat.id === select.value);

  if (!category) {
    manualWrapper.classList.remove("hidden-view");
    typeBox.classList.add("manual");
    typeLabel.textContent = "Manual";
    help.textContent = "No seleccionaste categoría. Escoge manualmente si es ingreso, gasto o ahorro.";
    return;
  }

  manualWrapper.classList.add("hidden-view");
  typeBox.classList.remove("manual");
  typeLabel.textContent = CATEGORY_TYPE_LABELS[category.type];

  if (category.type === "ingreso") help.textContent = "Esta categoría es de ingreso. El movimiento se guardará como dinero que entra.";
  if (category.type === "gasto") help.textContent = "Esta categoría es de gasto. El movimiento se guardará como dinero que sale.";
  if (category.type === "ahorro") help.textContent = "Esta categoría es de ahorro. El movimiento aumentará lo ahorrado.";
  if (category.type === "budget") help.textContent = "Esta categoría es de budget. El movimiento contará como gasto contra ese budget.";
}

export function addTransaction() {
  const period = getActivePeriod();
  const categoryId = document.getElementById("categoriaSelect").value;
  const category = period?.categories?.find((cat) => cat.id === categoryId);
  const description = document.getElementById("descripcion").value.trim();
  const amount = Number(document.getElementById("cantidad").value || 0);
  let type = document.getElementById("tipoMovimiento").value;

  if (category) {
    if (category.type === "ingreso") type = "ingreso";
    if (category.type === "gasto" || category.type === "budget") type = "gasto";
    if (category.type === "ahorro") type = "ahorro";
  }

  if (!selectedDate) {
    alert("Selecciona un día.");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Añade una cantidad válida.");
    return;
  }

  addTransactionToActivePeriod(selectedDate, {
    categoryId,
    description,
    amount,
    type
  });

  clearTransactionForm();
  closeTransactionPopup();
  renderAll();
}

function clearTransactionForm() {
  document.getElementById("categoriaSelect").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("cantidad").value = "";
  document.getElementById("tipoMovimiento").value = "gasto";
  updateTransactionTypeUI();
}

export function updatePeriodStyleUI() {
  const style = document.getElementById("periodStyle").value;
  const wrapper = document.getElementById("periodBudgetWrapper");
  const help = document.getElementById("periodStyleHelp");

  if (style === "libre") {
    wrapper.classList.add("hidden-view");
    help.textContent = "Libre: puedes crear categorías y movimientos manualmente.";
  } else if (style === "budget") {
    wrapper.classList.remove("hidden-view");
    help.textContent = "Budget: el periodo tiene un límite general y categorías con budget.";
  } else {
    wrapper.classList.remove("hidden-view");
    help.textContent = "Planificador: por ahora guarda el periodo como base. La automatización se trabajará después.";
  }
}

export function initUI() {
  const period = getActivePeriod();

  updateCategoryTypeUI();

  if (period) {
    setCalendarToPeriodStart(period);
    openWorkspace();
  } else {
    openHomePage();
  }

  renderAll();
}

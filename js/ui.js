import {
  getCategories,
  saveCategories,
  getPeriods,
  savePeriods,
  getTransactions,
  saveTransactions,
  removeCategory,
  removePeriodByIndex,
  removeTransaction
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
  document.getElementById("categoryPopup").style.display = "flex";
}

export function closeCategoryPopup() {
  document.getElementById("categoryPopup").style.display = "none";
}

export function openPeriodPopup() {
  document.getElementById("periodPopup").style.display = "flex";
}

export function closePeriodPopup() {
  document.getElementById("periodPopup").style.display = "none";
}

export function openTransactionPopup(dateKey) {
  selectedDate = dateKey;
  updateCategorySelect();
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

export function renderCurrentView() {
  updateHeaderTitle();
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

function updateSelectedDateLabel() {
  const label = document.getElementById("selectedDateLabel");

  if (!selectedDate) {
    label.textContent = "Sin seleccionar";
    return;
  }

  const date = parseDateKey(selectedDate);
  label.textContent = `${getWeekdayName(date)}, ${formatLongDate(date)}`;
}

function getCurrentMonthDateKeys() {
  const keys = [];
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  for (let day = 1; day <= daysInMonth; day++) {
    keys.push(formatDateKey(currentYear, currentMonth, day));
  }

  return keys;
}

function getCurrentMonthTransactions() {
  const transactions = getTransactions();
  const monthKeys = new Set(getCurrentMonthDateKeys());
  const monthTransactions = [];

  Object.entries(transactions).forEach(([dateKey, items]) => {
    if (!monthKeys.has(dateKey)) return;

    items.forEach((item, index) => {
      monthTransactions.push({ dateKey, index, ...item });
    });
  });

  return monthTransactions;
}

function getBudgetStatus(spent, budget) {
  if (budget <= 0) {
    return {
      text: "Sin budget",
      className: "warning"
    };
  }

  const usage = spent / budget;

  if (usage > 1) {
    return {
      text: `Pasado por $${(spent - budget).toFixed(2)}`,
      className: "over"
    };
  }

  if (usage >= 0.8) {
    return {
      text: `Cerca del límite (${Math.round(usage * 100)}%)`,
      className: "warning"
    };
  }

  return {
    text: `Saludable (${Math.round(usage * 100)}%)`,
    className: "ok"
  };
}

function buildCategoryStats() {
  const categories = getCategories();
  const monthTransactions = getCurrentMonthTransactions();

  return categories.map((category) => {
    const spent = monthTransactions
      .filter((tx) => tx.tipo === "gasto" && tx.categoria === category.name)
      .reduce((sum, tx) => sum + Number(tx.cantidad || 0), 0);

    const remaining = Math.max(Number(category.budget || 0) - spent, 0);
    const status = getBudgetStatus(spent, Number(category.budget || 0));

    return {
      ...category,
      spent,
      remaining,
      status
    };
  });
}

function buildPeriodStats() {
  const periods = getPeriods();
  const transactions = getTransactions();

  return periods.map((period) => {
    let spent = 0;

    Object.entries(transactions).forEach(([dateKey, items]) => {
      if (dateKey < period.start || dateKey > period.end) return;

      items.forEach((item) => {
        if (item.tipo === "gasto") {
          spent += Number(item.cantidad || 0);
        }
      });
    });

    const remaining = Math.max(Number(period.budget || 0) - spent, 0);
    const status = getBudgetStatus(spent, Number(period.budget || 0));

    return {
      ...period,
      spent,
      remaining,
      status
    };
  });
}

function renderMonthSummary() {
  const monthTransactions = getCurrentMonthTransactions();
  const income = monthTransactions
    .filter((tx) => tx.tipo === "ingreso")
    .reduce((sum, tx) => sum + Number(tx.cantidad || 0), 0);
  const expense = monthTransactions
    .filter((tx) => tx.tipo === "gasto")
    .reduce((sum, tx) => sum + Number(tx.cantidad || 0), 0);
  const balance = income - expense;

  document.getElementById("monthIncome").textContent = `$${income.toFixed(2)}`;
  document.getElementById("monthExpense").textContent = `$${expense.toFixed(2)}`;

  const balanceEl = document.getElementById("monthBalance");
  balanceEl.textContent = `$${balance.toFixed(2)}`;
  balanceEl.className = `summary-value ${balance < 0 ? "gasto" : balance > 0 ? "ingreso" : "neutral"}`;
}

export function renderCalendar() {
  updateHeaderTitle();
  renderMonthSummary();

  const grid = document.getElementById("calendarGrid");
  const transactions = getTransactions();
  grid.innerHTML = "";

  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayTransactions = transactions[dateKey] || [];

    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    if (isToday(currentYear, currentMonth, day)) {
      cell.classList.add("today");
    }

    if (selectedDate === dateKey) {
      cell.classList.add("selected-day");
    }

    cell.addEventListener("click", () => openTransactionPopup(dateKey));

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;

    const transactionContainer = document.createElement("div");
    transactionContainer.className = "day-transactions";

    let total = 0;

    dayTransactions.slice(0, 3).forEach((tx) => {
      const item = document.createElement("div");
      item.className = `transaction-item ${tx.tipo}`;
      item.textContent = `${tx.titulo}: $${Number(tx.cantidad).toFixed(2)}`;
      transactionContainer.appendChild(item);

      total += tx.tipo === "ingreso" ? Number(tx.cantidad) : -Number(tx.cantidad);
    });

    const summary = document.createElement("div");
    summary.className = "transaction-summary";
    if (dayTransactions.length > 0) {
      summary.textContent = `Total: $${total.toFixed(2)}`;
    }

    cell.appendChild(dayNumber);
    cell.appendChild(transactionContainer);
    cell.appendChild(summary);
    grid.appendChild(cell);
  }
}

export function renderListView() {
  updateHeaderTitle();
  renderMonthSummary();

  const container = document.getElementById("listContainer");
  const transactions = getTransactions();
  container.innerHTML = "";

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const monthDays = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayTransactions = transactions[dateKey] || [];

    if (dayTransactions.length > 0) {
      monthDays.push({ day, dateKey, transactions: dayTransactions });
    }
  }

  if (monthDays.length === 0) {
    container.innerHTML = '<div class="list-empty">No hay pagos ni cobros registrados en este mes.</div>';
    return;
  }

  monthDays.forEach(({ day, dateKey, transactions: dayTransactions }) => {
    const date = parseDateKey(dateKey);
    const weekday = getWeekdayName(date);

    const group = document.createElement("div");
    group.className = "list-day-group";

    const header = document.createElement("div");
    header.className = "list-day-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "list-day-header-left";

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

    dayTransactions.forEach((tx, index) => {
      const card = document.createElement("div");
      card.className = `list-card ${tx.tipo}`;

      const left = document.createElement("div");
      left.className = "list-card-left";

      const cardTitle = document.createElement("div");
      cardTitle.className = "list-card-title";
      cardTitle.textContent = tx.titulo || "Movimiento";

      const cardSubtitle = document.createElement("div");
      cardSubtitle.className = "list-card-subtitle";
      const subtitleParts = [tx.tipo === "ingreso" ? "Cobro" : "Pago"];
      if (tx.categoria) subtitleParts.push(tx.categoria);
      if (tx.descripcion) subtitleParts.push(tx.descripcion);
      cardSubtitle.textContent = subtitleParts.join(" • ");

      const amount = document.createElement("div");
      amount.className = "list-card-amount";
      amount.textContent = tx.tipo === "ingreso"
        ? `+$${Number(tx.cantidad).toFixed(2)}`
        : `-$${Number(tx.cantidad).toFixed(2)}`;

      const right = document.createElement("div");
      right.className = "list-card-right";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Borrar";
      deleteBtn.addEventListener("click", () => {
        const confirmed = confirm("¿Seguro que deseas borrar este movimiento?");
        if (!confirmed) return;
        removeTransaction(dateKey, index);
        renderCurrentView();
      });

      left.appendChild(cardTitle);
      left.appendChild(cardSubtitle);
      right.appendChild(amount);
      right.appendChild(deleteBtn);
      card.appendChild(left);
      card.appendChild(right);
      items.appendChild(card);

      total += tx.tipo === "ingreso" ? Number(tx.cantidad) : -Number(tx.cantidad);
    });

    const totalEl = document.createElement("div");
    totalEl.className = "day-total";
    totalEl.innerHTML = `Balance del día: <strong>$${total.toFixed(2)}</strong>`;

    group.appendChild(header);
    group.appendChild(items);
    group.appendChild(totalEl);
    container.appendChild(group);
  });
}

export function addCategory() {
  const titleInput = document.getElementById("catTitulo");
  const budgetInput = document.getElementById("catBudget");
  const title = titleInput.value.trim();
  const budgetValue = budgetInput.value.trim();

  if (!title) return;

  const categories = getCategories();
  if (categories.some((category) => category.name.toLowerCase() === title.toLowerCase())) {
    alert("Ya existe una categoría con ese nombre.");
    return;
  }

  categories.push({
    name: title,
    budget: budgetValue === "" ? 0 : Number(budgetValue)
  });

  saveCategories(categories);
  titleInput.value = "";
  budgetInput.value = "";
  closeCategoryPopup();
  renderCategories();
  updateCategorySelect();
}

export function deleteCategory(categoryName) {
  const confirmed = confirm(`¿Seguro que deseas borrar la categoría "${categoryName}"?`);
  if (!confirmed) return;

  removeCategory(categoryName);
  renderCategories();
  updateCategorySelect();
}

export function renderCategories() {
  const categories = buildCategoryStats();
  const list = document.getElementById("categoryList");
  list.innerHTML = "";

  if (categories.length === 0) {
    list.innerHTML = '<div class="item">No hay categorías todavía.</div>';
    return;
  }

  categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "item-row";

    const box = document.createElement("div");
    box.className = "item";

    const content = document.createElement("div");
    content.className = "item-content";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = category.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";

    meta.appendChild(createBadge(`Budget: $${category.budget.toFixed(2)}`, "budget-badge"));
    meta.appendChild(createBadge(`Gastado: $${category.spent.toFixed(2)}`, "spent-badge"));
    meta.appendChild(createBadge(`Restante: $${category.remaining.toFixed(2)}`, "remaining-badge"));
    meta.appendChild(createBadge(category.status.text, `status-badge ${category.status.className}`));

    content.appendChild(title);
    content.appendChild(meta);
    box.appendChild(content);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn small-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Borrar";
    deleteBtn.addEventListener("click", () => deleteCategory(category.name));

    row.appendChild(box);
    row.appendChild(deleteBtn);
    list.appendChild(row);
  });
}

export function addPeriod() {
  const startInput = document.getElementById("periodStart");
  const endInput = document.getElementById("periodEnd");
  const budgetInput = document.getElementById("periodBudget");

  const start = startInput.value;
  const end = endInput.value;
  const budget = budgetInput.value.trim();

  if (!start || !end) {
    alert("Debes escoger fecha inicial y final.");
    return;
  }

  if (start > end) {
    alert("La fecha inicial no puede ser mayor que la final.");
    return;
  }

  const periods = getPeriods();
  periods.push({
    start,
    end,
    budget: budget === "" ? 0 : Number(budget)
  });

  savePeriods(periods);
  startInput.value = "";
  endInput.value = "";
  budgetInput.value = "";
  closePeriodPopup();
  renderPeriods();
}

export function deletePeriod(index) {
  const confirmed = confirm("¿Seguro que deseas borrar este periodo?");
  if (!confirmed) return;

  removePeriodByIndex(index);
  renderPeriods();
}

export function renderPeriods() {
  const periods = buildPeriodStats();
  const list = document.getElementById("periodList");
  list.innerHTML = "";

  if (periods.length === 0) {
    list.innerHTML = '<div class="item">No hay periodos todavía.</div>';
    return;
  }

  periods.forEach((period, index) => {
    const row = document.createElement("div");
    row.className = "item-row";

    const box = document.createElement("div");
    box.className = "item";

    const content = document.createElement("div");
    content.className = "item-content";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${period.start} → ${period.end}`;

    const meta = document.createElement("div");
    meta.className = "item-meta";

    meta.appendChild(createBadge(`Budget: $${period.budget.toFixed(2)}`, "budget-badge"));
    meta.appendChild(createBadge(`Gastado: $${period.spent.toFixed(2)}`, "spent-badge"));
    meta.appendChild(createBadge(`Restante: $${period.remaining.toFixed(2)}`, "remaining-badge"));
    meta.appendChild(createBadge(period.status.text, `status-badge ${period.status.className}`));

    content.appendChild(title);
    content.appendChild(meta);
    box.appendChild(content);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn small-delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Borrar";
    deleteBtn.addEventListener("click", () => deletePeriod(index));

    row.appendChild(box);
    row.appendChild(deleteBtn);
    list.appendChild(row);
  });
}

function createBadge(text, className) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

export function updateCategorySelect() {
  const select = document.getElementById("categoriaSelect");
  select.innerHTML = '<option value="">Seleccionar categoría</option>';

  getCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = `${category.name} · Budget $${Number(category.budget || 0).toFixed(2)}`;
    select.appendChild(option);
  });
}

export function addTransaction() {
  const categoria = document.getElementById("categoriaSelect").value;
  const descripcion = document.getElementById("descripcion").value.trim();
  const cantidad = document.getElementById("cantidad").value;
  const tipo = document.getElementById("tipoMovimiento").value;

  if (!selectedDate || !cantidad) return;

  const titulo = categoria || descripcion || "Movimiento";
  const transactions = getTransactions();

  if (!transactions[selectedDate]) {
    transactions[selectedDate] = [];
  }

  transactions[selectedDate].push({
    titulo,
    categoria,
    descripcion,
    cantidad: Number(cantidad),
    tipo
  });

  saveTransactions(transactions);
  clearTransactionForm();
  closeTransactionPopup();
  renderCategories();
  renderPeriods();
  renderCurrentView();
}

function clearTransactionForm() {
  document.getElementById("categoriaSelect").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("cantidad").value = "";
  document.getElementById("tipoMovimiento").value = "gasto";
}

export function initUI() {
  updateCategorySelect();
  renderCategories();
  renderPeriods();
  renderCurrentView();
}

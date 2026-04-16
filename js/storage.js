function normalizeCategory(raw) {
  if (typeof raw === "string") {
    return { name: raw, budget: 0 };
  }

  return {
    name: String(raw?.name || "Sin nombre"),
    budget: Number(raw?.budget || 0)
  };
}

function normalizePeriod(raw) {
  if (typeof raw === "string") {
    const [start = "", end = ""] = raw.split(" - ");
    return { start, end, budget: 0 };
  }

  return {
    start: String(raw?.start || ""),
    end: String(raw?.end || ""),
    budget: Number(raw?.budget || 0)
  };
}

export function getCategories() {
  const categories = JSON.parse(localStorage.getItem("categorias")) || [];
  return categories.map(normalizeCategory);
}

export function saveCategories(categories) {
  localStorage.setItem("categorias", JSON.stringify(categories.map(normalizeCategory)));
}

export function getPeriods() {
  const periods = JSON.parse(localStorage.getItem("periods")) || [];
  return periods.map(normalizePeriod);
}

export function savePeriods(periods) {
  localStorage.setItem("periods", JSON.stringify(periods.map(normalizePeriod)));
}

export function getTransactions() {
  return JSON.parse(localStorage.getItem("transactions")) || {};
}

export function saveTransactions(transactions) {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

export function removeCategory(categoryName) {
  const categories = getCategories().filter((category) => category.name !== categoryName);
  saveCategories(categories);
}

export function removePeriodByIndex(index) {
  const periods = getPeriods();
  periods.splice(index, 1);
  savePeriods(periods);
}

export function removeTransaction(dateKey, transactionIndex) {
  const transactions = getTransactions();

  if (!transactions[dateKey]) return;

  transactions[dateKey].splice(transactionIndex, 1);

  if (transactions[dateKey].length === 0) {
    delete transactions[dateKey];
  }

  saveTransactions(transactions);
}

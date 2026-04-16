import {
  openCategoryPopup,
  closeCategoryPopup,
  openPeriodPopup,
  closePeriodPopup,
  closeTransactionPopup,
  addCategory,
  addPeriod,
  addTransaction,
  goToPreviousMonth,
  goToNextMonth,
  switchToCalendarView,
  switchToListView,
  initUI
} from "./ui.js";

function setupEventListeners() {
  document.getElementById("openCategoryBtn").addEventListener("click", openCategoryPopup);
  document.getElementById("closeCategoryBtn").addEventListener("click", closeCategoryPopup);
  document.getElementById("addCategoryBtn").addEventListener("click", addCategory);

  document.getElementById("openPeriodBtn").addEventListener("click", openPeriodPopup);
  document.getElementById("closePeriodBtn").addEventListener("click", closePeriodPopup);
  document.getElementById("addPeriodBtn").addEventListener("click", addPeriod);

  document.getElementById("closeTransactionBtn").addEventListener("click", closeTransactionPopup);
  document.getElementById("addTransactionBtn").addEventListener("click", addTransaction);

  document.getElementById("prevMonthBtn").addEventListener("click", goToPreviousMonth);
  document.getElementById("nextMonthBtn").addEventListener("click", goToNextMonth);

  document.getElementById("calendarViewBtn").addEventListener("click", switchToCalendarView);
  document.getElementById("listViewBtn").addEventListener("click", switchToListView);
}

function init() {
  setupEventListeners();
  initUI();
}

window.addEventListener("DOMContentLoaded", init);

/**
 * GitУчебник — общий скрипт.
 * Здесь только инфраструктура страницы: тема.
 * Логика уроков будет добавлена отдельно (lessons/).
 */

(function () {
  "use strict";

  var STORAGE_KEY = "git-tutorial:theme";
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  /* ---------- Тема ---------- */

  function getStoredTheme() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (err) {
      return null;
    }
  }

  function getPreferredTheme() {
    if (typeof window.matchMedia !== "function") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    var isDark = theme === "dark";

    root.setAttribute("data-theme", theme);
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", isDark ? "Тёмная тема" : "Светлая тема");
      toggle.setAttribute("title", isDark ? "Тёмная тема" : "Светлая тема");

      var label = toggle.querySelector(".theme-label");
      if (label) label.textContent = isDark ? "Тёмная" : "Светлая";
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0e1013" : "#fbfbf9");
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* localStorage может быть недоступен — тема просто не запомнится. */
    }
  }

  function initTheme() {
    applyTheme(getStoredTheme() || getPreferredTheme());

    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      saveTheme(next);
    });
  }

  /* Следим за системной темой, пока пользователь не выбрал свою. */
  function watchSystemTheme() {
    if (typeof window.matchMedia !== "function") return;

    var query = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function (event) {
      if (getStoredTheme()) return;
      applyTheme(event.matches ? "dark" : "light");
    };

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
    } else if (typeof query.addListener === "function") {
      query.addListener(onChange);
    }
  }

  /* ---------- Переход к уроку ---------- */

  /*
   * Карточка урока — это ссылка (<a href>), поэтому переход работает и без JS.
   * Обработчик нужен как единая точка для будущей логики (прогресс, аналитика)
   * и чтобы клик по всей площади карточки вёл на урок.
   */
  function initLessonList() {
    var list = document.getElementById("lesson-list");
    if (!list) return;

    list.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;

      var card = target.closest("[data-lesson-link]");
      if (!card) return;
      if (card.getAttribute("aria-disabled") === "true") return;
      /* Не перехватываем клики с модификаторами: пусть браузер откроет новую вкладку. */
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var href = card.getAttribute("href") || card.getAttribute("data-href");
      if (!href) return;

      event.preventDefault();
      window.location.href = href;
    });
  }

  function init() {
    initTheme();
    watchSystemTheme();
    initLessonList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/**
 * GitУчебник — глобальный движок симулятора.
 *
 * Терминал, виртуальный gitState, дашборд и сохранение прогресса живут здесь.
 * Страницы уроков только подключают этот файл и дают свою теорию.
 *
 * Прогресс хранится в localStorage под ключом "git-tutorial:state"
 * и переживает переходы между уроками и перезагрузку страницы.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "git-tutorial:state";
  const PROGRESS_VERSION = 2;
  const STATUSES = ["untracked", "modified", "staged", "committed"];

  /*
   * Конфигурация уроков: какие команды доступны и какие цели нужно выполнить.
   * ID урока страница передаёт через data-lesson-id на <body>.
   */
  const lessonsConfig = {
    "lesson-1": {
      version: 2,
      allowed: ["help", "clear", "git config", "git init", "git status"],
      goals: [
        {
          id: "config-name",
          label: 'Настроить имя автора (git config user.name "Student")',
          command: 'git config --global user.name "Student"'
        },
        {
          id: "config-email",
          label: "Настроить email автора (git config user.email)",
          command: 'git config --global user.email "student@example.com"'
        },
        { id: "init", label: "Создать репозиторий (git init)", command: "git init" },
        { id: "status", label: "Проверить статус (git status)", command: "git status" }
      ]
    },
    "lesson-2": {
      version: 3,
      needsInit: true,
      allowed: [
        "help",
        "clear",
        "touch",
        "ls",
        "git status",
        "git add",
        "git init"
      ],
      blockedMessage: "Недоступно в этом уроке.",
      blockedTone: "error",
      goals: [
        {
          id: "touch",
          label: "Создать файл about.html (команда touch)",
          command: "touch about.html"
        },
        {
          id: "status-untracked",
          label: "Проверить статус: файл в Untracked (команда git status)",
          command: "git status"
        },
        {
          id: "add",
          label: "Добавить файл в индекс (команда git add)",
          command: "git add about.html"
        },
        {
          id: "status-staged",
          label: "Проверить статус: файл в Staged (команда git status)",
          command: "git status"
        }
      ]
    },
    "lesson-3": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "touch",
        "ls",
        "git status",
        "git add",
        "git commit"
      ],
      goals: [
        {
          id: "add-index",
          label: "Подготовить index.html к коммиту (команда git add)",
          command: "git add index.html"
        },
        {
          id: "commit",
          label: 'Создать первый коммит с сообщением "Add index.html" (команда git commit)',
          command: 'git commit -m "Add index.html"'
        },
        {
          id: "status-clean",
          label: "Убедиться, что рабочая директория чиста (команда git status)",
          command: "git status"
        }
      ]
    },
    "lesson-4": {
      version: 2,
      allowed: [
        "help",
        "clear",
        "git status",
        "git remote add",
        "git push",
        "git fetch",
        "git pull"
      ],
      goals: [
        {
          id: "remote-add",
          label: "Связать проект с GitHub (команда git remote add)",
          command: "git remote add origin https://github.com/user/project.git"
        },
        {
          id: "push",
          label: "Отправить коммиты на GitHub (команда git push -u origin master)",
          command: "git push -u origin master"
        },
        {
          id: "colleague",
          label: "Симуляция: коллега запушил новый коммит",
          auto: true,
          hint: "Коллега только что запушил новый коммит на GitHub",
          effect: "colleague-commit"
        },
        {
          id: "pull",
          label: "Скачать и применить изменения (команда git pull origin master)",
          command: "git pull origin master"
        }
      ]
    },
    "lesson-5": {
      version: 1,
      allowed: ["help", "clear", "git branch", "git checkout", "git status"],
      goals: [
        {
          id: "branch-feature",
          label: "Создать ветку feature (команда git branch)",
          command: "git branch feature"
        },
        {
          id: "checkout-feature",
          label: "Переключиться на ветку feature (команда git checkout)",
          command: "git checkout feature"
        },
        {
          id: "status-feature",
          label: "Убедиться, что вы на ветке feature (команда git status)",
          command: "git status"
        }
      ]
    },
    "lesson-6": {
      version: 1,
      allowed: ["help", "clear", "git checkout", "git merge", "git status"],
      goals: [
        {
          id: "checkout-master",
          label: "Вернуться в главную ветку master (команда git checkout)",
          command: "git checkout master"
        },
        {
          id: "merge-feature",
          label: "Слить ветку feature в master (команда git merge)",
          command: "git merge feature"
        }
      ]
    }
  };

  /* Старые сохранения хранили просто массив строк. */
  const LEGACY_GOAL_IDS = {
    "git init": "init",
    "git status": "status"
  };

  /* ---------- Состояние виртуального репозитория ---------- */

  function defaultState() {
    return {
      initialized: false,
      branch: "master",
      branches: ["master"],
      user: {
        name: "",
        email: ""
      },
      files: {
        "index.html": "untracked"
      },
      commits: [],
      remote: {
        url: "",
        commits: []
      }
    };
  }

  function isCommit(value) {
    return (
      value &&
      typeof value === "object" &&
      typeof value.hash === "string" &&
      typeof value.message === "string" &&
      Array.isArray(value.files) &&
      value.files.every(function (name) {
        return typeof name === "string";
      })
    );
  }

  function sanitizeFiles(rawFiles) {
    if (!rawFiles || typeof rawFiles !== "object" || Array.isArray(rawFiles)) {
      return null;
    }

    const files = {};

    Object.keys(rawFiles).forEach(function (name) {
      if (STATUSES.indexOf(rawFiles[name]) !== -1) {
        files[name] = rawFiles[name];
      }
    });

    return files;
  }

  function sanitizeCommits(rawCommits) {
    if (!Array.isArray(rawCommits)) return [];

    return rawCommits.filter(isCommit).map(function (commit) {
      return {
        hash: commit.hash,
        message: commit.message,
        files: commit.files.slice(),
        merge: commit.merge === true
      };
    });
  }

  function sanitizeStringArray(value) {
    if (!Array.isArray(value)) return [];

    const result = [];

    value.forEach(function (item) {
      if (typeof item === "string" && result.indexOf(item) === -1) {
        result.push(item);
      }
    });

    return result;
  }

  function parseGoals(raw) {
    try {
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map(function (value, index) {
          if (typeof value !== "string") return null;
          return {
            id: "goal-" + index,
            label: value,
            command: value
          };
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function sanitizeProgress(parsed) {
    const progress = {};

    if (
      parsed.progress &&
      typeof parsed.progress === "object" &&
      !Array.isArray(parsed.progress)
    ) {
      Object.keys(parsed.progress).forEach(function (lessonId) {
        const entry = parsed.progress[lessonId];
        if (!entry || typeof entry !== "object") return;

        progress[lessonId] = {
          version: typeof entry.version === "number" ? entry.version : 0,
          completed: sanitizeStringArray(entry.completed)
        };
      });

      return progress;
    }

    /* Совместимость со старым общим completedGoals: переносим прогресс урока 1. */
    const legacy = sanitizeStringArray(parsed.completedGoals)
      .map(function (goal) {
        return LEGACY_GOAL_IDS[goal];
      })
      .filter(Boolean);

    if (legacy.length) {
      progress["lesson-1"] = {
        version: 1,
        completed: legacy
      };
    }

    return progress;
  }

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      /* Старая структура прогресса: сбрасываем сохранение целиком. */
      if (parsed.version !== PROGRESS_VERSION) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          /* ignore */
        }
        return null;
      }

      /* Новый формат — { version, state, progress }. */
      const stateRaw =
        parsed.state && typeof parsed.state === "object" ? parsed.state : parsed;

      const files = sanitizeFiles(stateRaw.files);
      if (!files) return null;

      const remote =
        stateRaw.remote && typeof stateRaw.remote === "object"
          ? stateRaw.remote
          : {};

      const branchesRaw = Array.isArray(stateRaw.branches)
        ? stateRaw.branches.filter(function (name) {
            return typeof name === "string" && name;
          })
        : [];
      const branch =
        typeof stateRaw.branch === "string" && stateRaw.branch
          ? stateRaw.branch
          : "master";

      const userRaw =
        stateRaw.user && typeof stateRaw.user === "object" ? stateRaw.user : {};

      if (branchesRaw.indexOf(branch) === -1) branchesRaw.push(branch);
      if (!branchesRaw.length) branchesRaw.push("master");

      return {
        state: {
          initialized: stateRaw.initialized === true,
          branch: branch,
          branches: branchesRaw,
          user: {
            name: typeof userRaw.name === "string" ? userRaw.name : "",
            email: typeof userRaw.email === "string" ? userRaw.email : ""
          },
          files: files,
          commits: sanitizeCommits(stateRaw.commits),
          remote: {
            url: typeof remote.url === "string" ? remote.url : "",
            commits: sanitizeCommits(remote.commits)
          }
        },
        progress: sanitizeProgress(parsed)
      };
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: PROGRESS_VERSION,
          state: gitState,
          progress: progress
        })
      );
    } catch (error) {
      /* localStorage может быть недоступен — прогресс просто не сохранится. */
    }
  }

  const storedProgress = loadProgress();

  let gitState = storedProgress ? storedProgress.state : defaultState();
  let progress = storedProgress ? storedProgress.progress : {};
  let completedGoals = [];

  const HOME_PROMPT = "user@git-tutorial:~$";

  const HELP_LABELS = {
    "help": "help",
    "clear": "clear",
    "git init": "git init",
    "git status": "git status",
    "touch": "touch <file>",
    "git add": "git add <file> / git add .",
    "ls": "ls",
    "git commit": 'git commit -m "..."',
    "git remote add": "git remote add origin <url>",
    "git push": "git push",
    "git fetch": "git fetch",
    "git pull": "git pull origin master",
    "git config": "git config --global user.name / user.email",
    "git branch": "git branch <name>",
    "git checkout": "git checkout <branch>",
    "git merge": "git merge <branch>"
  };

  const STATUS_ERROR =
    "fatal: not a git repository (or any of the parent directories): .git.";

  /* ---------- Иконки проводника ---------- */

  const FILE_ICON =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M4 1.9h5l3 3v9.2H4z"></path><path d="M9 1.9v3h3"></path></svg>';

  const USER_ICON =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linecap="round" aria-hidden="true" focusable="false">' +
    '<circle cx="8" cy="5.2" r="2.5"></circle>' +
    '<path d="M3 13.6c.5-2.7 2.5-4 5-4s4.5 1.3 5 4"></path></svg>';

  const FILE_COLORS = {
    html: "#c9502e",
    css: "#2563eb",
    js: "#b45309",
    md: "#6b7280",
    json: "#b45309"
  };

  /* ---------- Сброс прогресса ---------- */

  const RESET_CONFIRM =
    "Вы уверены, что хотите сбросить весь прогресс? Все ваши коммиты и файлы будут удалены.";

  function resetProgress(skipConfirm) {
    if (!skipConfirm) {
      const confirmed = window.confirm(RESET_CONFIRM);
      if (!confirmed) return;
    }

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* Если localStorage недоступен, чистить нечего. */
    }

    const inLessons = document.body.classList.contains("page-lesson");
    window.location.href = inLessons ? "../index.html" : "index.html";
  }

  function initResetButtons() {
    document.querySelectorAll("[data-reset-progress]").forEach(function (button) {
      button.addEventListener("click", function () {
        resetProgress(false);
      });
    });

    document
      .querySelectorAll("[data-reset-progress-silent]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          resetProgress(true);
        });
      });
  }

  initResetButtons();

  /* ---------- Элементы ---------- */

  const terminal = document.querySelector("[data-terminal]");
  if (!terminal) return;

  const history = terminal.querySelector("[data-terminal-history]");
  const input = terminal.querySelector("[data-terminal-input]");
  const promptLabel = terminal.querySelector("[data-terminal-prompt]");

  if (!history || !input) return;

  const lists = {
    workdir: document.querySelector('[data-list="workdir"]'),
    staged: document.querySelector('[data-list="staged"]'),
    repo: document.querySelector('[data-list="repo"]'),
    remote: document.querySelector('[data-list="remote"]')
  };

  const counters = {
    workdir: document.querySelector('[data-count="workdir"]'),
    staged: document.querySelector('[data-count="staged"]'),
    repo: document.querySelector('[data-count="repo"]'),
    remote: document.querySelector('[data-count="remote"]')
  };

  const userChip = document.querySelector("[data-user]");
  const remoteUrlLabel = document.querySelector("[data-remote-url]");

  /* ---------- Контекст урока ---------- */

  const lessonId = document.body.getAttribute("data-lesson-id") || "";
  const lessonConfig = lessonsConfig[lessonId] || null;

  /*
   * allowed === null означает «без ограничений» — так движок ведёт себя
   * на шаблоне и страницах без конфигурации урока.
   */
  const allowedCommands = lessonConfig ? lessonConfig.allowed.slice() : null;
  const lessonGoals = lessonConfig
    ? lessonConfig.goals.slice()
    : parseGoals(document.body.getAttribute("data-lesson-goals"));

  const nextButton = document.querySelector("[data-next-lesson]");
  const tasksList = document.querySelector("[data-tasks]");
  const tasksCount = document.querySelector("[data-tasks-count]");

  let completionAnnounced = false;

  /* ---------- Приглашение ---------- */

  function currentPrompt() {
    if (!gitState.initialized) return HOME_PROMPT;

    return (
      "user@git-tutorial:~/project (" + gitState.branch + ")$"
    );
  }

  function updatePrompt() {
    if (promptLabel) promptLabel.textContent = currentPrompt();
  }

  function updateBranchIndicators() {
    document.querySelectorAll("[data-branch]").forEach(function (node) {
      node.textContent = gitState.branch;
      node.hidden = !gitState.initialized;
    });
  }

  function updateUserChip() {
    if (!userChip) return;

    const name = gitState.user && gitState.user.name ? gitState.user.name : "";

    userChip.hidden = !name;

    const nameNode = userChip.querySelector("[data-user-name]");
    const avatarNode = userChip.querySelector("[data-user-avatar]");

    if (nameNode) nameNode.textContent = name;
    if (avatarNode) avatarNode.textContent = name ? name.charAt(0).toUpperCase() : "?";
  }

  /* ---------- Вывод в терминал ---------- */

  const TONE_CLASS = {
    error: "terminal-error",
    success: "terminal-success",
    muted: "terminal-muted",
    warn: "terminal-warn",
    note: "terminal-note"
  };

  /* Учебная подсказка: команда в реальном Git молчит, но нам есть что сказать. */
  function note(text) {
    return { text: "[Учебная подсказка]: " + text, tone: "note" };
  }

  function makeLine(item) {
    const text = typeof item === "string" ? item : item.text;
    const tone = typeof item === "string" ? null : item.tone;

    const p = document.createElement("p");
    p.className = "terminal-line terminal-output";
    if (tone && TONE_CLASS[tone]) p.className += " " + TONE_CLASS[tone];
    p.textContent = text;
    return p;
  }

  function appendEntry(command, outputLines, promptText) {
    const entry = document.createElement("div");
    entry.className = "terminal-entry";

    const echo = document.createElement("p");
    echo.className = "terminal-line terminal-echo";

    const prompt = document.createElement("span");
    prompt.className = "terminal-prompt";
    prompt.textContent = promptText;

    const cmd = document.createElement("span");
    cmd.className = "terminal-cmd";
    cmd.textContent = command;

    echo.appendChild(prompt);
    echo.appendChild(document.createTextNode(" "));
    echo.appendChild(cmd);
    entry.appendChild(echo);

    (outputLines || []).forEach(function (line) {
      entry.appendChild(makeLine(line));
    });

    history.appendChild(entry);
  }

  function scrollToBottom() {
    history.scrollTop = history.scrollHeight;
  }

  function helpLines() {
    const entries = allowedCommands || Object.keys(HELP_LABELS);
    const lines = [{ text: "Доступные команды:" }];

    entries.forEach(function (entry) {
      lines.push({ text: "  " + (HELP_LABELS[entry] || entry) });
    });

    return lines;
  }

  /* ---------- Учебные цели ---------- */

  function normalizeCommand(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function isCommandAllowed(command) {
    if (!allowedCommands) return true;

    const normalized = normalizeCommand(command);

    return allowedCommands.some(function (entry) {
      const allowed = normalizeCommand(entry);
      return (
        normalized === allowed || normalized.indexOf(allowed + " ") === 0
      );
    });
  }

  function nextGoal() {
    for (let i = 0; i < lessonGoals.length; i += 1) {
      if (completedGoals.indexOf(lessonGoals[i].id) === -1) {
        return lessonGoals[i];
      }
    }

    return null;
  }

  function runGoalEffect(effect) {
    if (effect !== "colleague-commit") return;

    const file = Object.keys(gitState.files)[0] || "index.html";

    gitState.remote.commits.push({
      hash: makeHash(),
      message: "Fix typo in " + file,
      files: [file]
    });
  }

  function completeAutoGoals() {
    let goal = nextGoal();

    while (goal && goal.auto) {
      completedGoals.push(goal.id);
      if (goal.hint) printNotice([note(goal.hint)]);
      if (goal.effect) runGoalEffect(goal.effect);
      goal = nextGoal();
    }
  }

  /* Цели выполняются строго по порядку: закрываем только следующую. */
  function completeGoalsFor(command) {
    const goal = nextGoal();

    if (
      goal &&
      !goal.auto &&
      normalizeCommand(command) === normalizeCommand(goal.command)
    ) {
      completedGoals.push(goal.id);
    }

    completeAutoGoals();
  }

  function isFailedCommand(lines) {
    return (lines || []).some(function (line) {
      const text = typeof line === "string" ? line : line.text;
      return /^(fatal|error|touch:|\*\*\*)/.test(text);
    });
  }

  function renderTasks() {
    if (!tasksList) return;

    tasksList.textContent = "";

    let done = 0;

    lessonGoals.forEach(function (goal) {
      const isDone = completedGoals.indexOf(goal.id) !== -1;
      if (isDone) done += 1;

      const item = document.createElement("li");
      item.className = isDone ? "task is-done" : "task";

      const check = document.createElement("span");
      check.className = "task-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = isDone ? "✓" : "";
      item.appendChild(check);

      const label = document.createElement("span");
      label.className = "task-label";
      label.textContent = goal.label;
      item.appendChild(label);

      tasksList.appendChild(item);
    });

    if (tasksCount) {
      tasksCount.textContent = done + "/" + lessonGoals.length;
    }
  }

  function ensureLessonProgress() {
    if (!lessonId || !lessonConfig) {
      completedGoals = [];
      return;
    }

    const entry = progress[lessonId];

    /* Версия конфигурации изменилась — сбрасываем только прогресс этого урока. */
    if (!entry || entry.version !== lessonConfig.version) {
      progress[lessonId] = {
        version: lessonConfig.version,
        completed: []
      };
    }

    const current = progress[lessonId];
    const validIds = lessonGoals.map(function (goal) {
      return goal.id;
    });

    current.completed = current.completed.filter(function (id) {
      return validIds.indexOf(id) !== -1;
    });

    completedGoals = current.completed;
  }

  function printNotice(lines) {
    const entry = document.createElement("div");
    entry.className = "terminal-entry";

    lines.forEach(function (line) {
      entry.appendChild(makeLine(line));
    });

    history.appendChild(entry);
    scrollToBottom();
  }

  function unlockNextButton() {
    if (!nextButton) return;

    const target = nextButton.getAttribute("data-next-lesson");
    if (!target) return;

    nextButton.disabled = false;
    nextButton.classList.remove("btn--locked");
    nextButton.removeAttribute("title");

    if (!nextButton.dataset.bound) {
      nextButton.dataset.bound = "true";
      nextButton.addEventListener("click", function () {
        window.location.href = target;
      });
    }
  }

  function allGoalsDone() {
    if (!lessonGoals.length) return false;

    return lessonGoals.every(function (goal) {
      return completedGoals.indexOf(goal.id) !== -1;
    });
  }

  function checkLessonCompletion(options) {
    const silent = options && options.silent;

    if (!allGoalsDone()) return false;

    unlockNextButton();

    if (silent) {
      completionAnnounced = true;
      return true;
    }

    if (!completionAnnounced) {
      completionAnnounced = true;

      const hasNext =
        nextButton !== null && nextButton.hasAttribute("data-next-lesson");

      printNotice([
        {
          text: hasNext
            ? "🎉 Отлично! Вы выполнили все задачи урока. Теперь вы можете перейти к следующему уроку."
            : "🎉 Отлично! Вы выполнили все задачи урока.",
          tone: "success"
        }
      ]);
    }

    return true;
  }

  /* ---------- Дашборд ---------- */

  function fileColor(name) {
    const ext = name.split(".").pop().toLowerCase();
    return FILE_COLORS[ext] || "#64748b";
  }

  function makeIcon(color) {
    const span = document.createElement("span");
    span.className = "file-icon";
    span.setAttribute("aria-hidden", "true");
    span.style.color = color;
    span.innerHTML = FILE_ICON;
    return span;
  }

  function renderFileList(listEl, items, emptyText) {
    if (!listEl) return;

    listEl.textContent = "";

    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "explorer-empty";
      empty.textContent = emptyText;
      listEl.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      const row = document.createElement("li");
      row.className = "file-row";

      row.appendChild(makeIcon(fileColor(item.name)));

      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = item.name;
      name.title = item.name;
      row.appendChild(name);

      const badge = document.createElement("span");
      badge.className = "file-badge";
      badge.dataset.status = item.status;

      if (item.status === "committed") {
        badge.textContent = "✓";
        badge.title = "committed";
        badge.setAttribute("aria-label", "закоммичен");
      } else {
        badge.textContent = item.status;
      }

      row.appendChild(badge);

      listEl.appendChild(row);
    });
  }

  function isPushed(hash) {
    return gitState.remote.commits.some(function (commit) {
      return commit.hash === hash;
    });
  }

  function renderCommitList() {
    const list = lists.repo;
    if (!list) return;

    list.textContent = "";

    if (!gitState.commits.length) {
      const empty = document.createElement("li");
      empty.className = "explorer-empty";
      empty.textContent = "Коммитов пока нет";
      list.appendChild(empty);
      return;
    }

    /* Новые коммиты сверху — как в git log. */
    gitState.commits
      .slice()
      .reverse()
      .forEach(function (commit) {
        const card = document.createElement("li");
        card.className = "commit-card";

        const top = document.createElement("div");
        top.className = "commit-top";

        const hash = document.createElement("code");
        hash.className = "commit-hash";
        hash.textContent = commit.hash;
        top.appendChild(hash);

        if (commit.merge) {
          const merge = document.createElement("span");
          merge.className = "commit-merge";
          merge.textContent = "merge";
          top.appendChild(merge);
        }

        if (isPushed(commit.hash)) {
          const pushed = document.createElement("span");
          pushed.className = "commit-pushed";
          pushed.textContent = "✓ pushed";
          top.appendChild(pushed);
        }

        card.appendChild(top);

        const message = document.createElement("p");
        message.className = "commit-message";
        message.textContent = commit.message;
        message.title = commit.message;
        card.appendChild(message);

        const files = document.createElement("div");
        files.className = "commit-files";
        commit.files.forEach(function (name) {
          const file = document.createElement("span");
          file.className = "commit-file";
          file.appendChild(makeIcon(fileColor(name)));

          const label = document.createElement("span");
          label.textContent = name;
          file.appendChild(label);

          files.appendChild(file);
        });
        card.appendChild(files);

        list.appendChild(card);
      });
  }

  function renderRemoteList() {
    const list = lists.remote;
    if (!list) return;

    list.textContent = "";

    if (!gitState.remote.commits.length) {
      const empty = document.createElement("li");
      empty.className = "gh-empty";
      empty.textContent = gitState.remote.url
        ? "Коммиты ещё не отправлены — выполните git push."
        : "origin не настроен — выполните git remote add origin <url>.";
      list.appendChild(empty);
    } else {
      /* На GitHub новые коммиты тоже сверху. */
      gitState.remote.commits
        .slice()
        .reverse()
        .forEach(function (commit) {
          const row = document.createElement("li");
          row.className = "gh-commit";

          const avatar = document.createElement("span");
          avatar.className = "gh-avatar gh-avatar--sm";
          avatar.setAttribute("aria-hidden", "true");
          avatar.innerHTML = USER_ICON;
          row.appendChild(avatar);

          const main = document.createElement("div");
          main.className = "gh-commit-main";

          const message = document.createElement("p");
          message.className = "gh-commit-msg";
          message.textContent = commit.message;
          main.appendChild(message);

          const meta = document.createElement("p");
          meta.className = "gh-commit-meta";

          const author = document.createElement("span");
          author.className = "gh-author";
          author.textContent = "user";
          meta.appendChild(author);
          meta.appendChild(document.createTextNode("committed"));

          const hash = document.createElement("code");
          hash.className = "gh-hash";
          hash.textContent = commit.hash;
          meta.appendChild(hash);

          main.appendChild(meta);
          row.appendChild(main);
          list.appendChild(row);
        });
    }

    if (remoteUrlLabel) {
      remoteUrlLabel.textContent = gitState.remote.url || "origin не настроен";
      remoteUrlLabel.title = gitState.remote.url || "Remote URL не задан";
    }
  }

  function renderUI() {
    const names = Object.keys(gitState.files);
    const files = names.map(function (name) {
      return { name: name, status: gitState.files[name] };
    });
    const staged = files.filter(function (file) {
      return file.status === "staged";
    });

    renderFileList(lists.workdir, files, "Файлов нет");
    renderFileList(lists.staged, staged, "Индекс пуст");
    renderCommitList();
    renderRemoteList();

    if (counters.workdir) counters.workdir.textContent = String(files.length);
    if (counters.staged) counters.staged.textContent = String(staged.length);
    if (counters.repo) counters.repo.textContent = String(gitState.commits.length);
    if (counters.remote) {
      counters.remote.textContent = String(gitState.remote.commits.length);
    }
  }

  /* ---------- Команды ---------- */

  function initLines() {
    if (gitState.initialized) {
      return [
        { text: "Reinitialized existing Git repository in /home/user/project/.git/." }
      ];
    }

    gitState.initialized = true;
    gitState.branch = "master";
    gitState.branches = ["master"];
    updatePrompt();
    updateBranchIndicators();

    return [{ text: "Initialized empty Git repository in /home/user/project/.git/." }];
  }

  function statusLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    const names = Object.keys(gitState.files);
    const staged = names.filter(function (name) {
      return gitState.files[name] === "staged";
    });
    const modified = names.filter(function (name) {
      return gitState.files[name] === "modified";
    });
    const untracked = names.filter(function (name) {
      return gitState.files[name] === "untracked";
    });

    const lines = [{ text: "On branch " + gitState.branch }];

    if (!gitState.commits.length) {
      lines.push({ text: "" });
      lines.push({ text: "No commits yet" });
    }

    if (staged.length) {
      lines.push({ text: "" });
      lines.push({ text: "Changes to be committed:", tone: "success" });
      lines.push({
        text: '  (use "git restore --staged <file>..." to unstage)',
        tone: "muted"
      });
      staged.forEach(function (name) {
        lines.push({ text: "\t" + name, tone: "success" });
      });
    }

    if (modified.length) {
      lines.push({ text: "" });
      lines.push({ text: "Changes not staged for commit:" });
      lines.push({
        text: '  (use "git add <file>..." to update what will be committed)',
        tone: "muted"
      });
      modified.forEach(function (name) {
        lines.push({ text: "\t" + name, tone: "error" });
      });
    }

    if (untracked.length) {
      lines.push({ text: "" });
      lines.push({ text: "Untracked files:" });
      lines.push({
        text: '  (use "git add <file>..." to include in what will be committed)',
        tone: "muted"
      });
      untracked.forEach(function (name) {
        lines.push({ text: "\t" + name, tone: "error" });
      });
    }

    if (!staged.length && !modified.length && !untracked.length) {
      lines.push({ text: "" });
      lines.push({ text: "nothing to commit, working tree clean" });
    }

    return lines;
  }

  function touchLines(target) {
    if (!target) {
      return [{ text: "touch: missing file operand", tone: "error" }];
    }

    if (Object.prototype.hasOwnProperty.call(gitState.files, target)) {
      return [note("Файл " + target + " уже существует.")];
    }

    gitState.files[target] = "untracked";

    return [
      note(
        "Создан файл " +
          target +
          ". В реальном терминале touch не выводит текста."
      )
    ];
  }

  function lsLines() {
    const names = Object.keys(gitState.files).sort();

    if (!names.length) return [];

    return [{ text: names.join("  ") }];
  }

  function addLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    const files = gitState.files;

    if (!target) {
      return [{ text: "Nothing specified, nothing added.", tone: "error" }];
    }

    if (target === ".") {
      const untracked = Object.keys(files).filter(function (name) {
        return files[name] === "untracked";
      });

      if (!untracked.length) {
        return [note("Добавлять нечего: в рабочей директории нет untracked-файлов.")];
      }

      untracked.forEach(function (name) {
        files[name] = "staged";
      });

      return [
        note(
          "Файлы добавлены в индекс: " +
            untracked.join(", ") +
            ". В реальном Git команда не выводит текста."
        )
      ];
    }

    if (!Object.prototype.hasOwnProperty.call(files, target)) {
      return [
        {
          text: "fatal: pathspec '" + target + "' did not match any files",
          tone: "error"
        }
      ];
    }

    if (files[target] === "staged") {
      return [note("Файл " + target + " уже в индексе.")];
    }

    if (files[target] === "committed") {
      return [note("Файл " + target + " не изменён — добавлять нечего.")];
    }

    files[target] = "staged";

    return [
      note(
        "Файл " +
          target +
          " добавлен в индекс. В реальном Git команда не выводит текста."
      )
    ];
  }

  function makeHash() {
    const alphabet = "0123456789abcdef";
    let hash;

    do {
      hash = "";
      for (let i = 0; i < 7; i += 1) {
        hash += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    } while (
      gitState.commits.some(function (commit) {
        return commit.hash === hash;
      })
    );

    return hash;
  }

  function commitLines(message) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!gitState.user.name || !gitState.user.email) {
      return [
        { text: "*** Please tell me who you are.", tone: "error" },
        { text: "Run", tone: "muted" },
        {
          text: '  git config --global user.email "you@example.com"',
          tone: "muted"
        },
        {
          text: '  git config --global user.name "Your Name"',
          tone: "muted"
        },
        { text: "to set your account's default identity.", tone: "muted" }
      ];
    }

    if (!message) {
      return [
        {
          text: 'fatal: commit message required: git commit -m "текст"',
          tone: "error"
        }
      ];
    }

    const staged = Object.keys(gitState.files).filter(function (name) {
      return gitState.files[name] === "staged";
    });

    if (!staged.length) {
      return [{ text: "nothing to commit, working tree clean", tone: "error" }];
    }

    const isRoot = gitState.commits.length === 0;
    const hash = makeHash();

    gitState.commits.push({
      hash: hash,
      message: message,
      files: staged.slice()
    });

    staged.forEach(function (name) {
      gitState.files[name] = "committed";
    });

    const filesLabel =
      staged.length === 1 ? "1 file changed" : staged.length + " files changed";
    const insertLabel =
      staged.length === 1 ? "1 insertion(+)" : staged.length + " insertions(+)";

    return [
      {
        text:
          "[" +
          (isRoot
            ? gitState.branch + " (root-commit) "
            : gitState.branch + " ") +
          hash +
          "] " +
          message,
        tone: "warn"
      },
      { text: " " + filesLabel + ", " + insertLabel, tone: "muted" }
    ];
  }

  function remoteAddLines(name, url) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!url) {
      return [
        { text: "fatal: remote add requires a name and a URL", tone: "error" }
      ];
    }

    if (name.toLowerCase() !== "origin") {
      return [
        {
          text: "fatal: remote '" + name + "' is not supported; use origin",
          tone: "error"
        }
      ];
    }

    const existed = gitState.remote.url !== "";
    gitState.remote.url = url;

    return [
      note(
        (existed ? "Адрес origin обновлён: " : "Remote origin настроен: ") +
          url +
          ". В реальном Git команда не выводит текста."
      )
    ];
  }

  function pushLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!gitState.commits.length) {
      return [
        { text: "error: src refspec master does not match any.", tone: "error" }
      ];
    }

    if (!gitState.remote.url) {
      return [{ text: "fatal: No configured push destination.", tone: "error" }];
    }

    const upToDate =
      gitState.remote.commits.length === gitState.commits.length &&
      gitState.commits.every(function (commit, index) {
        return (
          gitState.remote.commits[index] &&
          gitState.remote.commits[index].hash === commit.hash
        );
      });

    if (upToDate) {
      return [{ text: "Everything up-to-date", tone: "muted" }];
    }

    gitState.remote.commits = gitState.commits.map(function (commit) {
      return {
        hash: commit.hash,
        message: commit.message,
        files: commit.files.slice()
      };
    });

    const objects = 3 + Math.max(0, gitState.commits.length - 1) * 2;
    const bytes = objects * 88;

    return [
      { text: "Enumerating objects: " + objects + ", done." },
      { text: "Counting objects: 100% (" + objects + "/" + objects + "), done." },
      {
        text:
          "Writing objects: 100% (" +
          objects +
          "/" +
          objects +
          "), " +
          bytes +
          " bytes | " +
          bytes +
          ".00 KiB/s, done."
      },
      {
        text:
          "Total " +
          objects +
          " (delta 0), reused 0 (delta 0), pack-reused 0"
      },
      { text: "To " + gitState.remote.url, tone: "muted" },
      { text: " * [new branch]      master -> master", tone: "success" },
      { text: "branch 'master' set up to track 'origin/master'.", tone: "muted" }
    ];
  }

  function configLines(key, value) {
    if (!key || !value) {
      return [
        { text: "error: missing value for " + (key || "git config"), tone: "error" }
      ];
    }

    const normalized = key.toLowerCase();

    if (normalized === "user.name") {
      gitState.user.name = value;
    } else if (normalized === "user.email") {
      gitState.user.email = value;
    } else {
      return [
        {
          text: "error: key does not contain a section: " + key,
          tone: "error"
        }
      ];
    }

    updateUserChip();

    return [
      note(normalized + " = " + value + ". В реальном Git команда не выводит текста.")
    ];
  }

  function fetchLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!gitState.remote.url) {
      return [
        { text: "fatal: No configured remote repository.", tone: "error" }
      ];
    }

    return [
      { text: "From " + gitState.remote.url, tone: "muted" },
      { text: " * branch            master     -> FETCH_HEAD", tone: "muted" },
      note("Изменения скачаны, но не применены — используйте git pull.")
    ];
  }

  function pullLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!gitState.remote.url) {
      return [
        { text: "fatal: No configured remote repository.", tone: "error" }
      ];
    }

    const known = gitState.commits.map(function (commit) {
      return commit.hash;
    });
    const incoming = gitState.remote.commits.filter(function (commit) {
      return known.indexOf(commit.hash) === -1;
    });

    if (!incoming.length) {
      return [{ text: "Already up to date.", tone: "muted" }];
    }

    incoming.forEach(function (commit) {
      gitState.commits.push({
        hash: commit.hash,
        message: commit.message,
        files: commit.files.slice(),
        merge: commit.merge === true
      });

      commit.files.forEach(function (file) {
        if (!gitState.files[file]) gitState.files[file] = "committed";
      });
    });

    return [
      { text: "From " + gitState.remote.url, tone: "muted" },
      { text: " * branch            master     -> FETCH_HEAD", tone: "muted" },
      { text: "Fast-forward", tone: "success" },
      {
        text:
          "Файлы обновлены: " +
          incoming.length +
          " коммит(ов) добавлено в Local Repository.",
        tone: "success"
      }
    ];
  }

  function branchLines(name) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!name) {
      return gitState.branches.map(function (branch) {
        return {
          text: (branch === gitState.branch ? "* " : "  ") + branch,
          tone: branch === gitState.branch ? "success" : undefined
        };
      });
    }

    if (/\s/.test(name)) {
      return [
        { text: "fatal: '" + name + "' is not a valid branch name", tone: "error" }
      ];
    }

    if (gitState.branches.indexOf(name) !== -1) {
      return [note("Ветка " + name + " уже существует.")];
    }

    gitState.branches.push(name);

    return [
      note("Создана ветка " + name + ". В реальном Git команда не выводит текста.")
    ];
  }

  function checkoutLines(name) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!name) {
      return [
        { text: "fatal: You must specify a branch to checkout.", tone: "error" }
      ];
    }

    if (gitState.branches.indexOf(name) === -1) {
      return [
        {
          text:
            "error: pathspec '" +
            name +
            "' did not match any file(s) known to git",
          tone: "error"
        }
      ];
    }

    if (gitState.branch === name) {
      return [{ text: "Already on '" + name + "'" }];
    }

    gitState.branch = name;
    updatePrompt();
    updateBranchIndicators();

    return [{ text: "Switched to branch '" + name + "'" }];
  }

  function mergeLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!target) {
      return [
        { text: "fatal: You must specify a branch to merge.", tone: "error" }
      ];
    }

    if (target === gitState.branch) {
      return [
        {
          text: "fatal: Cannot merge '" + target + "' into itself.",
          tone: "error"
        }
      ];
    }

    if (gitState.branches.indexOf(target) === -1) {
      return [
        {
          text: "merge: " + target + " - not something we can merge",
          tone: "error"
        }
      ];
    }

    const files = [];

    gitState.commits.forEach(function (commit) {
      commit.files.forEach(function (file) {
        if (files.indexOf(file) === -1) files.push(file);
      });
    });

    if (!files.length) {
      Object.keys(gitState.files).forEach(function (file) {
        if (files.indexOf(file) === -1) files.push(file);
      });
    }

    gitState.commits.push({
      hash: makeHash(),
      message: "Merge branch '" + target + "'",
      files: files,
      merge: true
    });

    return [
      { text: "Merge made by the 'ort' strategy.", tone: "success" },
      {
        text: " " + files.length + " file(s) merged into " + gitState.branch,
        tone: "muted"
      }
    ];
  }

  function run(raw) {
    const command = raw.trim().replace(/\s+/g, " ");
    if (!command) return;

    const name = command.toLowerCase();

    /* Эхо показывает приглашение на момент ввода, до изменения состояния. */
    const promptBefore = currentPrompt();

    if (!isCommandAllowed(command)) {
      const message =
        lessonConfig && lessonConfig.blockedMessage
          ? lessonConfig.blockedMessage
          : "[Система]: Эта команда пока недоступна в этом уроке.";
      const tone =
        lessonConfig && lessonConfig.blockedTone
          ? lessonConfig.blockedTone
          : "warn";

      appendEntry(command, [{ text: message, tone: tone }], promptBefore);
      scrollToBottom();
      return;
    }

    if (name === "clear") {
      history.textContent = "";
      renderUI();
      scrollToBottom();
      return;
    }

    let lines;

    if (name === "help") {
      lines = helpLines();
    } else if (/^git\s+config(\s|$)/i.test(command)) {
      const match = command.match(
        /^git\s+config\s+(?:--global\s+)?(user\.(?:name|email))\s+(.+)$/i
      );
      let value = match ? match[2].trim() : "";

      if (
        value &&
        ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
          (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'"))
      ) {
        value = value.slice(1, -1).trim();
      }

      lines = configLines(match ? match[1] : "", value);
    } else if (name === "git init") {
      lines = initLines();
    } else if (name === "git status") {
      lines = statusLines();
    } else if (/^git\s+commit(\s|$)/i.test(command)) {
      const match = command.match(/^git\s+commit\s+-m\s+(.+)$/i);
      let message = "";

      if (match) {
        message = match[1].trim();
        const first = message.charAt(0);
        const last = message.charAt(message.length - 1);

        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
          message = message.slice(1, -1).trim();
        }
      }

      lines = commitLines(message);
    } else if (/^git\s+remote\s+add(\s|$)/i.test(command)) {
      const match = command.match(
        /^git\s+remote\s+add\s+(\S+)(?:\s+(\S+))?\s*$/i
      );
      lines = remoteAddLines(match ? match[1] : "", match && match[2] ? match[2] : "");
    } else if (/^git\s+branch(\s|$)/i.test(command)) {
      lines = branchLines(command.replace(/^git\s+branch\s*/i, "").trim());
    } else if (/^git\s+checkout(\s|$)/i.test(command)) {
      lines = checkoutLines(command.replace(/^git\s+checkout\s*/i, "").trim());
    } else if (/^git\s+merge(\s|$)/i.test(command)) {
      lines = mergeLines(command.replace(/^git\s+merge\s*/i, "").trim());
    } else if (/^git\s+fetch(\s|$)/i.test(command)) {
      lines = fetchLines();
    } else if (/^git\s+pull(\s|$)/i.test(command)) {
      lines = pullLines();
    } else if (/^git\s+push(\s|$)/i.test(command)) {
      lines = pushLines();
    } else if (/^git\s+add(\s|$)/i.test(command)) {
      const target = command.replace(/^git\s+add\s*/i, "").trim();
      lines = addLines(target);
    } else if (/^touch(\s|$)/i.test(command)) {
      const target = command.replace(/^touch\s*/i, "").trim();
      lines = touchLines(target);
    } else if (/^ls(\s|$)/i.test(command)) {
      lines = lsLines();
    } else {
      lines = [{ text: "Команда " + command + " пока не реализована" }];
    }

    appendEntry(command, lines, promptBefore);

    if (!isFailedCommand(lines)) {
      completeGoalsFor(command);
    }

    updateUserChip();
    renderUI();
    renderTasks();
    checkLessonCompletion();
    saveState();
    scrollToBottom();
  }

  /* ---------- Ввод ---------- */

  ensureLessonProgress();
  completeAutoGoals();

  updatePrompt();
  updateBranchIndicators();
  updateUserChip();
  renderUI();
  renderTasks();
  checkLessonCompletion({ silent: true });

  if (lessonId && lessonConfig) {
    saveState();
  }

  if (lessonConfig && lessonConfig.needsInit && !gitState.initialized) {
    printNotice([
      {
        text: "Репозиторий не инициализирован! Вернитесь в Урок 1 или введите git init.",
        tone: "warn"
      }
    ]);
  }

  input.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    run(input.value);
    input.value = "";
  });

  /* Клик в любом месте терминала возвращает фокус в строку ввода. */
  terminal.addEventListener("click", function () {
    input.focus({ preventScroll: true });
  });
})();

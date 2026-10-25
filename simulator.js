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

  /* Путь, по которому в симуляции живёт pre-commit хук. */
  const HOOK_PRE_COMMIT = ".git/hooks/pre-commit";

  /*
   * Конфигурация уроков: какие команды доступны и какие цели нужно выполнить.
   * ID урока страница передаёт через data-lesson-id на <body>.
   */
  const lessonsConfig = {
    "lesson-1": {
      version: 3,
      /*
       * Урок 1 показывает в чек-листе человекочитаемые подписи целей
       * (descriptiveTasks) вместо шаблона «Выполнить команду: …».
       */
      descriptiveTasks: true,
      allowed: [
        "help",
        "clear",
        /* Блок «Предварительные требования»: проверка установки Git. */
        "git --version",
        "git config",
        "git init",
        "git status"
      ],
      goals: [
        {
          id: "version",
          label: "Проверить версию Git",
          command: "git --version"
        },
        {
          id: "config-name",
          label: "Настроить имя пользователя (user.name)",
          command: 'git config --global user.name "Student"'
        },
        {
          id: "config-email",
          label: "Настроить email (user.email)",
          command: 'git config --global user.email "student@example.com"'
        },
        {
          id: "init",
          label: "Инициализировать репозиторий (git init)",
          command: "git init"
        },
        {
          id: "status",
          label: "Проверить статус (git status)",
          command: "git status"
        }
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
    },
    "lesson-7": {
      version: 1,
      /*
       * Теория упоминает не только log и diff, но и status/add/commit —
       * разрешаем всё, чтобы ни одна команда из текста не была заблокирована.
       */
      allowed: [
        "help",
        "clear",
        "git log",
        "git diff",
        "git status",
        "git add",
        "git commit"
      ],
      goals: [
        {
          id: "log",
          label: "Посмотреть историю коммитов (команда git log)",
          command: "git log"
        },
        {
          id: "diff",
          label: "Посмотреть изменения (команда git diff)",
          command: "git diff"
        }
      ]
    },
    "lesson-8": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "touch",
        "git add",
        "git status",
        "git restore",
        "git reset"
      ],
      goals: [
        {
          id: "touch-test",
          label: "Создать файл test.txt (команда touch)",
          command: "touch test.txt"
        },
        {
          id: "add-test",
          label: "Добавить test.txt в индекс (команда git add)",
          command: "git add test.txt"
        },
        {
          id: "reset-test",
          label: "Убрать test.txt из индекса (команда git reset)",
          command: "git reset test.txt"
        },
        {
          id: "restore-test",
          label: "Удалить test.txt (команда git restore)",
          command: "git restore test.txt"
        }
      ]
    },
    "lesson-9": {
      version: 1,
      allowed: ["help", "clear", "touch", "echo", "git status"],
      goals: [
        {
          id: "touch-gitignore",
          label: "Создать .gitignore (команда touch)",
          command: "touch .gitignore"
        },
        {
          id: "write-ignore",
          label: 'Записать secret.txt в .gitignore (echo "secret.txt" > .gitignore)',
          command: 'echo "secret.txt" > .gitignore'
        },
        {
          id: "touch-secret",
          label: "Создать secret.txt (команда touch)",
          command: "touch secret.txt"
        },
        {
          id: "status",
          label: "Убедиться, что secret.txt игнорируется (команда git status)",
          command: "git status"
        }
      ]
    },
    "lesson-10": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "touch",
        "git add",
        "git stash",
        "git stash pop"
      ],
      goals: [
        {
          id: "touch-wip",
          label: "Создать файл wip.txt (команда touch)",
          command: "touch wip.txt"
        },
        {
          id: "add-wip",
          label: "Добавить wip.txt в индекс (команда git add)",
          command: "git add wip.txt"
        },
        {
          id: "stash",
          label: "Спрятать изменения в stash (команда git stash)",
          command: "git stash"
        },
        {
          id: "stash-pop",
          label: "Вернуть изменения из stash (команда git stash pop)",
          command: "git stash pop"
        }
      ]
    },
    "lesson-11": {
      version: 1,
      /* Теория: новых команд нет, чек-лист заменяет кнопка «Я прочитал». */
      readOnly: true,
      allowed: ["help", "clear"],
      goals: []
    },
    "lesson-12": {
      version: 1,
      /* merge в этом уроке заканчивается конфликтом в указанном файле. */
      mergeConflict: "index.html",
      allowed: [
        "help",
        "clear",
        "git merge",
        "git status",
        "git add",
        "git commit"
      ],
      goals: [
        {
          id: "merge",
          label: "Слить ветку feature (команда git merge feature)",
          command: "git merge feature"
        },
        {
          id: "resolve",
          label: "Решить конфликт: git add index.html",
          command: "git add index.html"
        },
        {
          id: "commit",
          label: 'Закоммитить разрешение (git commit -m "Resolve conflict")',
          command: 'git commit -m "Resolve conflict"'
        }
      ]
    },
    "lesson-13": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "git tag",
        "git log",
        /* Теория показывает возврат к версии и сравнение с ней. */
        "git checkout",
        "git diff"
      ],
      goals: [
        {
          id: "tag-create",
          label: "Поставить тег v1.0.0 на последний коммит (git tag v1.0.0)",
          command: "git tag v1.0.0"
        },
        {
          id: "tag-list",
          label: "Проверить список тегов (git tag)",
          command: "git tag"
        }
      ]
    },
    "lesson-14": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "git reset",
        "git reflog",
        /* Теория ссылается на git log — даём сравнить историю до и после отката. */
        "git log"
      ],
      goals: [
        {
          id: "reset-hard",
          label: "Откатить ветку на коммит назад (git reset --hard HEAD~1)",
          command: "git reset --hard HEAD~1"
        },
        {
          id: "reflog",
          label: "Посмотреть журнал перемещений HEAD (git reflog)",
          command: "git reflog"
        },
        {
          id: "restore",
          label: "Вернуть коммит из журнала (git reset --hard HEAD@{1})",
          command: "git reset --hard HEAD@{1}"
        }
      ]
    },
    "lesson-15": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "git blame",
        /* В подсказке упоминается git log -L — история строк. */
        "git log"
      ],
      goals: [
        {
          id: "blame",
          label: "Узнать, кто и когда менял строки (git blame index.html)",
          command: "git blame index.html"
        }
      ]
    },
    "lesson-16": {
      version: 1,
      /* Теория: команд нет, чек-лист заменяет кнопка «Я прочитал». */
      readOnly: true,
      allowed: ["help", "clear"],
      goals: []
    },
    "lesson-18": {
      version: 1,
      allowed: [
        "help",
        "clear",
        "git lfs track",
        "git submodule add",
        /* Теория упоминает diff по бинарнику и инициализацию подмодулей. */
        "git diff",
        "git submodule update"
      ],
      goals: [
        {
          id: "lfs-track",
          label: 'Отдать видео в LFS (git lfs track "*.mp4")',
          command: 'git lfs track "*.mp4"'
        },
        {
          id: "submodule",
          label: "Подключить библиотеку как подмодуль (git submodule add <url>)",
          command: "git submodule add https://github.com/user/library.git"
        }
      ]
    },
    "lesson-17": {
      version: 1,
      allowed: ["help", "clear", "touch", "git commit"],
      goals: [
        {
          id: "hook-file",
          label: "Создать файл pre-commit хука (touch .git/hooks/pre-commit)",
          command: "touch .git/hooks/pre-commit"
        },
        {
          id: "commit-blocked",
          label: 'Попробовать закоммитить (git commit -m "test")',
          command: 'git commit -m "test"'
        }
      ]
    },
    "lesson-19": {
      version: 1,
      /* Сцена урока: секрет уже лежит в индексе и ждёт коммита. */
      setupFiles: { "config.js": "staged" },
      allowed: [
        "help",
        "clear",
        "git rm --cached",
        "git commit",
        /* Теория показывает git log -p и предупреждает про git add . */
        "git log",
        "git add"
      ],
      goals: [
        {
          id: "rm-cached",
          label: "Убрать config.js из индекса (git rm --cached config.js)",
          command: "git rm --cached config.js"
        },
        {
          id: "commit",
          label: 'Закрепить удаление коммитом (git commit -m "Remove secret")',
          command: 'git commit -m "Remove secret"'
        }
      ]
    },
    "lesson-20": {
      version: 1,
      /* Финальный урок курса: только теория и поздравление. */
      readOnly: true,
      final: true,
      allowed: ["help", "clear"],
      goals: []
    },
    "lesson-21": {
      version: 1,
      /* Бонусный урок: вместо трёх колонок — одна панель Source Control. */
      setupRemote: "https://github.com/user/my-git-project.git",
      allowed: [
        "help",
        "clear",
        "touch",
        /* Теория: Initialize Repository и проверка статуса в таблице-шпаргалке. */
        "git init",
        "git status",
        /* Связка с GitHub способом Б: представление автора, как в уроке 1. */
        "git config",
        "git add",
        "git commit",
        "git push",
        /* Sync Changes в теории — это pull, затем push; Fetch тоже есть в меню. */
        "git pull",
        "git fetch",
        /* Discard Changes и переключение ветки в статус-баре. */
        "git restore",
        "git checkout"
      ],
      goals: [
        {
          id: "add-all",
          label: "Добавить всё в индекс, как кнопка + (git add .)",
          command: "git add ."
        },
        {
          id: "commit",
          label: 'Закоммитить, как галочка (git commit -m "Update from VS Code")',
          command: 'git commit -m "Update from VS Code"'
        },
        {
          id: "push",
          label: 'Отправить на сервер, как Sync Changes (git push)',
          command: "git push"
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
      /* Содержимое текстовых файлов: сейчас это нужно для .gitignore. */
      contents: {},
      /* Спрятанные изменения: [{ name, status: "stashed" }]. */
      stash: [],
      /* Незавершённый merge с конфликтом. */
      conflictActive: false,
      commits: [],
      /* Потерянные после --hard коммиты: их ещё можно вернуть по журналу. */
      lostCommits: [],
      /* Журнал перемещений HEAD: новое в начале. */
      reflog: [],
      /* Убранные из индекса файлы: они остались на диске (git rm --cached). */
      diskOnly: [],
      /* Удаления, которые закрепит ближайший коммит. */
      deletions: [],
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

  function sanitizeContents(rawContents) {
    if (
      !rawContents ||
      typeof rawContents !== "object" ||
      Array.isArray(rawContents)
    ) {
      return {};
    }

    const contents = {};

    Object.keys(rawContents).forEach(function (name) {
      if (typeof rawContents[name] === "string") {
        contents[name] = rawContents[name];
      }
    });

    return contents;
  }

  function sanitizeStash(rawStash) {
    if (!Array.isArray(rawStash)) return [];

    return rawStash
      .filter(function (entry) {
        return (
          entry &&
          typeof entry === "object" &&
          typeof entry.name === "string" &&
          entry.name !== ""
        );
      })
      .map(function (entry) {
        return { name: entry.name, status: "stashed" };
      });
  }

  /* Журнал HEAD: [{ hash, action }], новое хранится в начале. */
  function sanitizeReflog(rawReflog) {
    if (!Array.isArray(rawReflog)) return [];

    const result = [];

    rawReflog.forEach(function (entry) {
      if (!entry || typeof entry !== "object") return;
      if (typeof entry.hash !== "string" || typeof entry.action !== "string") {
        return;
      }

      result.push({ hash: entry.hash, action: entry.action });
    });

    return result;
  }

  function sanitizeCommits(rawCommits) {
    if (!Array.isArray(rawCommits)) return [];

    return rawCommits.filter(isCommit).map(function (commit) {
      const item = {
        hash: commit.hash,
        message: commit.message,
        files: commit.files.slice(),
        merge: commit.merge === true
      };

      /* Тег — метка версии на коммите, её тоже надо сохранить. */
      if (typeof commit.tag === "string" && commit.tag !== "") {
        item.tag = commit.tag;
      }

      return item;
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
          contents: sanitizeContents(stateRaw.contents),
          stash: sanitizeStash(stateRaw.stash),
          conflictActive: stateRaw.conflictActive === true,
          commits: sanitizeCommits(stateRaw.commits),
          lostCommits: sanitizeCommits(stateRaw.lostCommits),
          reflog: sanitizeReflog(stateRaw.reflog),
          diskOnly: sanitizeStringArray(stateRaw.diskOnly),
          deletions: sanitizeStringArray(stateRaw.deletions),
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
    "git --version": "git --version",
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
    "git merge": "git merge <branch>",
    "git log": "git log",
    "git diff": "git diff",
    "git reset": "git reset <file>",
    "git restore": "git restore <file>",
    "echo": 'echo "текст" > <file>',
    "git stash": "git stash",
    "git stash pop": "git stash pop",
    "git reflog": "git reflog",
    "git blame": "git blame <file>",
    "git rm --cached": "git rm --cached <file>"
  };

  const STATUS_ERROR =
    "fatal: not a git repository (or any of the parent directories): .git.";

  /* Ответ на `git --version`: по нему урок 1 проверяет, что Git установлен. */
  const GIT_VERSION_OUTPUT = "git version 2.43.0.windows.1";

  /* Дружелюбная ошибка для команды, которой нет в списке урока. */
  const UNKNOWN_COMMAND_MESSAGE =
    "[Система]: Команда не распознана. Введите help для списка доступных команд.";

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

  function resetProgress() {
    const confirmed = window.confirm(RESET_CONFIRM);
    if (!confirmed) return;

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
        resetProgress();
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
    remote: document.querySelector('[data-list="remote"]'),
    /* Блок Stash есть только на странице урока 10. */
    stash: document.querySelector('[data-list="stash"]')
  };

  const counters = {
    workdir: document.querySelector('[data-count="workdir"]'),
    staged: document.querySelector('[data-count="staged"]'),
    repo: document.querySelector('[data-count="repo"]'),
    remote: document.querySelector('[data-count="remote"]'),
    stash: document.querySelector('[data-count="stash"]')
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
  /* Кнопка «Я прочитал» есть только на теоретических уроках. */
  const readDoneButton = document.querySelector("[data-read-done]");
  const tasksList = document.querySelector("[data-tasks]");
  const tasksCount = document.querySelector("[data-tasks-count]");

  let completionAnnounced = false;

  /* Коммит, вернувшийся по reflog: подсвечиваем его один раз в панели. */
  let restoredCommitHash = null;

  /* Отметка «прочитано» для урока без практики. */
  const READ_GOAL_ID = "read";

  /* Бонусный урок про VS Code рисует одну панель вместо трёх колонок. */
  const isVscodeLesson = lessonId === "lesson-21";

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
    /* Строка с полем html рисуется разметкой: так git diff красит + и -. */
    const markup = typeof item === "string" ? null : item.html;

    const p = document.createElement("p");
    p.className = "terminal-line terminal-output";
    if (tone && TONE_CLASS[tone]) p.className += " " + TONE_CLASS[tone];

    if (markup) {
      p.innerHTML = markup;
    } else {
      p.textContent = text;
    }

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

      /*
       * Единый формат чек-листа во всех уроках:
       * «Выполнить команду: <code>git ...</code>».
       * Автоматические цели (например, коммит коллеги) команды не имеют.
       */
      if (goal.label && lessonConfig && lessonConfig.descriptiveTasks) {
        /* Урок с человекочитаемыми подписями: показываем label как есть. */
        label.textContent = goal.label;
      } else if (goal.command && !goal.auto) {
        label.appendChild(document.createTextNode("Выполнить команду: "));

        const command = document.createElement("code");
        command.textContent = goal.command;
        label.appendChild(command);
      } else {
        label.textContent = goal.label;
      }

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

    /* Отметка «прочитано» живёт в том же списке, что и цели. */
    if (lessonConfig.readOnly) validIds.push(READ_GOAL_ID);

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

  function isReadAcknowledged() {
    return completedGoals.indexOf(READ_GOAL_ID) !== -1;
  }

  /* Кнопка «Я прочитал»: после нажатия она показывает, что урок закрыт. */
  function syncReadButton(celebrate) {
    if (!readDoneButton) return;

    if (isReadAcknowledged()) {
      readDoneButton.disabled = true;
      readDoneButton.classList.remove("btn-primary");
      readDoneButton.classList.add("btn-ghost");
      readDoneButton.textContent =
        lessonConfig && lessonConfig.final ? "Курс пройден ✓" : "Прочитано ✓";

      /* Последний урок курса открывает экран поздравления. */
      if (lessonConfig && lessonConfig.final) showFinalScreen(celebrate === true);
    }
  }

  function initReadAcknowledgement() {
    if (!readDoneButton || !lessonConfig || !lessonConfig.readOnly) return;

    syncReadButton();

    readDoneButton.addEventListener("click", function () {
      if (isReadAcknowledged()) return;

      /* completedGoals — тот же массив, что и progress[lessonId].completed. */
      completedGoals.push(READ_GOAL_ID);

      syncReadButton(true);
      renderTasks();
      checkLessonCompletion();
      saveState();
    });
  }

  function allGoalsDone() {
    /* Теоретический урок закрывается кнопкой «Я прочитал». */
    if (lessonConfig && lessonConfig.readOnly) {
      return isReadAcknowledged();
    }

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

      let text = "🎉 Отлично! Вы выполнили все задачи урока.";

      if (lessonConfig && lessonConfig.final) {
        text = "🎉 Поздравляем! Вы прошли курс по Git.";
      } else if (lessonConfig && lessonConfig.readOnly) {
        text = "🎉 Теория прочитана! Кнопка «Следующий урок» открыта.";
      } else if (hasNext) {
        text =
          "🎉 Отлично! Вы выполнили все задачи урока. Теперь вы можете перейти к следующему уроку.";
      }

      printNotice([{ text: text, tone: "success" }]);
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

  /* ---------- Анимация перелёта файлов ---------- */

  const FLY_MS = 340;

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* Снимок строк файлов до перерисовки: где строка стояла и как выглядела. */
  function snapshotFileRows() {
    const snapshot = [];

    [lists.workdir, lists.staged].forEach(function (listEl) {
      if (!listEl) return;

      Array.prototype.forEach.call(listEl.children, function (row) {
        const name = row.getAttribute("data-file-name");
        if (!name) return;

        snapshot.push({
          name: name,
          rect: row.getBoundingClientRect(),
          node: row.cloneNode(true)
        });
      });
    });

    return snapshot;
  }

  /* Ищем строку по имени: после git reset она уже в другой панели. */
  function findFileRow(name) {
    const panes = [lists.workdir, lists.staged];

    for (let i = 0; i < panes.length; i += 1) {
      const listEl = panes[i];
      if (!listEl) continue;

      const rows = Array.prototype.slice.call(listEl.children);

      for (let j = 0; j < rows.length; j += 1) {
        if (rows[j].getAttribute("data-file-name") === name) return rows[j];
      }
    }

    return null;
  }

  /* Перелёт строки из старого положения в новое — техника FLIP. */
  function flyFileRow(row, fromRect) {
    const toRect = row.getBoundingClientRect();
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;

    if (!dx && !dy) return;

    /* Ставим строку на старое место без анимации... */
    row.style.transition = "none";
    row.style.transform = "translate(" + dx + "px," + dy + "px)";
    row.style.zIndex = "2";

    window.requestAnimationFrame(function () {
      /* ...и в следующем кадре отпускаем: браузер проигрывает переход. */
      row.getBoundingClientRect();
      row.style.transition =
        "transform " + FLY_MS + "ms cubic-bezier(0.22, 0.61, 0.36, 1)";
      row.style.transform = "translate(0, 0)";
    });

    window.setTimeout(function () {
      row.style.transition = "";
      row.style.transform = "";
      row.style.zIndex = "";
    }, FLY_MS + 60);
  }

  /* Удалённый файл (git restore) улетает копией строки и растворяется. */
  function flyFileAway(node, rect) {
    const ghost = node.cloneNode(true);

    ghost.removeAttribute("data-file-name");
    ghost.classList.add("file-row--ghost");
    ghost.style.position = "fixed";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.margin = "0";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "30";
    ghost.style.transition =
      "transform " + FLY_MS + "ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity " +
      FLY_MS + "ms ease";

    document.body.appendChild(ghost);

    window.requestAnimationFrame(function () {
      ghost.style.transform = "translateY(-10px) scale(0.94)";
      ghost.style.opacity = "0";
    });

    window.setTimeout(function () {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, FLY_MS + 80);
  }

  /*
   * renderUI пересобирает панели с нуля, поэтому перелёт запускаем после
   * отрисовки: существующие строки летят на новое место (Staging → Working
   * Directory), а пропавшие улетают и исчезают.
   */
  function animateFileChanges(snapshot) {
    if (!snapshot.length || prefersReducedMotion()) return;

    snapshot.forEach(function (entry) {
      const row = findFileRow(entry.name);

      if (row) {
        flyFileRow(row, entry.rect);
      } else {
        flyFileAway(entry.node, entry.rect);
      }
    });
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
      /* Имя нужно анимации: по нему строка ищется после перерисовки. */
      row.setAttribute("data-file-name", item.name);

      row.appendChild(makeIcon(fileColor(item.name)));

      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = item.name;
      name.title = item.name;
      row.appendChild(name);

      const badge = document.createElement("span");
      badge.className = "file-badge";

      if (item.ignored) {
        /* Файл есть на диске, но .gitignore его скрывает — показываем серым. */
        row.classList.add("file-row--ignored");
        badge.dataset.status = "ignored";
        badge.textContent = "ignored";
        badge.title = "скрыт в .gitignore";
        badge.setAttribute("aria-label", "игнорируется Git");
      } else if (item.diskOnly) {
        /* Файл убран из индекса, но остался на диске — красная метка. */
        row.classList.add("file-row--on-disk");
        badge.dataset.status = "on-disk";
        badge.textContent = "на диске";
        badge.title = "Убран из Git, но остался на компьютере";
        badge.setAttribute("aria-label", "остался на диске");
      } else {
        badge.dataset.status = item.status;

        if (item.status === "committed") {
          badge.textContent = "✓";
          badge.title = "committed";
          badge.setAttribute("aria-label", "закоммичен");
        } else {
          badge.textContent = item.status;
        }
      }

      row.appendChild(badge);

      listEl.appendChild(row);
    });
  }

  /* Блок Stash: спрятанные изменения ждут своего часа. */
  function renderStashList() {
    const list = lists.stash;
    if (!list) return;

    const entries = Array.isArray(gitState.stash) ? gitState.stash : [];

    list.textContent = "";

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "explorer-empty";
      empty.textContent = "Stash пуст";
      list.appendChild(empty);
      return;
    }

    entries.forEach(function (entry) {
      const row = document.createElement("li");
      row.className = "file-row file-row--stashed";
      row.appendChild(makeIcon(fileColor(entry.name)));

      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = entry.name;
      name.title = entry.name;
      row.appendChild(name);

      const badge = document.createElement("span");
      badge.className = "file-badge";
      badge.dataset.status = "stashed";
      badge.textContent = "stashed";
      badge.title = "спрятано через git stash";
      badge.setAttribute("aria-label", "спрятано в stash");
      row.appendChild(badge);

      list.appendChild(row);
    });
  }

  function isPushed(hash) {
    return gitState.remote.commits.some(function (commit) {
      return commit.hash === hash;
    });
  }

  function renderCommitList() {
    /* Подсветка одноразовая: анимацию показываем только при возврате. */
    const returnedHash = restoredCommitHash;
    restoredCommitHash = null;

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

        if (returnedHash && commit.hash === returnedHash) {
          card.className += " commit-card--returned";
        }

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

        /* Метка версии: синяя плашка рядом с коммитом. */
        if (commit.tag) {
          const tagBadge = document.createElement("span");

          tagBadge.className = "commit-tag";
          tagBadge.textContent = commit.tag;
          tagBadge.title = "Тег версии " + commit.tag;

          top.appendChild(tagBadge);
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
    /* Снимок до отрисовки: откуда строки стартуют в анимации. */
    const fileRows = snapshotFileRows();

    const names = Object.keys(gitState.files);
    const files = names.map(function (name) {
      return {
        name: name,
        status: gitState.files[name],
        ignored: isIgnored(name),
        diskOnly: gitState.diskOnly.indexOf(name) !== -1
      };
    });
    const staged = files.filter(function (file) {
      return file.status === "staged";
    });

    if (isVscodeLesson) {
      /* Бонусный урок: одна панель Source Control вместо трёх колонок. */
      renderVscodePanel(files);

      if (pendingToast) {
        showToast(pendingToast);
        pendingToast = "";
      }
    } else {
      renderFileList(lists.workdir, files, "Файлов нет");
      renderFileList(lists.staged, staged, "Индекс пуст");
      renderStashList();
      renderCommitList();
    }

    /* GitHub виден в обоих режимах: после git push коммиты появляются и там. */
    renderRemoteList();

    if (counters.workdir) counters.workdir.textContent = String(files.length);
    if (counters.staged) counters.staged.textContent = String(staged.length);
    if (counters.repo) counters.repo.textContent = String(gitState.commits.length);
    if (counters.remote) {
      counters.remote.textContent = String(gitState.remote.commits.length);
    }
    if (counters.stash) {
      const stashCount = Array.isArray(gitState.stash) ? gitState.stash.length : 0;
      counters.stash.textContent = String(stashCount);
    }

    /* Панели уже новые — осталось проиграть перелёт строк. */
    animateFileChanges(fileRows);
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
    /* Пока конфликт не решён, Git показывает unmerged paths. */
    if (gitState.conflictActive) {
      return unmergedLines();
    }

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
    /* Игнорируемые файлы Git не перечисляет в Untracked files. */
    const untracked = names.filter(function (name) {
      return gitState.files[name] === "untracked" && !isIgnored(name);
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

  /*
   * echo "текст" > файл — записывает строку в файл, перезаписывая его.
   * В этом уроке так заполняют .gitignore.
   */
  function echoLines(text, target) {
    let value = text.trim();

    if (!value || !target) {
      return [
        { text: 'fatal: echo requires: echo "текст" > <file>', tone: "error" }
      ];
    }

    if (
      value.length > 1 &&
      ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
        (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!gitState.contents || typeof gitState.contents !== "object") {
      gitState.contents = {};
    }

    /* Как и в настоящей оболочке, > создаёт файл, если его ещё нет. */
    if (!Object.prototype.hasOwnProperty.call(gitState.files, target)) {
      gitState.files[target] = "untracked";
    }

    gitState.contents[target] = value + "\n";

    return [
      note(
        "Записали в " +
          target +
          ": " +
          value +
          ". В реальном терминале echo не выводит текста."
      )
    ];
  }

  /* ---------- .gitignore ---------- */

  const GITIGNORE = ".gitignore";

  /* Строки .gitignore без пустых строк и комментариев. */
  function gitignorePatterns() {
    const raw =
      gitState.contents && typeof gitState.contents[GITIGNORE] === "string"
        ? gitState.contents[GITIGNORE]
        : "";

    return raw
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line && line.charAt(0) !== "#";
      });
  }

  function escapePattern(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* Простое подмножество шаблонов: точное имя, папка с «/» и звёздочки. */
  function matchesIgnorePattern(name, pattern) {
    if (pattern === name) return true;

    if (pattern.charAt(pattern.length - 1) === "/") {
      return name.indexOf(pattern.slice(0, -1) + "/") === 0;
    }

    if (pattern.indexOf("*") === -1) return false;

    const regex = new RegExp(
      "^" + pattern.split("*").map(escapePattern).join(".*") + "$"
    );

    return regex.test(name);
  }

  /* Git прячет файл, только пока тот не попал в индекс или коммит. */
  function isIgnored(name) {
    if (gitState.files[name] !== "untracked") return false;

    return gitignorePatterns().some(function (pattern) {
      return matchesIgnorePattern(name, pattern);
    });
  }

  function lsLines() {
    const names = Object.keys(gitState.files).sort();

    if (!names.length) return [];

    return [{ text: names.join("  ") }];
  }

  function addLines(target) {
    /* git add по конфликтующему файлу отмечает конфликт решённым. */
    if (
      gitState.conflictActive &&
      (target === conflictFile() || target === ".")
    ) {
      const file = conflictFile();

      gitState.conflictActive = false;
      gitState.files[file] = "staged";

      return [
        { text: "Отмечено решённым: " + file, tone: "success" },
        note("Конфликт решен. Теперь можно сделать коммит.")
      ];
    }

    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    const files = gitState.files;

    if (!target) {
      return [{ text: "Nothing specified, nothing added.", tone: "error" }];
    }

    if (target === ".") {
      /* Точка не трогает то, что скрыто в .gitignore, — как в настоящем Git. */
      const untracked = Object.keys(files).filter(function (name) {
        return files[name] === "untracked" && !isIgnored(name);
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

  /*
   * git reset <file> — вынимает файл из индекса обратно в рабочую директорию.
   * Содержимое файла не меняется: статус staged снова становится untracked.
   */
  function resetLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!target) {
      return [
        {
          text: "fatal: git reset requires a file: git reset <file>",
          tone: "error"
        }
      ];
    }

    if (!Object.prototype.hasOwnProperty.call(gitState.files, target)) {
      return [
        {
          text: "fatal: pathspec '" + target + "' did not match any files",
          tone: "error"
        }
      ];
    }

    if (gitState.files[target] !== "staged") {
      return [note("Файл " + target + " не в индексе — вынимать нечего.")];
    }

    gitState.files[target] = "untracked";

    return [
      note(
        "Файл " +
          target +
          " убран из индекса: статус снова untracked, сам файл остался в Working Directory."
      )
    ];
  }

  /*
   * git restore <file> — отменяет изменения в рабочей директории.
   * В симуляторе это значит «файл как будто не создавали»: удаляем его.
   */
  function restoreLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!target) {
      return [
        {
          text: "fatal: git restore requires a file: git restore <file>",
          tone: "error"
        }
      ];
    }

    if (!Object.prototype.hasOwnProperty.call(gitState.files, target)) {
      return [
        {
          text: "fatal: pathspec '" + target + "' did not match any files",
          tone: "error"
        }
      ];
    }

    if (gitState.files[target] === "committed") {
      return [
        note(
          "Файл " +
            target +
            " уже в коммите: git restore вернул бы его к версии из коммита, а не удалил."
        )
      ];
    }

    delete gitState.files[target];

    return [
      note(
        "Файл " +
          target +
          " удалён: изменения отменены, в рабочей директории его больше нет."
      )
    ];
  }

  /*
   * git stash — временно прячет подготовленные изменения.
   * В симуляторе файлы уходят из индекса в массив gitState.stash.
   */
  function stashLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!Array.isArray(gitState.stash)) gitState.stash = [];

    const names = Object.keys(gitState.files).filter(function (name) {
      return gitState.files[name] === "staged";
    });

    if (!names.length) {
      return [{ text: "No local changes to save", tone: "muted" }];
    }

    names.forEach(function (name) {
      gitState.stash.push({ name: name, status: "stashed" });
      delete gitState.files[name];
    });

    return [
      {
        text:
          "Saved working directory and index state WIP on " + gitState.branch
      },
      note(
        "Спрятали в stash: " +
          names.join(", ") +
          ". Рабочая директория снова чистая — можно переключаться на другую задачу."
      )
    ];
  }

  /*
   * git stash pop — возвращает спрятанные файлы обратно в индекс.
   */
  function stashPopLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!Array.isArray(gitState.stash) || !gitState.stash.length) {
      return [{ text: "No stash entries found.", tone: "error" }];
    }

    const restored = gitState.stash.map(function (entry) {
      return entry.name;
    });

    const dropped = makeHash();

    restored.forEach(function (name) {
      gitState.files[name] = "staged";
    });

    gitState.stash = [];

    const lines = [
      { text: "On branch " + gitState.branch },
      { text: "" },
      { text: "Changes to be committed:", tone: "success" },
      {
        text: '  (use "git restore --staged <file>..." to unstage)',
        tone: "muted"
      }
    ];

    restored.forEach(function (name) {
      lines.push({ text: "\tnew file:   " + name, tone: "success" });
    });

    lines.push({ text: "" });
    lines.push({ text: "Dropped refs/stash@{0} (" + dropped + ")", tone: "muted" });
    lines.push(
      note("Файлы вернулись в индекс — можно продолжать работу с того же места.")
    );

    return lines;
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

    /* Учебная симуляция pre-commit: файл хука блокирует коммит. */
    if (Object.prototype.hasOwnProperty.call(gitState.files, HOOK_PRE_COMMIT)) {
      return [
        {
          text:
            "[Учебная подсказка]: Сработал pre-commit хук. Коммит заблокирован, так как код не прошел проверку.",
          tone: "error"
        }
      ];
    }

    /* Коммит возможен только после того, как конфликт отмечен решённым. */
    if (gitState.conflictActive) {
      return [
        {
          text:
            "error: Committing is not possible because you have unmerged files.",
          tone: "error"
        },
        {
          text: 'hint: Fix them up in the work tree, and then use "git add <file>".',
          tone: "muted"
        },
        {
          text: "fatal: Exiting because of an unresolved conflict.",
          tone: "error"
        },
        note("Отметьте конфликт решённым: git add " + conflictFile() + ".")
      ];
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

    /* Коммит удаления: в индексе пусто, зато есть файлы, убранные git rm --cached. */
    if (!staged.length && gitState.deletions.length) {
      const removed = gitState.deletions.slice();
      gitState.deletions = [];

      const hash = makeHash();

      gitState.commits.push({
        hash: hash,
        message: message,
        files: []
      });

      gitState.reflog.unshift({ hash: hash, action: "commit: " + message });

      return [
        {
          text: "[" + gitState.branch + " " + hash + "] " + message,
          tone: "success"
        },
        {
          text:
            removed.length === 1
              ? "1 file changed"
              : removed.length + " files changed",
          tone: "muted"
        }
      ].concat(
        removed.map(function (name) {
          return { text: " delete mode 100644 " + name, tone: "muted" };
        })
      );
    }

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

    /* В бонусном уроке коммит показывает уведомление как в VS Code. */
    if (isVscodeLesson) pendingToast = "Successfully committed";

    /* Новый коммит двигает HEAD, значит попадает в журнал перемещений. */
    gitState.reflog.unshift({ hash: hash, action: "commit: " + message });

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

    /*
     * Переключение по тегу: в симуляторе нет отдельного detached HEAD,
     * поэтому показываем честное сообщение, но ветку не меняем.
     */
    const tagged = (gitState.commits || []).filter(function (commit) {
      return commit.tag === name;
    })[0];

    if (tagged) {
      return [
        { text: "Note: switching to '" + name + "'.", tone: "success" },
        { text: "You are in 'detached HEAD' state.", tone: "muted" },
        note(
          "В симуляторе переключение по тегу только показывает сообщение: " +
            "ветка остаётся прежней. В настоящем Git вы увидели бы код " +
            "ровно на момент релиза."
        )
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

  /* ---------- Конфликт слияния (урок 12) ---------- */

  /* Файл, в котором случается конфликт: задаётся конфигурацией урока. */
  function conflictFile() {
    return (lessonConfig && lessonConfig.mergeConflict) || "index.html";
  }

  /*
   * Конфликтный merge: Git останавливается и пишет маркеры прямо в файл.
   * Коммит создать нельзя, пока конфликт не отмечен через git add.
   */
  function startMergeConflict(target, file) {
    gitState.conflictActive = true;
    gitState.files[file] = "modified";

    return [
      { text: "Auto-merging " + file, tone: "muted" },
      { text: "CONFLICT (content): Merge conflict in " + file, tone: "error" },
      {
        text:
          "Automatic merge failed; fix conflicts and then commit the result.",
        tone: "error"
      },
      { text: "" },
      { text: "Теперь в " + file + " лежат маркеры:", tone: "note" },
      { text: "<<<<<<< HEAD", tone: "error" },
      { text: "<p>Заголовок, который был в master</p>" },
      { text: "=======", tone: "muted" },
      { text: "<p>Заголовок из ветки " + target + "</p>" },
      { text: ">>>>>>> " + target, tone: "error" },
      note(
        "Оставьте нужный текст, удалите маркеры и сохраните файл, затем выполните git add " +
          file +
          "."
      )
    ];
  }

  /* git status при незавершённом merge: Git перечисляет unmerged paths. */
  function unmergedLines() {
    const file = conflictFile();

    return [
      { text: "On branch " + gitState.branch },
      { text: "You have unmerged paths.", tone: "error" },
      { text: '  (fix conflicts and run "git commit")', tone: "muted" },
      { text: '  (use "git merge --abort" to abort the merge)', tone: "muted" },
      { text: "" },
      { text: "Unmerged paths:", tone: "warn" },
      { text: '  (use "git add <file>..." to mark resolution)', tone: "muted" },
      { text: "\tboth modified:   " + file, tone: "error" }
    ];
  }

  function mergeLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (gitState.conflictActive) {
      return [
        {
          text: "fatal: You have not concluded your merge (MERGE_HEAD exists).",
          tone: "error"
        },
        note("Сначала завершите текущий конфликт: git add " + conflictFile() + ".")
      ];
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

    /* Урок про конфликты: merge не проходит и оставляет маркеры в файле. */
    if (lessonConfig && lessonConfig.mergeConflict) {
      return startMergeConflict(target, conflictFile());
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

  /* ---------- История и различия (урок 7) ---------- */

  const LOG_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const LOG_MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  /* Строки диффа: зелёные — добавленные, красные — удалённые. */
  const DIFF_REMOVED = '<span style="color:red">- удаленная строка</span>';
  const DIFF_ADDED = '<span style="color:green">+ добавленная строка</span>';

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  /* Дата в формате git log: Sun Oct 25 08:04:48 2026 +0300. */
  function formatLogDate(date) {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes < 0 ? "-" : "+";
    const absMinutes = Math.abs(offsetMinutes);

    return (
      LOG_WEEKDAYS[date.getDay()] +
      " " +
      LOG_MONTHS[date.getMonth()] +
      " " +
      date.getDate() +
      " " +
      pad2(date.getHours()) +
      ":" +
      pad2(date.getMinutes()) +
      ":" +
      pad2(date.getSeconds()) +
      " " +
      date.getFullYear() +
      " " +
      sign +
      pad2(Math.floor(absMinutes / 60)) +
      pad2(absMinutes % 60)
    );
  }

  /* У каждого коммита свой час: чем старше коммит, тем раньше дата. */
  function commitDate(index) {
    const hour = 60 * 60 * 1000;
    const shift = (gitState.commits.length - 1 - index) * hour;

    return new Date(Date.now() - shift);
  }

  /* ---------- Журнал HEAD и откат --hard (урок 14) ---------- */

  function shortHash(hash) {
    return String(hash || "").slice(0, 7);
  }

  /*
   * Если журнала ещё нет (например, репозиторий собран в прошлых версиях
   * курса), собираем его из существующих коммитов.
   */
  function seedReflog() {
    if (gitState.reflog.length || !gitState.commits.length) return;

    gitState.commits.forEach(function (commit) {
      gitState.reflog.push({
        hash: commit.hash,
        action: "commit: " + commit.message
      });
    });

    /* Журнал показывают от новых к старым. */
    gitState.reflog.reverse();
  }

  /*
   * git reset --hard HEAD~1 — откат ветки на коммит назад.
   * Сам коммит не исчезает бесследно: он уходит в lostCommits,
   * а перемещение HEAD попадает в журнал.
   */
  function hardResetLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    const argument = (target || "").replace(/^--hard\s*/i, "").trim();
    const tilde = /^HEAD~(\d+)$/i.exec(argument);
    const selector = /^HEAD@\{(\d+)\}$/i.exec(argument);

    if (!tilde && !selector) {
      return [{ text: "fatal: Cannot do hard reset with paths.", tone: "error" }];
    }

    if (!gitState.commits.length) {
      return [
        {
          text: "fatal: ambiguous argument 'HEAD': unknown revision",
          tone: "error"
        }
      ];
    }

    if (tilde) {
      const steps = Number(tilde[1]);

      if (steps === 0) {
        const head = gitState.commits[gitState.commits.length - 1];

        return [
          {
            text: "HEAD is now at " + shortHash(head.hash) + " " + head.message,
            tone: "muted"
          }
        ];
      }

      if (steps >= gitState.commits.length) {
        return [
          {
            text:
              "fatal: ambiguous argument 'HEAD~" +
              steps +
              "': unknown revision",
            tone: "error"
          }
        ];
      }

      const removed = gitState.commits.splice(gitState.commits.length - steps);

      removed.forEach(function (commit) {
        gitState.lostCommits.push(commit);
      });

      const head = gitState.commits[gitState.commits.length - 1];

      gitState.reflog.unshift({
        hash: head.hash,
        action: "reset: moving to HEAD~" + steps
      });

      return [
        {
          text: "HEAD is now at " + shortHash(head.hash) + " " + head.message,
          tone: "success"
        },
        note(
          "Коммит " +
            shortHash(removed[removed.length - 1].hash) +
            " пропал из истории, но остался в журнале HEAD."
        )
      ];
    }

    /* HEAD@{N} — вернуться к позиции из журнала. */
    const index = Number(selector[1]);
    const entry = gitState.reflog[index];

    if (!entry) {
      return [
        {
          text:
            "fatal: log for 'HEAD' only has " +
            gitState.reflog.length +
            " entries.",
          tone: "error"
        }
      ];
    }

    const hash = entry.hash;
    const known = gitState.commits.map(function (commit) {
      return commit.hash;
    });

    if (known.indexOf(hash) === -1) {
      const lostHashes = gitState.lostCommits.map(function (commit) {
        return commit.hash;
      });
      const lostIndex = lostHashes.indexOf(hash);

      if (lostIndex === -1) {
        return [
          {
            text:
              "fatal: commit " + shortHash(hash) + " is no longer available",
            tone: "error"
          }
        ];
      }

      const restored = gitState.lostCommits.splice(lostIndex, 1)[0];

      gitState.commits.push(restored);

      /* Подсказка для панели: вернувшийся коммит надо подсветить. */
      restoredCommitHash = restored.hash;
    }

    const headCommit = gitState.commits.filter(function (commit) {
      return commit.hash === hash;
    })[0];

    gitState.reflog.unshift({
      hash: hash,
      action: "reset: moving to HEAD@{" + index + "}"
    });

    return [
      {
        text:
          "HEAD is now at " +
          shortHash(hash) +
          " " +
          (headCommit ? headCommit.message : ""),
        tone: "success"
      },
      note("Коммит снова в истории — он вернулся из журнала HEAD.")
    ];
  }

  /*
   * git reflog — журнал всех перемещений HEAD.
   * По нему можно найти коммит, который «потерялся» после reset --hard.
   */
  function reflogLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!gitState.reflog.length) {
      return [{ text: "Журнал HEAD пуст", tone: "muted" }];
    }

    return gitState.reflog.map(function (entry, index) {
      return {
        text:
          shortHash(entry.hash) + " HEAD@{" + index + "}: " + entry.action,
        tone: index === 0 ? "success" : "muted"
      };
    });
  }

  /* ---------- Заглушки для сложных команд (урок 18) ---------- */

  /*
   * git lfs track — команда слишком тяжёлая для симуляции: показываем только
   * сообщение, что файл добавлен в LFS-хранилище. Состояние не меняем.
   */
  function lfsTrackLines(pattern) {
    if (!pattern) {
      return [
        { text: "fatal: git lfs track requires a pattern", tone: "error" }
      ];
    }

    return [note("Файл добавлен в LFS-хранилище")];
  }

  /*
   * git submodule add — тоже заглушка: сообщаем об успехе, панели не трогаем.
   */
  function submoduleAddLines(url) {
    if (!url) {
      return [
        { text: "fatal: git submodule add requires a URL", tone: "error" }
      ];
    }

    return [note("Подмодуль успешно подключен.")];
  }

  /* ---------- Сцена урока: файлы, которые уже лежат в индексе ---------- */

  /*
   * Некоторые уроки начинаются не с пустой папки. Конфигурация объявляет такие
   * файлы через setupFiles, а эта функция выставляет их при открытии страницы.
   * Репозиторий и подпись автора создаются молча: сцена подразумевает, что
   * предыдущие уроки курса уже пройдены.
   */
  function prepareLessonScene() {
    if (!lessonConfig) return;
    if (!lessonConfig.setupFiles && !lessonConfig.setupRemote) return;

    if (!gitState.initialized) {
      gitState.initialized = true;
      gitState.branches = [gitState.branch];
    }

    if (!gitState.user.name) gitState.user.name = "Student";
    if (!gitState.user.email) gitState.user.email = "student@example.com";

    let changed = false;

    /* Сцена может быть уже связана с GitHub — тогда git push сработает. */
    if (lessonConfig.setupRemote && !gitState.remote.url) {
      gitState.remote.url = lessonConfig.setupRemote;
      changed = true;
    }

    Object.keys(lessonConfig.setupFiles || {}).forEach(function (name) {
      if (Object.prototype.hasOwnProperty.call(gitState.files, name)) return;

      gitState.files[name] = lessonConfig.setupFiles[name];
      changed = true;
    });

    if (changed) saveState();
  }

  /* ---------- git rm --cached: убрать из индекса, оставить на диске ---------- */

  function rmCachedLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!target) {
      return [
        {
          text: "fatal: No pathspec was given. Which files should I remove?",
          tone: "error"
        }
      ];
    }

    const status = Object.prototype.hasOwnProperty.call(gitState.files, target)
      ? gitState.files[target]
      : null;

    if (status === "untracked" || status === null) {
      return [
        {
          text: "fatal: pathspec '" + target + "' did not match any files",
          tone: "error"
        }
      ];
    }

    /* Файл остаётся на диске, но из индекса уходит: красная метка + удаление. */
    gitState.files[target] = "untracked";

    if (gitState.diskOnly.indexOf(target) === -1) {
      gitState.diskOnly.push(target);
    }

    if (gitState.deletions.indexOf(target) === -1) {
      gitState.deletions.push(target);
    }

    return [
      { text: "rm '" + target + "'", tone: "success" },
      note(
        "Файл убран из индекса, но остался на диске. Следующий коммит закрепит удаление из репозитория."
      )
    ];
  }

  /* ---------- Панель Source Control для бонусного урока (VS Code) ---------- */

  /* Буквы статусов как в VS Code: U — новый, M — изменён, A — в индексе. */
  const VSCODE_LETTERS = {
    untracked: "U",
    modified: "M",
    staged: "A"
  };

  /* Уведомление о коммите ставится в очередь и показывается после отрисовки. */
  let pendingToast = "";
  let toastTimer = 0;

  function showToast(text) {
    const toast = document.querySelector("[data-toast]");
    if (!toast) return;

    toast.textContent = text;
    toast.hidden = false;
    /* Перезапуск анимации, если тост уже на экране. */
    toast.classList.remove("is-visible");
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        toast.hidden = true;
      }, 240);
    }, 2600);
  }

  function renderVscodeList(listEl, items, emptyText) {
    if (!listEl) return;

    listEl.textContent = "";

    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "vscode-empty";
      empty.textContent = emptyText;
      listEl.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      const row = document.createElement("li");
      row.className = "vscode-row";
      row.setAttribute("data-file-name", item.name);

      const name = document.createElement("span");
      name.className = "vscode-file";
      name.textContent = item.name;
      name.title = item.name;
      row.appendChild(name);

      const letter = document.createElement("span");
      letter.className = "vscode-letter";
      letter.textContent = VSCODE_LETTERS[item.status] || "";
      row.appendChild(letter);

      /* Кнопка «+» в VS Code — это git add, в терминале пишем команду. */
      const plus = document.createElement("span");
      plus.className = "vscode-plus";
      plus.textContent = "+";
      plus.title = "в VS Code это git add " + item.name;
      plus.setAttribute("aria-hidden", "true");
      row.appendChild(plus);

      listEl.appendChild(row);
    });
  }

  function renderVscodePanel(files) {
    const changes = files.filter(function (file) {
      return file.status === "untracked" || file.status === "modified";
    });
    const staged = files.filter(function (file) {
      return file.status === "staged";
    });

    renderVscodeList(
      document.querySelector('[data-list="vscode-changes"]'),
      changes,
      "Изменений нет"
    );
    renderVscodeList(
      document.querySelector('[data-list="vscode-staged"]'),
      staged,
      "Ничего не подготовлено"
    );

    const setText = function (selector, value) {
      const node = document.querySelector(selector);
      if (node) node.textContent = String(value);
    };

    setText("[data-vscode-total]", changes.length + staged.length);
    setText("[data-vscode-changes]", changes.length);
    setText("[data-vscode-staged]", staged.length);
    setText("[data-vscode-branch]", gitState.branch);
  }

  /* ---------- Финал курса: экран поздравления и конфетти ---------- */

  const CONFETTI_COLORS = [
    "#c4442a",
    "#f0a13c",
    "#2ea043",
    "#1d4ed8",
    "#7c3aed",
    "#f2734f"
  ];

  /*
   * Лёгкое конфетти на canvas: без библиотек. Частицы летят вниз с вращением,
   * анимация останавливается, когда всё улетело или прошло ~7 секунд.
   * При системной настройке «меньше движения» ничего не запускаем.
   */
  function startConfetti() {
    if (prefersReducedMotion()) return;

    const canvas = document.querySelector("[data-confetti]");
    if (!canvas || typeof canvas.getContext !== "function") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.hidden = false;

    const pieces = [];

    for (let i = 0; i < 120; i += 1) {
      pieces.push({
        x: width * 0.5 + (Math.random() - 0.5) * width * 0.6,
        y: -20 - Math.random() * height * 0.35,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        size: 6 + Math.random() * 8,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.22,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      });
    }

    let frames = 0;

    function draw() {
      frames += 1;
      ctx.clearRect(0, 0, width, height);

      pieces.forEach(function (piece) {
        piece.vy += 0.06;
        piece.vx *= 0.995;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.angle += piece.spin;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        ctx.restore();
      });

      const alive = pieces.some(function (piece) {
        return piece.y < height + 40;
      });

      if (alive && frames < 420) {
        window.requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
        canvas.hidden = true;
      }
    }

    window.requestAnimationFrame(draw);
  }

  /* Финальный экран есть только на последней странице курса. */
  function showFinalScreen(celebrate) {
    const screen = document.querySelector("[data-final-screen]");
    if (!screen || !screen.hidden) return;

    screen.hidden = false;

    if (celebrate) startConfetti();
  }

  /* ---------- Авторство строк: git blame (урок 15) ---------- */

  /* Содержимое index.html, которое «разбирает» blame. */
  const BLAME_CONTENT = [
    "<!DOCTYPE html>",
    '<html lang="ru">',
    "<head>",
    '  <meta charset="UTF-8">',
    "  <title>Мой проект</title>",
    "</head>",
    "<body>",
    "  <h1>Мой проект</h1>",
    "</body>",
    "</html>"
  ];

  /* Дата в формате git blame: 2026-10-25 10:00:00 +0300. */
  function blameDate(date) {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes < 0 ? "-" : "+";
    const absMinutes = Math.abs(offsetMinutes);

    return (
      date.getFullYear() +
      "-" +
      pad2(date.getMonth() + 1) +
      "-" +
      pad2(date.getDate()) +
      " " +
      pad2(date.getHours()) +
      ":" +
      pad2(date.getMinutes()) +
      ":" +
      pad2(date.getSeconds()) +
      " " +
      sign +
      pad2(Math.floor(absMinutes / 60)) +
      pad2(absMinutes % 60)
    );
  }

  /*
   * git blame — для каждой строки файла показывает последний коммит,
   * который её изменил: хеш, автор, дата и номер строки.
   */
  function blameLines(target) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    const name = target || "index.html";

    if (!gitState.commits.length) {
      return [
        {
          text:
            "fatal: no such ref: HEAD (ветка " +
            gitState.branch +
            " ещё не имеет коммитов)",
          tone: "error"
        }
      ];
    }

    const known =
      Boolean(gitState.files[name]) ||
      gitState.commits.some(function (commit) {
        return commit.files.indexOf(name) !== -1;
      });

    if (!known) {
      return [
        { text: "fatal: no such path '" + name + "' in HEAD", tone: "error" }
      ];
    }

    const author = gitState.user.name || "Student";
    const total = gitState.commits.length;

    const lines = BLAME_CONTENT.map(function (content, index) {
      /* Строки распределены по коммитам: верх файла — самый старый. */
      const commitIndex = Math.min(
        total - 1,
        Math.floor((index * total) / BLAME_CONTENT.length)
      );
      const commit = gitState.commits[commitIndex];

      return {
        text:
          commit.hash +
          " (" +
          author +
          " " +
          blameDate(commitDate(commitIndex)) +
          " " +
          pad2(index + 1) +
          ") " +
          content
      };
    });

    lines.push(
      note(
        "Слева — коммит, автор и дата последней правки строки. В реальном Git " +
          "git blame " +
          name +
          " выводит так же."
      )
    );

    return lines;
  }

  /* ---------- Теги версий (урок 13) ---------- */

  /* Теги живут на коммитах, поэтому список собирается по ним. */
  function commitTags() {
    const tags = [];

    gitState.commits.forEach(function (commit) {
      if (commit.tag) tags.push(commit.tag);
    });

    return tags;
  }

  function tagLines(name) {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    /* git tag без аргументов — список тегов, по одному в строке. */
    if (!name) {
      const tags = commitTags();

      if (!tags.length) {
        return [{ text: "Тегов пока нет", tone: "muted" }];
      }

      return tags.map(function (tag) {
        return { text: tag, tone: "success" };
      });
    }

    /*
     * Аннотированный тег: git tag -a v1.0.0 -m "Release 1.0.0".
     * Для метки важно только имя, поэтому отбрасываем флаги и сообщение.
     */
    if (/^-a(\s|$)/.test(name)) {
      name = name.replace(/^-a\s*/, "");

      const messageIndex = name.search(/\s+-m(\s|$)/);

      if (messageIndex !== -1) name = name.slice(0, messageIndex);

      name = name.trim();

      if (!name) {
        return [{ text: "fatal: tag name required", tone: "error" }];
      }
    }

    if (!gitState.commits.length) {
      return [
        {
          text: "fatal: Failed to resolve 'HEAD' as a valid ref.",
          tone: "error"
        },
        note("Сначала создайте хотя бы один коммит.")
      ];
    }

    const last = gitState.commits[gitState.commits.length - 1];

    if (last.tag === name) {
      return [{ text: "fatal: tag '" + name + "' already exists", tone: "error" }];
    }

    last.tag = name;

    return [
      {
        text: "Тег " + name + " закреплён на коммите " + last.hash,
        tone: "success"
      },
      note(
        "Теперь к этой версии можно вернуться командой git checkout " + name + "."
      )
    ];
  }

  /*
   * git log — история коммитов: хеш, автор, дата и сообщение.
   * Как и в настоящем Git, новые коммиты идут сверху.
   */
  function gitLogLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    if (!gitState.commits.length) {
      return [
        {
          text:
            "fatal: your current branch '" +
            gitState.branch +
            "' does not have any commits yet",
          tone: "error"
        }
      ];
    }

    const author =
      gitState.user.name && gitState.user.email
        ? gitState.user.name + " <" + gitState.user.email + ">"
        : "user <user@example.com>";

    const total = gitState.commits.length;
    const lines = [];

    gitState.commits
      .slice()
      .reverse()
      .forEach(function (commit, position) {
        if (position > 0) lines.push({ text: "" });

        lines.push({
          text:
            "commit " +
            commit.hash +
            (position === 0 ? " (HEAD -> " + gitState.branch + ")" : ""),
          tone: "warn"
        });
        lines.push({ text: "Author: " + author, tone: "muted" });
        lines.push({
          text: "Date:   " + formatLogDate(commitDate(total - 1 - position)),
          tone: "muted"
        });
        lines.push({ text: "" });
        lines.push({ text: "    " + commit.message });
      });

    return lines;
  }

  /* Один блок диффа по файлу: заголовок и пара удалённая/добавленная строка. */
  function diffFileBlock(name) {
    return [
      { text: "diff --git a/" + name + " b/" + name, tone: "muted" },
      { text: "index 3f1a9c2..8b4d7e1 100644", tone: "muted" },
      { text: "--- a/" + name, tone: "muted" },
      { text: "+++ b/" + name, tone: "muted" },
      { text: "@@ -4,5 +4,5 @@", tone: "note" },
      { text: "<body>" },
      { text: "- удаленная строка", html: DIFF_REMOVED },
      { text: "+ добавленная строка", html: DIFF_ADDED },
      { text: "</body>" }
    ];
  }

  /*
   * git diff — что изменилось в рабочей директории, но ещё не попало в индекс.
   * Именно так проверяют правки до git add и git commit.
   */
  function gitDiffLines() {
    if (!gitState.initialized) {
      return [{ text: STATUS_ERROR, tone: "error" }];
    }

    const names = Object.keys(gitState.files);
    const modified = names.filter(function (name) {
      return gitState.files[name] === "modified";
    });
    const staged = names.filter(function (name) {
      return gitState.files[name] === "staged";
    });

    /* Рабочая директория сравнивается с индексом — интересны modified-файлы. */
    const targets = modified.length ? modified : staged;
    const lines = [];

    if (!targets.length) {
      lines.push(
        note(
          "Изменённых файлов нет, поэтому показан пример. В реальном Git git diff вывел бы пустой результат."
        )
      );

      return lines.concat(diffFileBlock("index.html"));
    }

    if (!modified.length) {
      lines.push(
        note(
          "Эти правки уже в индексе: в реальном Git их покажет git diff --staged."
        )
      );
    }

    targets.forEach(function (name, index) {
      if (index > 0) lines.push({ text: "" });
      lines.push.apply(lines, diffFileBlock(name));
    });

    return lines;
  }

  function run(raw) {
    const command = raw.trim().replace(/\s+/g, " ");
    if (!command) return;

    const name = command.toLowerCase();

    /* Эхо показывает приглашение на момент ввода, до изменения состояния. */
    const promptBefore = currentPrompt();

    if (!isCommandAllowed(command)) {
      /* Команда вне списка урока: дружелюбная ошибка вместо тишины. */
      const message =
        lessonConfig && lessonConfig.blockedMessage
          ? lessonConfig.blockedMessage
          : UNKNOWN_COMMAND_MESSAGE;
      const tone =
        lessonConfig && lessonConfig.blockedTone
          ? lessonConfig.blockedTone
          : "error";

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
    } else if (name === "git --version" || name === "git version") {
      /* Проверка установки из блока «Предварительные требования». */
      lines = [{ text: GIT_VERSION_OUTPUT }];
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
    } else if (/^git\s+tag(\s|$)/i.test(command)) {
      lines = tagLines(command.replace(/^git\s+tag\s*/i, "").trim());
    } else if (/^git\s+lfs\s+track(\s|$)/i.test(command)) {
      lines = lfsTrackLines(
        command.replace(/^git\s+lfs\s+track\s*/i, "").trim()
      );
    } else if (/^git\s+submodule\s+update(\s|$)/i.test(command)) {
      lines = [
        {
          text: "Submodule path 'library': checked out",
          tone: "muted"
        },
        note(
          "Подмодули в симуляторе — заглушка: сообщение есть, но панели " +
            "не меняются."
        )
      ];
    } else if (/^git\s+submodule\s+add(\s|$)/i.test(command)) {
      lines = submoduleAddLines(
        command.replace(/^git\s+submodule\s+add\s*/i, "").trim()
      );
    } else if (/^git\s+log(\s|$)/i.test(command)) {
      const logTarget = command.replace(/^git\s+log\s*/i, "").trim();

      lines = gitLogLines();

      /* git log -p / -L: симулятор показывает только список коммитов. */
      if (logTarget) {
        lines.unshift(
          note(
            "В симуляторе git log показывает список коммитов; флаги вроде " +
              "-p или -L не раскрываются. Такой вывод есть в настоящем Git."
          )
        );
      }
    } else if (/^git\s+diff(\s|$)/i.test(command)) {
      const diffTarget = command.replace(/^git\s+diff\s*/i, "").trim();

      lines = gitDiffLines();

      /*
       * Аргумент (тег, коммит, --staged) симулятор не разбирает —
       * честно предупреждаем вместо тихой подмены результата.
       */
      if (diffTarget) {
        lines.unshift(
          note(
            "В симуляторе git diff показывает изменения рабочей директории, " +
              "а аргумент не учитывается. В настоящем Git так сравнивают " +
              "версии или индекс."
          )
        );
      }
    } else if (/^git\s+reset(\s|$)/i.test(command)) {
      const resetTarget = command.replace(/^git\s+reset\s*/i, "").trim();

      lines = /^--hard/.test(resetTarget)
        ? hardResetLines(resetTarget)
        : resetLines(resetTarget);
    } else if (/^git\s+reflog(\s|$)/i.test(command)) {
      lines = reflogLines();
    } else if (/^git\s+rm\s+--cached(\s|$)/i.test(command)) {
      lines = rmCachedLines(
        command.replace(/^git\s+rm\s+--cached\s*/i, "").trim()
      );
    } else if (/^git\s+blame(\s|$)/i.test(command)) {
      lines = blameLines(command.replace(/^git\s+blame\s*/i, "").trim());
    } else if (/^git\s+stash\s+pop(\s|$)/i.test(command)) {
      /* pop проверяем раньше stash: иначе его перехватит общая ветка. */
      lines = stashPopLines();
    } else if (/^git\s+stash(\s|$)/i.test(command)) {
      lines = stashLines();
    } else if (/^git\s+restore(\s|$)/i.test(command)) {
      lines = restoreLines(command.replace(/^git\s+restore\s*/i, "").trim());
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
    } else if (/^echo(\s|$)/i.test(command)) {
      const match = command.match(/^echo\s+(.+?)\s*>\s*(\S+)\s*$/i);
      lines = echoLines(match ? match[1] : "", match ? match[2] : "");
    } else if (/^ls(\s|$)/i.test(command)) {
      lines = lsLines();
    } else {
      /* Команда разрешена уроком, но обработчика нет — тоже дружелюбно. */
      lines = [{ text: UNKNOWN_COMMAND_MESSAGE, tone: "error" }];
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

  /*
   * Конфликт живёт только в уроке про конфликты: в других уроках нет команды,
   * которой его можно решить, и пользователь оказался бы в тупике.
   */
  if (!lessonConfig || !lessonConfig.mergeConflict) {
    gitState.conflictActive = false;
  }

  seedReflog();

  completeAutoGoals();

  updatePrompt();
  updateBranchIndicators();
  updateUserChip();
  renderUI();
  renderTasks();
  initReadAcknowledgement();

  /* Сцена урока (если объявлена в конфигурации) и её первая отрисовка. */
  prepareLessonScene();
  renderUI();
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

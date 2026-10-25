# Папка `lessons`

Страницы уроков. В курсе 21 урок, движок у них общий.

## Структура

```
lessons/
├── lesson-1.html        «Введение в Git» — --version, init, status, help
├── lesson-2.html        «Добавление файлов» — touch, git add
├── lesson-3.html        «Фиксация изменений» — git commit
├── lesson-4.html        «Связь с GitHub» — remote add, push
├── lesson-5.html        «Ветвление» — branch, checkout
├── lesson-6.html        «Слияние веток» — checkout, merge
├── lesson-7…21.html     история, отмена, stash, конфликты, теги, reflog,
│                        blame, устройство Git, хуки, LFS, секреты, команда,
│                        VS Code
├── _template.html       шаблон для нового урока
└── README.md
```

## Как добавить урок

1. Скопируйте `_template.html` в `lesson-<N>.html`.
2. Замените eyebrow, вводный абзац и теорию. В начале теории — один
   `<h2 class="theory-title">Урок N. Название</h2>` и блок
   `<aside class="lesson-note">` с заголовком «Зачем это нужно?».
   Подразделы теории — `h3`, абзацы — не длиннее 3–4 предложений.

   Дополнительные плашки: `.lesson-note--important` (фиолетовая, бейдж
   `IMPORTANT`) — для обязательных требований, как установка Git в уроке 1;
   внешняя ссылка-кнопка — `a.btn-download` (синяя, цвет VS Code), как
   «Скачать VS Code» в уроке 21.
3. Задайте ID урока на `<body>`; цели и доступные команды живут
   в `lessonsConfig`:

```html
<body class="page-lesson" data-lesson-id="lesson-7">
```

4. Добавьте в теорию блок задач (движок сам наполнит его целями):

```html
<section class="tasks" aria-labelledby="tasks-title">
  <div class="tasks-head">
    <h3 class="tasks-title" id="tasks-title">Задачи урока</h3>
    <span class="tasks-count" data-tasks-count>0/2</span>
  </div>
  <ul class="tasks-list" data-tasks></ul>
</section>
```

   Чек-лист по умолчанию рендерится единообразно: «Выполнить команду:
   `<code>git …</code>`». Текст задачи берётся из `command` в конфиге.
   Исключение — урок с флагом `descriptiveTasks: true` (так сделан урок 1):
   движок показывает человекочитаемые `label` целей как есть.

5. Опишите урок в `lessonsConfig` внутри `../simulator.js`:

```js
"lesson-7": {
  version: 1,
  allowed: ["help", "clear", "git add", "git commit", "git status"],
  goals: [
    { id: "add", command: "git add ." },
    { id: "commit", command: 'git commit -m "Initial commit"' }
  ]
}
```

   В `allowed` перечислите **все** команды, которые упоминаются в теории:
   иначе читатель увидит «команда недоступна». `label` нужен только
   автоматическим целям (например, коммиту коллеги).

6. Каждое упоминание команды Git в теории оберните ссылкой на Pro Git:

```html
<a class="git-command" href="https://git-scm.com/book/ru/v2/…"
   target="_blank" rel="noopener noreferrer">git status</a>
```

   Ссылка выглядит как код (моноширинный шрифт, рамка, пунктирное
   подчёркивание) и открывается в новой вкладке.

7. Проверьте, что в конце страницы подключены движки:

```html
<script src="../script.js" defer></script>
<script src="../simulator.js" defer></script>
```

8. На главной (`index.html`, `#lesson-list`) добавьте карточку:

```html
<li class="lesson-item">
  <a class="lesson-card" href="lessons/lesson-<N>.html" data-lesson-link>
    <span class="lesson-index">0N</span>
    <div class="lesson-body">
      <h3 class="lesson-title">Название</h3>
      <p class="lesson-desc">Одно предложение о содержании.</p>
    </div>
    <span class="lesson-status" data-status="ready">Доступен</span>
  </a>
</li>
```

8. В предыдущем уроке укажите у кнопки «Следующий урок» новый адрес:

```html
<button class="btn btn-primary btn--locked" type="button"
        data-next-lesson="lesson-<N>.html" disabled>
  Следующий урок →
</button>
```

## Правила

- Один урок — одна самостоятельная HTML-страница, открывается напрямую из файла.
- Общие стили и скрипты подключаются относительными путями:
  `../style.css`, `../script.js`, `../simulator.js`.
- В `<head>` каждого урока нужен инлайн-скрипт инициализации темы: без него
  при переходе с тёмной темы мелькает светлый фон.
- Вся логика терминала — в `../simulator.js`. Отдельных `lesson-N.js`
  в проекте нет: страница подключает только `../script.js` и `../simulator.js`.
- Футер `<footer class="site-footer">` одинаков на главной и во всех уроках
  (шаблон — в `_template.html`): подпись автора со ссылкой на GitHub, ссылка
  «Оставить отзыв на GitHub» и кнопка «Сбросить прогресс». Стили — `.footer-*`
  в `style.css`, подвал прижат к низу экрана (`body` — flex-колонка).
- Список уроков на главной — источник оглавления; при добавлении урока обновите его.
- Доступные команды и цели обязательно продублируйте в `lessonsConfig`
  внутри `../simulator.js`: именно оттуда движок берёт ограничения.

## Статусы уроков на главной

| `data-status` | Значение               |
| ------------- | ---------------------- |
| `soon`        | материал ещё готовится |
| `ready`       | урок доступен          |
| `done`        | урок пройден           |

## Навигация

- Клик по карточке ведёт на урок: ссылка (`href`) работает и без JS,
  `script.js` перехватывает клик как единая точка для будущей логики.
- Внизу урока — «← Назад к списку» (или «← Предыдущий урок»),
  «Следующий урок →» и ссылка на `../index.html#lessons`.
- В футере — единый для всех страниц блок: «Разработано DNKlyosov © 2026»
  (ссылка на профиль), «Нашли ошибку или есть идея? Оставить отзыв на GitHub»
  (ссылка на создание Issue) и кнопка «Сбросить прогресс»
  (`data-reset-progress`, с `confirm`). Она удаляет `git-tutorial:state`
  и уводит на главную; обработчик живёт в `simulator.js` и работает даже
  на страницах без терминала.
- «Следующий урок» — это `<button disabled class="btn--locked">`
  с `data-next-lesson`. Он активируется только после выполнения целей урока.
- Прогресс общий: `gitState` и прогресс уроков сохраняются в `localStorage`
  (`git-tutorial:state`) и загружаются на любой странице урока.

## Валидация и задачи урока

Конфигурация лежит в `simulator.js`:

```js
const lessonsConfig = {
  "lesson-1": {
    version: 1,
    allowed: ["help", "clear", "git init", "git status"],
    goals: [
      { id: "init", command: "git init", label: "git init" },
      { id: "status", command: "git status", label: "git status" }
    ]
  },
  "lesson-2": {
    version: 3,
    needsInit: true,
    allowed: ["help", "clear", "touch", "ls", "git status", "git add", "git init"],
    goals: [
      { id: "touch", command: "touch about.html", label: "Создать файл about.html (команда touch)" },
      { id: "status-untracked", command: "git status", label: "…Untracked…" },
      { id: "add", command: "git add about.html", label: "Добавить файл в индекс" },
      { id: "status-staged", command: "git status", label: "…Staged…" }
    ]
  }
};
```

- ID урока читается из `<body data-lesson-id="…">`; если конфигурации нет
  (например, шаблон), ограничения не действуют.
- `allowed` — семейства команд: запись `git add` разрешает `git add <file>`
  и `git add .`; `touch` разрешает `touch <любой файл>`.
- Команда вне списка не выполняется, при этом терминал отвечает дружелюбно:
  `[Система]: Команда не распознана. Введите help для списка доступных команд.`
  (константа `UNKNOWN_COMMAND_MESSAGE`, тон `error`). Тот же ответ получает
  и выдуманная команда вроде `git hello`, и команда из другого урока.
  Урок может переопределить текст и цвет: `blockedMessage` / `blockedTone`.
- `help` показывает только разрешённые в уроке команды.
- Цели выполняются **строго по порядку**: `completeGoalsFor()` ищет первую
  незакрытую цель и закрывает её, только если команда совпала. Поэтому
  два `git status` в уроке 2 закрывают шаги 2 и 4 по очереди.
- Ошибки (`fatal: …`, `error: …`) цель не закрывают.
- `needsInit: true` — если `gitState.initialized === false`, при загрузке
  печатается предупреждение и предлагается вернуться в урок 1 или выполнить
  `git init`.
- `checkLessonCompletion()` вызывается после каждой команды и при загрузке
  страницы: при выполнении всех целей снимает `disabled` и класс
  `btn--locked` с кнопки «Следующий урок» и один раз печатает зелёное
  поздравление. При загрузке с готовым прогрессом кнопка активируется молча.
- Чек-лист «Задачи урока» — блок `.tasks` с `[data-tasks]` внутри теории;
  `renderTasks()` рисует цели и зелёные галочки, счётчик — `[data-tasks-count]`.
  Урок 1 выводит человекочитаемые подписи целей (`descriptiveTasks: true`) —
  пять пунктов от «Проверить версию Git» до «Проверить статус (git status)».
  Статичные пункты в HTML (как в `lesson-2.html`) — fallback без JavaScript.

## Версии прогресса

`localStorage["git-tutorial:state"]` хранит `{ state, progress }`, где
`progress[lessonId] = { version, completed: [goalId, …] }`.

- Если сохранённая версия урока не совпадает с `version` в конфигурации,
  очищается только прогресс этого урока; `gitState` и прогресс других
  уроков остаются как были.
- Старый формат с общим `completedGoals` мигрирует в прогресс урока 1
  (цели `git init` / `git status`), остальные старые цели отбрасываются.

## Терминал урока

Разметка терминала строится на `data`-атрибутах, поэтому движок не зависит
от конкретной страницы:

```html
<aside class="terminal" data-terminal>
  <div class="terminal-body" data-terminal-body>
    <div class="terminal-history" data-terminal-history role="log" aria-live="polite">
      <!-- строки истории -->
    </div>
    <div class="terminal-input-line">
      <span class="terminal-prompt" data-terminal-prompt aria-hidden="true">user@git-tutorial:~$</span>
      <input class="terminal-input" data-terminal-input type="text" aria-label="Введите команду">
    </div>
  </div>
</aside>
```

`simulator.js`:

- состояние — `let gitState = { initialized, branch, branches, user, files: { … }, commits: [], remote: { … } }`;
  `user` — имя и email из `git config`; статусы файлов:
  `untracked`, `modified`, `staged`, `committed`;
  коммит — `{ hash, message, files, merge? }`;
  сохранение содержит `version`; при смене `PROGRESS_VERSION` старый прогресс
  сбрасывается целиком;
- сохранение — `localStorage["git-tutorial:state"]` в формате
  `{ state, progress }`; пишется после каждой команды, читается и проверяется
  при загрузке (битые данные и старый «голый» state тоже поддерживаются);
- версии прогресса: `progress[lessonId] = { version, completed }`;
  при несовпадении версии сбрасывается только прогресс этого урока;
- `ls` выводит имена файлов рабочей директории;
- приглашение строится из состояния: `user@git-tutorial:~$` или
  `user@git-tutorial:~/project (<ветка>)$`; бейдж `[data-branch]` над
  терминалом обновляется вместе с `git checkout`;
- по Enter добавляет в историю строку `<приглашение> <команда>` и ответ;
  эхо сохраняет приглашение на момент ввода, даже если команда его изменила;
- учебные подсказки: `note("…")` печатает синюю строку
  `[Учебная подсказка]: …` — используется там, где реальный Git молчит
  (`git add`, `git remote add`, `touch`);
- `help` выводит список команд, `clear` очищает историю;
- `git --version` печатает `git version 2.43.0.windows.1` — этой командой урок 1
  проверяет, что Git установлен (блок «Предварительные требования»);
- `git init` переключает `initialized` и печатает `Initialized …` / `Reinitialized …`;
- `touch <file>` создаёт untracked-файл и печатает подсказку;
- `git add <file>` и `git add .` меняют статус на `staged` и печатают
  подсказку; неизвестный файл — красный `fatal: pathspec …`;
- `git commit -m "…"` берёт staged-файлы, генерирует 7-символьный хеш,
  кладёт `{ hash, message, files }` в `gitState.commits`, переводит файлы
  в `committed` и печатает жёлтую строку
  `[master (root-commit) a1b2c3d] Initial commit` со статистикой;
  без staged — красный `nothing to commit, working tree clean`;
- `git remote add origin <url>` сохраняет адрес в `remote.url` и печатает
  подсказку (только после `init`, поддерживается лишь `origin`);
- `git push` копирует `commits` в `remote.commits` и печатает вывод в стиле Git
  (`Enumerating objects…`, `To <url>`, `* [new branch] master -> master`);
  без коммитов — `error: src refspec master does not match any.`,
  без remote — `fatal: No configured push destination.`,
  повторный пуш без изменений — `Everything up-to-date`;
- `git config --global user.name/email …` сохраняет автора, обновляет
  имя в шапке; без автора `git commit` возвращает
  `*** Please tell me who you are.`;
- `git fetch` печатает, что изменения скачаны, но не применены;
- `git pull origin master` переносит новые коммиты из `remote.commits`
  в локальную историю и сообщает «Файлы обновлены…»;
- `git branch [name]` показывает ветки или создаёт новую;
- `git checkout <branch>` переключает ветку, обновляет приглашение и бейдж;
- `git merge <branch>` добавляет коммит слияния с `merge: true` (карточка
  с меткой «merge») и печатает `Merge made by the 'ort' strategy.`;
- `git status` без репозитория — красный `fatal: not a git repository…`,
  с репозиторием — `On branch <ветка>`, `No commits yet`, зелёный блок
  `Changes to be committed` и красный `Untracked files`; после коммита —
  `nothing to commit, working tree clean`;
- после каждой команды вызываются `renderUI()`, `renderTasks()`,
  `checkLessonCompletion()` и `saveState()`;
- клик по любому месту `.terminal` ставит фокус в поле ввода (`preventScroll`);
- вывод собирается через `textContent`, поэтому введённый текст не может
  внедрить разметку.

## Дашборд состояния

Три панели-«проводника» живут в `.dashboard` и обновляются из `renderUI()`:

```html
<aside class="dashboard">
  <section class="explorer">
    <header class="explorer-bar">
      <svg class="explorer-icon">…</svg>
      <h2 class="explorer-title">Working Directory (VS Code)</h2>
      <span class="explorer-count" data-count="workdir">0</span>
    </header>
    <ul class="file-list" data-list="workdir"></ul>
  </section>
  <!-- staging: data-list="staged", repo: data-list="repo" -->
</aside>
```

- Working Directory — все файлы папки; бейдж показывает статус, у закоммиченных
  файлов — зелёная галочка `✓`;
- Staging Area — файлы в статусе `staged`;
- Local Repository — карточки коммитов (новые сверху): оранжевый хеш,
  сообщение и иконки файлов; у отправленных коммитов — зелёная метка `✓ pushed`;
- строки собираются в JS: иконка файла (цвет зависит от расширения),
  имя и бейдж статуса; пустые панели показывают заглушку.

Панели намеренно светлые в обеих темах — как окна VS Code.

## Бонусный урок: панель Source Control

В `lesson-21.html` три колонки дашборда заменены одной копией панели
Source Control: `.vscode-panel` стоит третьей колонкой справа, липнет при
прокрутке (`position: sticky`) и на узких экранах уезжает под теорию.

```html
<aside class="vscode-panel">
  <div class="vscode-titlebar">…<span class="vscode-count" data-vscode-total>0</span></div>
  <div class="vscode-body">
    <ul class="vscode-list" data-list="vscode-changes"></ul>
    <ul class="vscode-list" data-list="vscode-staged"></ul>
  </div>
</aside>
```

- `renderVscodePanel()` рисует файлы из того же `gitState`: Changes —
  рабочая директория, Staged Changes — индекс; буквы статусов как в редакторе
  (`U` — новый, `M` — изменён, `A` — в индексе);
- после `git commit` в этом уроке всплывает уведомление
  «Successfully committed» — им занимается `showToast()` и `pendingToast`;
- команды урока (`git add .`, `git commit -m "…"`, `git push`) настраиваются
  в `lessonsConfig`, отдельного кода для панели не нужно.

Теория урока построена вокруг одной мысли: терминал и интерфейс делают одно
и то же. Отсюда четыре блока — введение и установка, связка с GitHub
(`Accounts` → *Sign in with GitHub* или `git config`), таблица-шпаргалка
«терминал против кнопок» и практика в симуляции.

Шпаргалка лежит в обычном `<table>` внутри `.lesson-table` (обёртка даёт
рамку и скругление, ячейки переносятся через `overflow-wrap: anywhere`):

```html
<div class="lesson-table">
  <table>
    <thead>
      <tr><th scope="col">Действие</th><th scope="col">Терминал</th><th scope="col">Кнопки в VS Code</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Сделать коммит</th><td>git commit -m "…"</td><td>галочка ✓ Commit</td></tr>
    </tbody>
  </table>
</div>
```

## Удалённый репозиторий

Под тремя колонками лежит широкая панель `.remote` в стиле GitHub:

```html
<section class="remote">
  <header class="explorer-bar">
    <h2 class="explorer-title" id="remote-title">Remote Repository (GitHub)</h2>
    <span class="explorer-count" data-count="remote">0</span>
  </header>
  <div class="gh-profile">
    <span class="gh-avatar">…</span>
    <span class="gh-repo">user / my-git-project</span>
    <span class="gh-public">Public</span>
    <span class="gh-remote-url" data-remote-url>origin не настроен</span>
  </div>
  <ul class="gh-commits" data-list="remote"></ul>
</section>
```

- `renderRemoteList()` рисует коммиты из `gitState.remote.commits`: аватар,
  сообщение, строка `user committed <hash>`;
- пока remote не настроен, показывается подсказка про `git remote add origin`;
- URL remote выводится в шапке (`data-remote-url`);
- `isPushed(hash)` используется в Local Repository для метки `✓ pushed`.

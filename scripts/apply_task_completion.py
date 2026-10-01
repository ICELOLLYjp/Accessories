from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)


css_old = """    .task-row .stock-field {
      flex: 1 1 0;
      min-width: 0;
    }
"""
css_new = """    .task-row .stock-field {
      flex: 1 1 0;
      min-width: 0;
    }

    .task-completion-actions {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .task-complete-btn,
    .task-partial-btn {
      min-height: 28px;
      padding: 4px 9px;
      border-radius: 8px;
      border: 1px solid var(--line);
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .task-complete-btn {
      background: var(--ink);
      color: #fff;
      border-color: var(--ink);
    }

    .task-partial-btn {
      background: #fff;
      color: var(--ink-soft);
    }

    .chip.task-complete-all {
      background: #5F6778;
      color: #fff;
      border-color: #5F6778;
    }
"""
replace_once(css_old, css_new, "css")

task_old = """          <div class=\"stock-pair task-pair\">
            <div class=\"task-title\">制作タスク</div>
            <div class=\"task-row\">
              <div class=\"stock-field\">
                <span class=\"fld-lbl\">ピアス</span>
                ${stepperHtml(item, \"taskPiercing\", \"#E8A33D\")}
              </div>

              <div class=\"stock-field\">
                <span class=\"fld-lbl\">イヤリング</span>
                ${stepperHtml(item, \"taskEarring\", \"#E8A33D\")}
              </div>
            </div>
          </div>
"""
task_new = """          <div class=\"stock-pair task-pair\">
            <div class=\"task-title\">制作タスク</div>
            <div class=\"task-row\">
              <div class=\"stock-field\">
                <span class=\"fld-lbl\">ピアス</span>
                ${stepperHtml(item, \"taskPiercing\", \"#E8A33D\")}
              </div>

              <div class=\"stock-field\">
                <span class=\"fld-lbl\">イヤリング</span>
                ${stepperHtml(item, \"taskEarring\", \"#E8A33D\")}
              </div>
            </div>

            ${taskTotal > 0 ? `
              <div class=\"task-completion-actions\">
                <button
                  type=\"button\"
                  class=\"task-complete-btn\"
                  data-action=\"complete-item-tasks\"
                  data-id=\"${escapeHtml(item.id)}\"
                >全部完了</button>

                ${taskPiercing > 0 ? `
                  <button
                    type=\"button\"
                    class=\"task-partial-btn\"
                    data-action=\"partial-complete-task\"
                    data-id=\"${escapeHtml(item.id)}\"
                    data-field=\"taskPiercing\"
                  >ピアス一部</button>
                ` : \"\"}

                ${taskEarring > 0 ? `
                  <button
                    type=\"button\"
                    class=\"task-partial-btn\"
                    data-action=\"partial-complete-task\"
                    data-id=\"${escapeHtml(item.id)}\"
                    data-field=\"taskEarring\"
                  >イヤリング一部</button>
                ` : \"\"}
              </div>
            ` : \"\"}
          </div>
"""
replace_once(task_old, task_new, "task block")

filtered_old = """      const filtered = getFiltered();

      const priorityItems = filtered.filter((item) => Number(item.priority || 0) > 0);
"""
filtered_new = """      const filtered = getFiltered();
      const visibleProductionTotal = filtered.reduce(
        (sum, item) => sum + Number(item.taskPiercing || 0) + Number(item.taskEarring || 0),
        0
      );

      const priorityItems = filtered.filter((item) => Number(item.priority || 0) > 0);
"""
replace_once(filtered_old, filtered_new, "filtered total")

bulk_old = """          <button
            type=\"button\"
            class=\"chip${state.productionOnly ? \" task-active\" : \"\"}\"
            data-action=\"production-only\"
          >制作タスクあり</button>

          <select id=\"stockSort\" class=\"sort-select\" aria-label=\"在庫数で並び替え\">
"""
bulk_new = """          <button
            type=\"button\"
            class=\"chip${state.productionOnly ? \" task-active\" : \"\"}\"
            data-action=\"production-only\"
          >制作タスクあり</button>

          ${visibleProductionTotal > 0 ? `
            <button
              type=\"button\"
              class=\"chip task-complete-all\"
              data-action=\"complete-visible-tasks\"
            >表示中をすべて完了</button>
          ` : \"\"}

          <select id=\"stockSort\" class=\"sort-select\" aria-label=\"在庫数で並び替え\">
"""
replace_once(bulk_old, bulk_new, "bulk button")

handler_old = """      if (action === \"production-only\") {
        state.productionOnly = !state.productionOnly;
        render();
        return;
      }

      if (action === \"toggle-priority\") {
"""
handler_new = """      if (action === \"production-only\") {
        state.productionOnly = !state.productionOnly;
        render();
        return;
      }

      if (action === \"complete-item-tasks\") {
        const id = button.dataset.id;
        const item = state.designs.find((entry) => entry.id === id);
        if (!item) return;

        const taskPiercing = Math.max(0, Number(item.taskPiercing || 0));
        const taskEarring = Math.max(0, Number(item.taskEarring || 0));
        const completed = taskPiercing + taskEarring;
        if (completed <= 0) return;

        item.piercing = Math.max(0, Number(item.piercing || 0)) + taskPiercing;
        item.earring = Math.max(0, Number(item.earring || 0)) + taskEarring;
        item.taskPiercing = 0;
        item.taskEarring = 0;

        saveDesigns();
        render();
        return;
      }

      if (action === \"partial-complete-task\") {
        const id = button.dataset.id;
        const taskField = button.dataset.field;
        const stockFieldMap = {
          taskPiercing: \"piercing\",
          taskEarring: \"earring\"
        };
        const stockField = stockFieldMap[taskField];
        const item = state.designs.find((entry) => entry.id === id);
        if (!item || !stockField) return;

        const taskCount = Math.max(0, Number(item[taskField] || 0));
        if (taskCount <= 0) return;

        const label = taskField === \"taskPiercing\" ? \"ピアス\" : \"イヤリング\";
        const raw = window.prompt(`${label}を何個完成しましたか？（タスク残り ${taskCount}）`, \"1\");
        if (raw === null) return;

        const trimmed = raw.trim();
        if (!/^\\d+$/.test(trimmed)) {
          window.alert(\"1以上の整数を入力してください。\");
          return;
        }

        const amount = Number(trimmed);
        if (amount < 1 || amount > taskCount) {
          window.alert(`1から${taskCount}までの数を入力してください。`);
          return;
        }

        item[stockField] = Math.max(0, Number(item[stockField] || 0)) + amount;
        item[taskField] = taskCount - amount;

        saveDesigns();
        render();
        return;
      }

      if (action === \"complete-visible-tasks\") {
        const targets = getFiltered().filter(
          (item) => Number(item.taskPiercing || 0) + Number(item.taskEarring || 0) > 0
        );
        const completed = targets.reduce(
          (sum, item) => sum + Number(item.taskPiercing || 0) + Number(item.taskEarring || 0),
          0
        );
        if (completed <= 0) return;

        if (!window.confirm(`${targets.length}デザイン、合計${completed}点の制作タスクを在庫へ反映します。`)) {
          return;
        }

        targets.forEach((item) => {
          const taskPiercing = Math.max(0, Number(item.taskPiercing || 0));
          const taskEarring = Math.max(0, Number(item.taskEarring || 0));
          item.piercing = Math.max(0, Number(item.piercing || 0)) + taskPiercing;
          item.earring = Math.max(0, Number(item.earring || 0)) + taskEarring;
          item.taskPiercing = 0;
          item.taskEarring = 0;
        });

        saveDesigns();
        render();
        return;
      }

      if (action === \"toggle-priority\") {
"""
replace_once(handler_old, handler_new, "handlers")

path.write_text(text, encoding="utf-8")

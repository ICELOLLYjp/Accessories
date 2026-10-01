from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")
original = text


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)


# Visual treatment for production tasks and their filter/badge.
replace_once(
    "    .stock-pair {\n",
    "    .task-pair {\n"
    "      background: #FFF8E8;\n"
    "      border: 1px solid #F0D397;\n"
    "      border-radius: 10px;\n"
    "      padding: 9px;\n"
    "      margin-top: 9px;\n"
    "    }\n\n"
    "    .task-title {\n"
    "      width: 100%;\n"
    "      font-size: 11px;\n"
    "      font-weight: 800;\n"
    "      color: #9B6512;\n"
    "    }\n\n"
    "    .badge-task {\n"
    "      background: #FFF3DA;\n"
    "      color: #9B6512;\n"
    "    }\n\n"
    "    .chip.task-active {\n"
    "      background: #E8A33D;\n"
    "      color: #fff;\n"
    "      border-color: #E8A33D;\n"
    "    }\n\n"
    "    .stock-pair {\n",
    "task CSS",
)

# Add production task quantities to every newly created design object.
needle = "earring: 0,\n          priority: 0"
count = text.count(needle)
if count < 2:
    raise SystemExit(f"new design fields: expected at least 2 matches, found {count}")
text = text.replace(
    needle,
    "earring: 0,\n          taskPiercing: 0,\n          taskEarring: 0,\n          priority: 0",
)

# Normalize legacy/local/cloud data so older records get task quantities of zero.
pattern = re.compile(
    r"(earring: Math\.max\(0, Number\(item\.earring \|\| 0\)\),\n)(\s*)priority:"
)
text, normalized_count = pattern.subn(
    lambda m: m.group(1)
    + m.group(2)
    + "taskPiercing: Math.max(0, Number(item.taskPiercing || 0)),\n"
    + m.group(2)
    + "taskEarring: Math.max(0, Number(item.taskEarring || 0)),\n"
    + m.group(2)
    + "priority:",
    text,
)
if normalized_count < 2:
    raise SystemExit(f"normalization: expected at least 2 matches, found {normalized_count}")

replace_once(
    '      priorityOnly: false,\n      stockSort: "default",',
    '      priorityOnly: false,\n      productionOnly: false,\n      stockSort: "default",',
    "production filter state",
)

replace_once(
    "      let zero = 0;\n",
    "      let zero = 0;\n      let productionTotal = 0;\n",
    "production total declaration",
)

replace_once(
    "        const total = piercing + earring;\n\n        if (item.category === \"standard\") {",
    "        const total = piercing + earring;\n"
    "        const taskPiercing = Number(item.taskPiercing || 0);\n"
    "        const taskEarring = Number(item.taskEarring || 0);\n"
    "        productionTotal += taskPiercing + taskEarring;\n\n"
    "        if (item.category === \"standard\") {",
    "production total accumulation",
)

replace_once(
    "        puraplaraEarring,\n        zero\n      };",
    "        puraplaraEarring,\n        zero,\n        productionTotal\n      };",
    "production total return",
)

replace_once(
    "        if (state.priorityOnly && Number(item.priority || 0) <= 0) {\n          return false;\n        }\n\n        return true;",
    "        if (state.priorityOnly && Number(item.priority || 0) <= 0) {\n"
    "          return false;\n"
    "        }\n\n"
    "        if (state.productionOnly) {\n"
    "          const productionTotal = Number(item.taskPiercing || 0) + Number(item.taskEarring || 0);\n"
    "          if (productionTotal <= 0) return false;\n"
    "        }\n\n"
    "        return true;",
    "production-only filtering",
)

replace_once(
    "    function stepperHtml(item, field, accent) {\n      const value = Math.max(0, Number(item[field] || 0));\n\n      return `",
    "    function stepperHtml(item, field, accent) {\n"
    "      const value = Math.max(0, Number(item[field] || 0));\n"
    "      const fieldLabels = {\n"
    "        piercing: \"ピアス在庫\",\n"
    "        earring: \"イヤリング在庫\",\n"
    "        taskPiercing: \"ピアス制作タスク\",\n"
    "        taskEarring: \"イヤリング制作タスク\"\n"
    "      };\n\n"
    "      return `",
    "stepper field labels",
)

replace_once(
    '            aria-label="${field === "piercing" ? "ピアス在庫" : "イヤリング在庫"}"',
    '            aria-label="${fieldLabels[field] || "数量"}"',
    "stepper aria label",
)

replace_once(
    "      const priority = Number(item.priority || 0);\n\n      return `",
    "      const priority = Number(item.priority || 0);\n"
    "      const taskPiercing = Number(item.taskPiercing || 0);\n"
    "      const taskEarring = Number(item.taskEarring || 0);\n"
    "      const taskTotal = taskPiercing + taskEarring;\n\n"
    "      return `",
    "card task total",
)

replace_once(
    "            ${priority > 0 ? `<span class=\"badge badge-priority\">制作優先 ${priority}</span>` : \"\"}\n            ${shared ? '<span class=\"badge badge-shared\">同名デザインあり</span>' : \"\"}",
    "            ${priority > 0 ? `<span class=\"badge badge-priority\">制作優先 ${priority}</span>` : \"\"}\n"
    "            ${taskTotal > 0 ? `<span class=\"badge badge-task\">制作 ${taskTotal}点</span>` : \"\"}\n"
    "            ${shared ? '<span class=\"badge badge-shared\">同名デザインあり</span>' : \"\"}",
    "production task badge",
)

replace_once(
    "          </div>\n        </div>\n      `;\n    }\n\n    function priorityHtml",
    "          </div>\n\n"
    "          <div class=\"stock-pair task-pair\">\n"
    "            <div class=\"task-title\">制作タスク</div>\n"
    "            <div class=\"stock-field\">\n"
    "              <span class=\"fld-lbl\">ピアス</span>\n"
    "              ${stepperHtml(item, \"taskPiercing\", \"#E8A33D\")}\n"
    "            </div>\n\n"
    "            <div class=\"stock-field\">\n"
    "              <span class=\"fld-lbl\">イヤリング</span>\n"
    "              ${stepperHtml(item, \"taskEarring\", \"#E8A33D\")}\n"
    "            </div>\n"
    "          </div>\n"
    "        </div>\n"
    "      `;\n"
    "    }\n\n"
    "    function priorityHtml",
    "production task controls",
)

replace_once(
    "          <div class=\"stat-card zero\">\n            <div class=\"num\">${stats.zero}</div>\n            <div class=\"lbl\">在庫切れ</div>\n          </div>\n        </div>",
    "          <div class=\"stat-card zero\">\n"
    "            <div class=\"num\">${stats.zero}</div>\n"
    "            <div class=\"lbl\">在庫切れ</div>\n"
    "          </div>\n\n"
    "          <div class=\"stat-card\">\n"
    "            <div class=\"num\">${stats.productionTotal}</div>\n"
    "            <div class=\"lbl\">制作予定<br>合計</div>\n"
    "          </div>\n"
    "        </div>",
    "production total stat card",
)

replace_once(
    "          <button\n            type=\"button\"\n            class=\"chip${state.priorityOnly ? \" priority-active\" : \"\"}\"\n            data-action=\"priority-only\"\n          >★ 優先のみ</button>\n\n          <select id=\"stockSort\"",
    "          <button\n"
    "            type=\"button\"\n"
    "            class=\"chip${state.priorityOnly ? \" priority-active\" : \"\"}\"\n"
    "            data-action=\"priority-only\"\n"
    "          >★ 優先のみ</button>\n\n"
    "          <button\n"
    "            type=\"button\"\n"
    "            class=\"chip${state.productionOnly ? \" task-active\" : \"\"}\"\n"
    "            data-action=\"production-only\"\n"
    "          >制作タスクあり</button>\n\n"
    "          <select id=\"stockSort\"",
    "production filter button",
)

replace_once(
    "      if (action === \"priority-only\") {\n        state.priorityOnly = !state.priorityOnly;\n        render();\n        return;\n      }\n\n      if (action === \"toggle-priority\") {",
    "      if (action === \"priority-only\") {\n"
    "        state.priorityOnly = !state.priorityOnly;\n"
    "        render();\n"
    "        return;\n"
    "      }\n\n"
    "      if (action === \"production-only\") {\n"
    "        state.productionOnly = !state.productionOnly;\n"
    "        render();\n"
    "        return;\n"
    "      }\n\n"
    "      if (action === \"toggle-priority\") {",
    "production filter click handler",
)

if text == original:
    raise SystemExit("No changes were made")

path.write_text(text, encoding="utf-8")
print("Applied production task fields, UI, stats, filtering, and persistence normalization.")

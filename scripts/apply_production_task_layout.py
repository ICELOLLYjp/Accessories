from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")

old_css = '''    .stock-pair.task-pair {
      background: #FFF8E8;
      border: 1px solid #F0D397;
      border-radius: 10px;
      padding: 9px;
      margin-top: 9px;
    }

    .task-title {
      width: 100%;
      font-size: 11px;
      font-weight: 800;
      color: #9B6512;
    }
'''

new_css = '''    .stock-pair.task-pair {
      display: block;
      background: #F3F4F7;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 9px 6px;
      margin-top: 9px;
    }

    .task-title {
      width: 100%;
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 800;
      color: var(--ink-soft);
    }

    .task-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      flex-wrap: nowrap;
    }

    .task-row .stock-field {
      flex: 1 1 0;
      min-width: 0;
    }
'''

old_markup = '''          <div class="stock-pair task-pair">
            <div class="task-title">制作タスク</div>
            <div class="stock-field">
              <span class="fld-lbl">ピアス</span>
              ${stepperHtml(item, "taskPiercing", "#E8A33D")}
            </div>

            <div class="stock-field">
              <span class="fld-lbl">イヤリング</span>
              ${stepperHtml(item, "taskEarring", "#E8A33D")}
            </div>
          </div>'''

new_markup = '''          <div class="stock-pair task-pair">
            <div class="task-title">制作タスク</div>
            <div class="task-row">
              <div class="stock-field">
                <span class="fld-lbl">ピアス</span>
                ${stepperHtml(item, "taskPiercing", "#E8A33D")}
              </div>

              <div class="stock-field">
                <span class="fld-lbl">イヤリング</span>
                ${stepperHtml(item, "taskEarring", "#E8A33D")}
              </div>
            </div>
          </div>'''

if old_css not in text:
    raise SystemExit("Current production task CSS block was not found")
if old_markup not in text:
    raise SystemExit("Current production task markup block was not found")

text = text.replace(old_css, new_css, 1)
text = text.replace(old_markup, new_markup, 1)
path.write_text(text, encoding="utf-8")

updated = path.read_text(encoding="utf-8")
assert "background: #F3F4F7" in updated
assert 'class="task-row"' in updated
assert "background: #FFF8E8" not in updated
print("Production task layout updated.")

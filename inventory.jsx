import { useState, useEffect, useRef, useMemo } from "react";

// ---------- seed data (読み取ったデザイン一覧。手書きで判読しづらかった一部は省略しています) ----------

const STANDARD_NAMES = [
  "ハリネズミ","りんご","気球","パンダ","ねこ","ひよこ","ホットケーキ","女の子","宇宙飛行士","くま",
  "覆面レスラー","牛","黒やぎ","白やぎ","家","車","目玉焼き","インコ","ろーりーくん","うさぎ",
  "パズルA","白オカメインコ","のりおにぎり","オムライス","ぶた","マトリョーシカ","チョコドーナツ","柴犬","シュナウザー","プードル",
  "フレンチブルドッグ","くじゃく","サボテン(丸)","寿司(マグロ)","サメ","フラミンゴ","きのこ(長)","クロネコ","フクロウ","文鳥(グレー)",
  "エイリアン(緑)","アザラシ","シロクマ","ナマケモノ","ラッコ","バイキン","トマト","ペンギン","赤ずきん","アリス",
  "白雪姫","はにわ","タコ","カモ(オス)","キウイ","ジンベエザメ(ブルー)","ライオン","エイ(背中)","だるま(赤)","クマ",
  "カラス","マンボウ","ヨット","クマノミ","UFO","メンダコ","Vライチョウ(冬)","タヌキ","キツネ","ユニコーン",
  "招き猫","カモメ","ウミウシ","リス","イチゴ","スイカ(赤)","コアラ","原始人","プリン","パンク",
  "ファンク","赤おに","ティラノ","エナガ","ゴリラ","マグロ","ファラオくん","にんにく","ハロウィン","タコス",
  "カバ","あひる",
];

const PURAPURA_NAMES = [
  "コアラ","キノコ","フレブル(黒)","フレブル(白)","ねこ(グレー)","ねこ(ぶち)","ねこ(白)","ねこ(黒)","ペンギン","カメレオン",
  "オカメインコ","セキセイインコ","ぶた","おにぎり","ロブスター×カニ","柴犬","ボーリング","漫才","フラガール","しろくま",
  "たこさんウインナー×目玉焼き","ろーりーくん","うさぎ","ハムスター","牛","虎","ハイヒール","恐竜","サメ","羊",
  "マンタ","ライオン","エイ","スイカ","うま","サンタ","カバ","くじら","プードル","ヤギ",
];

function makeSeed() {
  const list = [];
  let n = 0;
  for (const name of STANDARD_NAMES) {
    n += 1;
    list.push({ id: "std-" + n, name, category: "standard", piercing: 0, earring: 0 });
  }
  n = 0;
  for (const name of PURAPURA_NAMES) {
    n += 1;
    list.push({ id: "pp-" + n, name, category: "puraplara", piercing: 0, earring: 0 });
  }
  return list;
}

const STORAGE_KEY = "accessory-inventory-designs-v1";

const CATEGORY_INFO = {
  standard: { label: "スタンダード", sub: "スタンダード", color: "#2EC4B6" },
  puraplara: { label: "プラプラ", sub: "プラプラ", color: "#F45B8D" },
};

function Stepper({ value, onChange, accent }) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        style={{ "--accent": accent }}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="1減らす"
      >
        −
      </button>
      <input
        className="stepper-num"
        type="number"
        min="0"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          onChange(Number.isNaN(v) ? 0 : Math.max(0, v));
        }}
      />
      <button
        type="button"
        className="stepper-btn"
        style={{ "--accent": accent }}
        onClick={() => onChange(value + 1)}
        aria-label="1増やす"
      >
        +
      </button>
    </div>
  );
}

export default function InventoryApp() {
  const [designs, setDesigns] = useState(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [zeroOnly, setZeroOnly] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'add' | 'bulk'
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("standard");
  const [bulkText, setBulkText] = useState("");
  const [bulkCategory, setBulkCategory] = useState("standard");
  const [savedFlash, setSavedFlash] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          setDesigns(JSON.parse(res.value));
        } else {
          setDesigns(makeSeed());
        }
      } catch {
        setDesigns(makeSeed());
      } finally {
        loadedRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current || designs === null) return;
    (async () => {
      try {
        const ok = await window.storage.set(STORAGE_KEY, JSON.stringify(designs), false);
        if (ok) {
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 900);
        }
      } catch {
        // best effort
      }
    })();
  }, [designs]);

  const nameCounts = useMemo(() => {
    if (!designs) return {};
    const m = {};
    for (const d of designs) m[d.name] = (m[d.name] || 0) + 1;
    return m;
  }, [designs]);

  const stats = useMemo(() => {
    if (!designs) return { total: 0, pieces: 0, zero: 0 };
    let pieces = 0;
    let zero = 0;
    for (const d of designs) {
      const t = d.piercing + d.earring;
      pieces += t;
      if (t === 0) zero += 1;
    }
    return { total: designs.length, pieces, zero };
  }, [designs]);

  const filtered = useMemo(() => {
    if (!designs) return [];
    const q = query.trim().toLowerCase();
    return designs.filter((d) => {
      if (catFilter !== "all" && d.category !== catFilter) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (zeroOnly) {
        const t = d.piercing + d.earring;
        if (t !== 0) return false;
      }
      return true;
    });
  }, [designs, query, catFilter, zeroOnly]);

  const grouped = useMemo(() => {
    const g = { standard: [], puraplara: [] };
    for (const d of filtered) g[d.category].push(d);
    return g;
  }, [filtered]);

  function updateDesign(id, patch) {
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function deleteDesign(id) {
    setDesigns((prev) => prev.filter((d) => d.id !== id));
  }

  function addOne(name, category) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDesigns((prev) => [
      ...prev,
      { id: category + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), name: trimmed, category, piercing: 0, earring: 0 },
    ]);
  }

  function handleAddSubmit(e) {
    e.preventDefault();
    addOne(newName, newCategory);
    setNewName("");
    setPanel(null);
  }

  function handleBulkSubmit(e) {
    e.preventDefault();
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    setDesigns((prev) => {
      const additions = lines.map((name, i) => ({
        id: bulkCategory + "-bulk-" + Date.now() + "-" + i,
        name,
        category: bulkCategory,
        piercing: 0,
        earring: 0,
      }));
      return [...prev, ...additions];
    });
    setBulkText("");
    setPanel(null);
  }

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        .app-root {
          --bg: #EFF1F6;
          --ink: #262A3D;
          --ink-soft: #6B7086;
          --surface: #FFFFFF;
          --line: #DFE2EC;
          --standard: #2EC4B6;
          --standard-soft: #E4F9F6;
          --puraplara: #F45B8D;
          --puraplara-soft: #FEE9F0;
          --gold: #E8A33D;
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100%;
          padding: 20px 16px 60px;
          box-sizing: border-box;
        }
        .app-root * { box-sizing: border-box; }

        .header { margin-bottom: 18px; }
        .header h1 {
          font-family: 'Baloo 2', sans-serif;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .header p {
          margin: 0;
          color: var(--ink-soft);
          font-size: 14px;
        }
        .save-flash {
          display: inline-block;
          margin-left: 8px;
          font-size: 12px;
          color: var(--standard);
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .save-flash.show { opacity: 1; }

        .stats-row {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 10px 16px;
          min-width: 100px;
          flex: 1;
        }
        .stat-card .num {
          font-family: 'Baloo 2', sans-serif;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.1;
        }
        .stat-card .lbl {
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 2px;
        }
        .stat-card.zero .num { color: var(--puraplara); }

        .controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
          align-items: center;
        }
        .search-input {
          flex: 1;
          min-width: 140px;
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: var(--surface);
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }
        .search-input:focus { outline: 2px solid var(--gold); outline-offset: 1px; }

        .chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: var(--surface);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-soft);
          cursor: pointer;
          white-space: nowrap;
        }
        .chip.active-all { background: var(--ink); color: #fff; border-color: var(--ink); }
        .chip.active-standard { background: var(--standard); color: #fff; border-color: var(--standard); }
        .chip.active-puraplara { background: var(--puraplara); color: #fff; border-color: var(--puraplara); }
        .chip.zero-active { background: var(--gold); color: #fff; border-color: var(--gold); }

        .btn {
          padding: 9px 16px;
          border-radius: 999px;
          border: none;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }
        .btn-primary { background: var(--ink); color: #fff; }
        .btn-ghost { background: var(--surface); color: var(--ink); border: 1px solid var(--line); }

        .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .panel h3 { margin: 0 0 10px; font-family: 'Baloo 2', sans-serif; font-size: 17px; }
        .panel form { display: flex; flex-direction: column; gap: 10px; }
        .panel input[type="text"], .panel textarea {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          width: 100%;
        }
        .panel textarea { min-height: 110px; resize: vertical; }
        .radio-row { display: flex; gap: 14px; font-size: 13px; color: var(--ink-soft); }
        .radio-row label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
        .panel-actions { display: flex; gap: 8px; justify-content: flex-end; }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 22px 0 10px;
        }
        .section-title .dot { width: 10px; height: 10px; border-radius: 50%; }
        .section-title h2 {
          font-family: 'Baloo 2', sans-serif;
          font-size: 17px;
          margin: 0;
        }
        .section-title .count {
          font-size: 12px;
          color: var(--ink-soft);
          background: var(--surface);
          border: 1px solid var(--line);
          padding: 2px 9px;
          border-radius: 999px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }

        .card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px;
          position: relative;
        }
        .card.zero-stock { border-color: var(--puraplara); }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          margin-bottom: 8px;
        }
        .card-name {
          font-weight: 700;
          font-size: 14px;
          line-height: 1.3;
        }
        .card-del {
          background: none;
          border: none;
          color: var(--ink-soft);
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
          flex-shrink: 0;
        }
        .card-del:hover { color: var(--puraplara); }

        .badge-row { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
        .badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .badge-standard { background: var(--standard-soft); color: #1B8A80; }
        .badge-puraplara { background: var(--puraplara-soft); color: #C93368; }
        .badge-shared { background: #FFF3DA; color: #A66C10; }
        .badge-out { background: #FCE4E4; color: #C93030; }

        .stock-pair {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--line);
          flex-wrap: wrap;
        }
        .stock-field {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .stock-field .fld-lbl { font-size: 11px; color: var(--ink-soft); flex-shrink: 0; }

        .stepper { display: flex; align-items: center; gap: 4px; }
        .stepper-btn {
          width: 24px; height: 24px;
          border-radius: 7px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--accent, var(--ink));
          font-weight: 700;
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .stepper-num {
          width: 40px;
          text-align: center;
          border: 1px solid var(--line);
          border-radius: 7px;
          padding: 3px 2px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
        }

        .empty-state {
          text-align: center;
          padding: 40px 16px;
          color: var(--ink-soft);
          font-size: 14px;
        }
      `}</style>

      <div className="header">
        <h1>
          アクセサリー在庫
          <span className={"save-flash" + (savedFlash ? " show" : "")}>保存しました</span>
        </h1>
        <p>デザイン単位で在庫を管理します。同じデザイン名は自動でリンク表示されます。</p>
      </div>

      {designs === null ? (
        <div className="empty-state">読み込み中…</div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="num">{stats.total}</div>
              <div className="lbl">デザイン数</div>
            </div>
            <div className="stat-card">
              <div className="num">{stats.pieces}</div>
              <div className="lbl">総在庫数(点)</div>
            </div>
            <div className="stat-card zero">
              <div className="num">{stats.zero}</div>
              <div className="lbl">在庫切れ</div>
            </div>
          </div>

          <div className="controls">
            <input
              className="search-input"
              placeholder="デザイン名で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className={"chip" + (catFilter === "all" ? " active-all" : "")}
              onClick={() => setCatFilter("all")}
            >
              すべて
            </button>
            <button
              className={"chip" + (catFilter === "standard" ? " active-standard" : "")}
              onClick={() => setCatFilter("standard")}
            >
              スタンダード
            </button>
            <button
              className={"chip" + (catFilter === "puraplara" ? " active-puraplara" : "")}
              onClick={() => setCatFilter("puraplara")}
            >
              プラプラ
            </button>
            <button
              className={"chip" + (zeroOnly ? " zero-active" : "")}
              onClick={() => setZeroOnly((v) => !v)}
            >
              在庫切れのみ
            </button>
          </div>

          <div className="controls">
            <button className="btn btn-primary" onClick={() => setPanel(panel === "add" ? null : "add")}>
              + デザイン追加
            </button>
            <button className="btn btn-ghost" onClick={() => setPanel(panel === "bulk" ? null : "bulk")}>
              一括追加
            </button>
          </div>

          {panel === "add" && (
            <div className="panel">
              <h3>デザインを追加</h3>
              <form onSubmit={handleAddSubmit}>
                <input
                  type="text"
                  placeholder="デザイン名(例: しろくま)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <div className="radio-row">
                  <label>
                    <input
                      type="radio"
                      checked={newCategory === "standard"}
                      onChange={() => setNewCategory("standard")}
                    />
                    スタンダード(ピアスのみ)
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={newCategory === "puraplara"}
                      onChange={() => setNewCategory("puraplara")}
                    />
                    プラプラ(ピアス+イヤリング)
                  </label>
                </div>
                <div className="panel-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPanel(null)}>
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-primary">
                    追加する
                  </button>
                </div>
              </form>
            </div>
          )}

          {panel === "bulk" && (
            <div className="panel">
              <h3>一括追加(1行に1デザイン)</h3>
              <form onSubmit={handleBulkSubmit}>
                <textarea
                  placeholder={"例:\nきりん\nパグ\nUFO"}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  autoFocus
                />
                <div className="radio-row">
                  <label>
                    <input
                      type="radio"
                      checked={bulkCategory === "standard"}
                      onChange={() => setBulkCategory("standard")}
                    />
                    スタンダード(ピアスのみ)
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={bulkCategory === "puraplara"}
                      onChange={() => setBulkCategory("puraplara")}
                    />
                    プラプラ(ピアス+イヤリング)
                  </label>
                </div>
                <div className="panel-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPanel(null)}>
                    キャンセル
                  </button>
                  <button type="submit" className="btn btn-primary">
                    追加する
                  </button>
                </div>
              </form>
            </div>
          )}

          {(catFilter === "all" || catFilter === "standard") && (
            <CategorySection
              catKey="standard"
              items={grouped.standard}
              nameCounts={nameCounts}
              onUpdate={updateDesign}
              onDelete={deleteDesign}
            />
          )}

          {(catFilter === "all" || catFilter === "puraplara") && (
            <CategorySection
              catKey="puraplara"
              items={grouped.puraplara}
              nameCounts={nameCounts}
              onUpdate={updateDesign}
              onDelete={deleteDesign}
            />
          )}

          {filtered.length === 0 && (
            <div className="empty-state">該当するデザインがありません</div>
          )}
        </>
      )}
    </div>
  );
}

function CategorySection({ catKey, items, nameCounts, onUpdate, onDelete }) {
  const info = CATEGORY_INFO[catKey];
  if (items.length === 0) return null;
  return (
    <div>
      <div className="section-title">
        <span className="dot" style={{ background: info.color }} />
        <h2>{info.label}</h2>
        <span className="count">{items.length}件</span>
      </div>
      <div className="grid">
        {items.map((d) => {
          const total = d.piercing + d.earring;
          const shared = nameCounts[d.name] > 1;
          return (
            <div className={"card" + (total === 0 ? " zero-stock" : "")} key={d.id}>
              <div className="card-top">
                <div className="card-name">{d.name}</div>
                <button className="card-del" onClick={() => onDelete(d.id)}>
                  削除
                </button>
              </div>
              <div className="badge-row">
                <span className={"badge badge-" + d.category}>{info.sub}</span>
                {shared && <span className="badge badge-shared">同名デザインあり</span>}
                {total === 0 && <span className="badge badge-out">在庫切れ</span>}
              </div>
              <div className="stock-pair">
                <div className="stock-field">
                  <span className="fld-lbl">ピアス</span>
                  <Stepper
                    value={d.piercing}
                    onChange={(v) => onUpdate(d.id, { piercing: v })}
                    accent={info.color}
                  />
                </div>
                <div className="stock-field">
                  <span className="fld-lbl">イヤリング</span>
                  <Stepper
                    value={d.earring}
                    onChange={(v) => onUpdate(d.id, { earring: v })}
                    accent={info.color}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

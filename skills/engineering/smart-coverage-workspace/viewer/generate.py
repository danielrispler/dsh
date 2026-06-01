#!/usr/bin/env python3
"""Generate a self-contained cross-iteration review HTML for smart-coverage evals.

Walks <workspace>/iteration-*/eval-*/{with_skill,without_skill,iter4_skill,...}/outputs/report.md
and emits index.html with all data inlined.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
OUTPUT = Path(__file__).resolve().parent / "index.html"

ITER_RE = re.compile(r"iteration-(\d+)$")
EVAL_RE = re.compile(r"eval-(\d+)$")


def read_text(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def read_json(path: Path):
    txt = read_text(path)
    if txt is None:
        return None
    try:
        return json.loads(txt)
    except Exception:
        return None


def collect_iterations() -> dict:
    iters = {}
    for d in sorted(WORKSPACE.glob("iteration-*")):
        m = ITER_RE.search(d.name)
        if not m:
            continue
        iter_id = int(m.group(1))
        iter_data = {
            "id": iter_id,
            "benchmark": read_json(d / "benchmark.json"),
            "feedback": read_json(d / "feedback.json"),
            "evals": {},
        }
        for ed in sorted(d.glob("eval-*")):
            em = EVAL_RE.search(ed.name)
            if not em:
                continue
            eval_id = int(em.group(1))
            meta = read_json(ed / "eval_metadata.json") or {}
            configs = {}
            for cfg_dir in sorted(p for p in ed.iterdir() if p.is_dir()):
                cfg = cfg_dir.name
                report = read_text(cfg_dir / "outputs" / "report.md")
                # grading / timing may live under run-N/
                grading = None
                timing = None
                for run in sorted(cfg_dir.glob("run-*")):
                    g = read_json(run / "grading.json")
                    if g and grading is None:
                        grading = g
                    t = read_json(run / "timing.json")
                    if t and timing is None:
                        timing = t
                configs[cfg] = {
                    "report": report,
                    "grading": grading,
                    "timing": timing,
                }
            iter_data["evals"][eval_id] = {
                "id": eval_id,
                "metadata": meta,
                "configs": configs,
            }
        iters[iter_id] = iter_data
    return iters


def collect_evals_json():
    evals_path = WORKSPACE.parent / "smart-coverage" / "evals" / "evals.json"
    return read_json(evals_path) or {"evals": []}


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Smart-Coverage Eval Review</title>
<style>
  :root {
    --bg: #faf9f5;
    --surface: #ffffff;
    --border: #e8e6dc;
    --text: #141413;
    --muted: #7a7770;
    --accent: #d97757;
    --green: #5a7340;
    --green-bg: #eef2e8;
    --red: #c44;
    --red-bg: #fceaea;
    --yellow: #b58105;
    --yellow-bg: #fbf5e0;
    --code-bg: #f4f1ea;
    --header-bg: #141413;
    --header-text: #faf9f5;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: var(--header-bg);
    color: var(--header-text);
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }
  .header h1 {
    font-size: 1.1rem;
    font-weight: 600;
  }
  .header .meta { color: #aaa; font-size: 0.85rem; }
  .layout { display: flex; flex: 1; overflow: hidden; }
  .sidebar {
    width: 280px;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    background: var(--surface);
    padding: 0.5rem;
    flex-shrink: 0;
  }
  .iter-group { margin-bottom: 0.75rem; }
  .iter-header {
    font-weight: 600;
    padding: 0.4rem 0.5rem;
    color: var(--muted);
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }
  .eval-row {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.88rem;
    border: 1px solid transparent;
  }
  .eval-row:hover { background: var(--code-bg); }
  .eval-row.active { background: var(--code-bg); border-color: var(--accent); }
  .eval-row .name { font-weight: 500; }
  .eval-row .sub { font-size: 0.72rem; color: var(--muted); }
  .main {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.75rem;
  }
  .panel { margin-bottom: 1.5rem; }
  .panel h2 {
    font-size: 0.95rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  .prompt {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 0.9rem 1rem;
    border-radius: 6px;
    white-space: pre-wrap;
    font-size: 0.92rem;
    line-height: 1.45;
  }
  .config-tabs { display: flex; gap: 0.4rem; margin-bottom: 0.6rem; flex-wrap: wrap; }
  .config-tab {
    padding: 0.35rem 0.8rem;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: inherit;
  }
  .config-tab.active { background: var(--accent); color: white; border-color: var(--accent); }
  .config-tab .badge {
    display: inline-block;
    margin-left: 0.4rem;
    padding: 0.05rem 0.4rem;
    border-radius: 8px;
    font-size: 0.72rem;
    background: rgba(0,0,0,0.12);
  }
  .config-tab.active .badge { background: rgba(255,255,255,0.25); }
  .report {
    background: var(--code-bg);
    border: 1px solid var(--border);
    padding: 1rem;
    border-radius: 6px;
    white-space: pre-wrap;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.82rem;
    line-height: 1.5;
    max-height: none;
    overflow-x: auto;
  }
  .grading {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
  }
  .assertion {
    display: flex;
    gap: 0.6rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.86rem;
    align-items: flex-start;
  }
  .assertion:last-child { border-bottom: none; }
  .badge-pass { background: var(--green-bg); color: var(--green); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600; font-size: 0.72rem; }
  .badge-fail { background: var(--red-bg); color: var(--red); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600; font-size: 0.72rem; }
  .badge-pending { background: var(--code-bg); color: var(--muted); padding: 0.1rem 0.4rem; border-radius: 3px; font-weight: 600; font-size: 0.72rem; }
  .assertion .text { flex: 1; }
  .assertion .evidence { color: var(--muted); font-size: 0.78rem; margin-top: 0.15rem; }
  .stats { display: flex; gap: 1rem; color: var(--muted); font-size: 0.8rem; }
  .stat strong { color: var(--text); }
  .empty {
    color: var(--muted);
    padding: 1rem;
    background: var(--code-bg);
    border-radius: 6px;
    text-align: center;
    font-style: italic;
    font-size: 0.85rem;
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
    align-items: center;
  }
  .iter-select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    font-family: inherit;
    font-size: 0.85rem;
  }
  .label { color: var(--muted); font-size: 0.8rem; }
  details { margin-bottom: 0.5rem; }
  summary {
    cursor: pointer;
    padding: 0.4rem 0;
    font-weight: 600;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .feedback {
    white-space: pre-wrap;
    background: var(--yellow-bg);
    border: 1px solid #efe2b8;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Smart-Coverage Eval Review</h1>
    <span class="meta" id="meta"></span>
  </div>
  <div class="layout">
    <aside class="sidebar" id="sidebar"></aside>
    <main class="main" id="main">
      <div class="empty">Select an eval from the sidebar.</div>
    </main>
  </div>

<script>
const DATA = __DATA__;
const EVALS = __EVALS__;

const evalNames = {};
for (const ev of EVALS.evals || []) {
  evalNames[ev.id] = ev.prompt ? ev.prompt.slice(0, 60).replace(/\\s+/g, ' ') + '...' : 'eval ' + ev.id;
}

let currentSelection = null; // {iter, evalId, config}

function el(tag, props, ...children) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    if (k === 'class') e.className = props[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else if (k === 'html') e.innerHTML = props[k];
    else e.setAttribute(k, props[k]);
  }
  for (const c of children) {
    if (c == null) continue;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}

function buildSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  const iters = Object.keys(DATA).map(Number).sort((a, b) => b - a);
  for (const it of iters) {
    const group = el('div', { class: 'iter-group' });
    group.appendChild(el('div', { class: 'iter-header' }, 'Iteration ' + it));
    const evals = Object.keys(DATA[it].evals).map(Number).sort((a, b) => a - b);
    for (const ev of evals) {
      const data = DATA[it].evals[ev];
      const name = data.metadata?.eval_name || evalNames[ev] || ('eval ' + ev);
      const cfgs = Object.keys(data.configs);
      const row = el('div', {
        class: 'eval-row',
        onclick: () => select(it, ev),
      },
        el('span', { class: 'name' }, 'Eval ' + ev + ' — ' + name),
        el('span', { class: 'sub' }, cfgs.join(' · ')),
      );
      row.dataset.iter = it;
      row.dataset.eval = ev;
      group.appendChild(row);
    }
    sb.appendChild(group);
  }
  document.getElementById('meta').textContent = iters.length + ' iterations · ' + (EVALS.evals?.length || 0) + ' evals defined';
}

function highlightSidebar() {
  document.querySelectorAll('.eval-row').forEach(r => {
    r.classList.toggle('active',
      currentSelection &&
      r.dataset.iter === String(currentSelection.iter) &&
      r.dataset.eval === String(currentSelection.evalId));
  });
}

function select(iter, evalId, config) {
  const data = DATA[iter].evals[evalId];
  if (!data) return;
  const cfgKeys = Object.keys(data.configs);
  if (!config || !cfgKeys.includes(config)) {
    config = cfgKeys.includes('with_skill') ? 'with_skill' : cfgKeys[0];
  }
  currentSelection = { iter, evalId, config };
  render();
  highlightSidebar();
}

function render() {
  const main = document.getElementById('main');
  if (!currentSelection) { main.innerHTML = '<div class="empty">Select an eval from the sidebar.</div>'; return; }
  const { iter, evalId, config } = currentSelection;
  const evalData = DATA[iter].evals[evalId];
  const evalDef = (EVALS.evals || []).find(e => e.id === evalId);
  main.innerHTML = '';

  // Controls — iteration selector
  const iters = Object.keys(DATA).map(Number).sort((a, b) => b - a);
  const iterSelect = el('select', {
    class: 'iter-select',
    onchange: (e) => select(Number(e.target.value), evalId, config),
  });
  for (const i of iters) {
    if (DATA[i].evals[evalId]) {
      const opt = el('option', { value: i }, 'Iteration ' + i);
      if (i === iter) opt.selected = true;
      iterSelect.appendChild(opt);
    }
  }
  const controls = el('div', { class: 'controls' },
    el('span', { class: 'label' }, 'Iteration:'),
    iterSelect,
    el('span', { class: 'label' }, 'Eval ' + evalId + (evalData.metadata?.eval_name ? ' — ' + evalData.metadata.eval_name : '')),
  );
  main.appendChild(controls);

  // Prompt panel
  const prompt = evalData.metadata?.prompt || evalDef?.prompt || '(no prompt recorded)';
  main.appendChild(el('section', { class: 'panel' },
    el('h2', null, 'Prompt'),
    el('div', { class: 'prompt' }, prompt),
  ));

  // Expected output panel (from evals.json)
  if (evalDef?.expected_output) {
    main.appendChild(el('section', { class: 'panel' },
      el('h2', null, 'Expected Output'),
      el('div', { class: 'prompt' }, evalDef.expected_output),
    ));
  }

  // Config tabs
  const cfgKeys = Object.keys(evalData.configs);
  const tabs = el('div', { class: 'config-tabs' });
  for (const cfg of cfgKeys) {
    const grading = evalData.configs[cfg].grading;
    let badge = '';
    if (grading) {
      const s = grading.summary || {};
      badge = (s.passed ?? 0) + '/' + (s.total ?? 0);
    }
    const tab = el('button', {
      class: 'config-tab' + (cfg === config ? ' active' : ''),
      onclick: () => select(iter, evalId, cfg),
    }, cfg);
    if (badge) tab.appendChild(el('span', { class: 'badge' }, badge));
    tabs.appendChild(tab);
  }
  main.appendChild(tabs);

  const cfgData = evalData.configs[config] || {};

  // Stats
  if (cfgData.timing) {
    const t = cfgData.timing;
    const stats = el('div', { class: 'stats' });
    if (t.total_tokens != null) stats.appendChild(el('span', { class: 'stat' }, el('strong', null, t.total_tokens.toLocaleString()), ' tokens'));
    if (t.total_duration_seconds != null) stats.appendChild(el('span', { class: 'stat' }, el('strong', null, t.total_duration_seconds.toFixed(1) + 's'), ' duration'));
    main.appendChild(stats);
  }

  // Report
  main.appendChild(el('section', { class: 'panel' },
    el('h2', null, 'Output Report — ' + config),
    cfgData.report
      ? el('div', { class: 'report' }, cfgData.report)
      : el('div', { class: 'empty' }, 'No report.md found for this configuration.'),
  ));

  // Grading
  if (cfgData.grading) {
    const expectations = cfgData.grading.expectations || [];
    const grading = el('div', { class: 'grading' });
    for (const a of expectations) {
      const status = a.passed === true ? 'badge-pass' : a.passed === false ? 'badge-fail' : 'badge-pending';
      const label = a.passed === true ? 'PASS' : a.passed === false ? 'FAIL' : '...';
      grading.appendChild(el('div', { class: 'assertion' },
        el('span', { class: status }, label),
        el('div', { class: 'text' },
          el('div', null, a.text),
          a.evidence ? el('div', { class: 'evidence' }, a.evidence) : null,
        ),
      ));
    }
    main.appendChild(el('section', { class: 'panel' },
      el('h2', null, 'Grading'),
      grading,
    ));
  }

  // Feedback (iteration-level, filtered to this run-id if present)
  const fb = DATA[iter].feedback;
  if (fb?.reviews) {
    const runId = 'eval-' + evalId + '-' + config;
    const relevant = fb.reviews.filter(r => r.run_id === runId);
    if (relevant.length) {
      const block = el('div');
      for (const r of relevant) {
        block.appendChild(el('div', { class: 'feedback' }, r.feedback || ''));
      }
      main.appendChild(el('section', { class: 'panel' },
        el('h2', null, 'Reviewer Feedback'),
        block,
      ));
    }
  }
}

buildSidebar();
// auto-select latest iteration, eval 1
const iters = Object.keys(DATA).map(Number).sort((a, b) => b - a);
if (iters.length) {
  const firstIter = iters[0];
  const firstEval = Object.keys(DATA[firstIter].evals).map(Number).sort((a, b) => a - b)[0];
  if (firstEval != null) select(firstIter, firstEval);
}
</script>
</body>
</html>
"""


def main():
    iters = collect_iterations()
    evals = collect_evals_json()
    html = HTML_TEMPLATE.replace("__DATA__", json.dumps(iters)).replace("__EVALS__", json.dumps(evals))
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size // 1024} KB)")
    print(f"Iterations: {sorted(iters.keys())}")
    for i in sorted(iters):
        evs = sorted(iters[i]["evals"])
        print(f"  iter {i}: evals {evs}")


if __name__ == "__main__":
    main()

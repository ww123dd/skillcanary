'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseArgs, printJson } = require('../lib/util');

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) { return ''; }
}

function readInput() {
  const raw = readStdin().trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (_) { return { raw: raw }; }
}

function rulesPath(baseDir) {
  return path.resolve(baseDir || '.', '.skillcanary/hook-rules.json');
}

function loadRules(baseDir) {
  const file = rulesPath(baseDir);
  if (!fs.existsSync(file)) return { rules: [], errors: [], warnings: ['hook-rules.json not found; pre-tool defaults to allow'], file };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const rules = Array.isArray(data.preTool) ? data.preTool : (Array.isArray(data.rules) ? data.rules : []);
    return { rules, errors: [], warnings: [], file };
  } catch (err) {
    return { rules: [], errors: ['cannot parse hook-rules.json: ' + err.message], warnings: [], file };
  }
}

function ruleMatches(rule, input) {
  if (!rule || typeof rule !== 'object') return false;
  if (rule.enabled === false) return false;
  if (rule.event && rule.event !== 'pre-tool' && rule.event !== 'pre_tool') return false;
  if (rule.host && input.host && rule.host !== input.host) return false;
  if (!rule.pattern) return false;
  try { return new RegExp(rule.pattern, rule.flags || 'i').test(JSON.stringify(input)); }
  catch (_) { return false; }
}

function preTool(input) {
  const rule = loadRules().rules.find(function (item) { return ruleMatches(item, input); });
  return rule
    ? { decision: 'deny', rule: rule.id || 'custom', reason: rule.reason || 'blocked by SkillCanary hook rule' }
    : { decision: 'allow' };
}

function readArmor() {
  const file = path.resolve('.skillcanary/armor.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(function (line) { return JSON.parse(line); });
}

function stopCheck() {
  const change = path.resolve('.skillcanary/change.json');
  const report = path.resolve('skillcanary-report.md');
  if (fs.existsSync(change) && !fs.existsSync(report)) {
    return { continue: true, message: 'SkillCanary: change.json exists but no report. Run skillcanary report/comment before claiming completion.' };
  }
  return { continue: true };
}

function doctor(baseDir) {
  const loaded = loadRules(baseDir);
  const errors = loaded.errors.slice();
  const warnings = loaded.warnings.slice();
  const ids = new Set();
  loaded.rules.forEach(function (rule, index) {
    const label = 'preTool[' + index + ']';
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) { errors.push(label + ' must be an object'); return; }
    if (typeof rule.id !== 'string' || !rule.id.trim()) errors.push(label + '.id is required');
    else if (ids.has(rule.id)) errors.push(label + '.id is duplicated: ' + rule.id);
    else ids.add(rule.id);
    if (typeof rule.reason !== 'string' || !rule.reason.trim()) errors.push(label + '.reason is required');
    if (typeof rule.pattern !== 'string' || !rule.pattern.trim()) errors.push(label + '.pattern is required');
    else {
      try { new RegExp(rule.pattern, rule.flags || 'i'); }
      catch (err) { errors.push(label + '.pattern is invalid: ' + err.message); }
    }
    if (rule.flags && !/^[dgimsuvy]+$/.test(rule.flags)) warnings.push(label + '.flags may be invalid');
  });
  return { file: loaded.file, rules: loaded.rules.length, errors, warnings, ok: errors.length === 0 };
}

function codexDispatcher() {
  return [
    "'use strict';",
    "const fs = require('fs');",
    "const { spawnSync } = require('child_process');",
    "const event = process.argv[2] || 'session-start';",
    "let input = '';",
    "try { input = fs.readFileSync(0, 'utf8'); } catch (_) {}",
    "const result = spawnSync(process.execPath, [require('path').resolve(__dirname, '..', '..', 'bin', 'skillcanary.js'), 'hook', event], { input: input, encoding: 'utf8' });",
    "process.stdout.write(result.stdout || '{}');",
    "process.exit(0);",
    ''
  ].join('\\n');
}
function skillcanaryBin() { return path.resolve(__dirname, "..", "..", "bin", "skillcanary.js"); }
function commandFor(event) { return "node \"" + skillcanaryBin() + "\" hook " + event; }
function hostFile(host) {
  if (host === 'claude') return path.join(os.homedir(), '.claude', 'settings.json');
  if (host === 'codex') return path.join(os.homedir(), '.codex', 'hooks', 'skillcanary-hook.js');
  return null;
}
function claudeWiring() {
  const matcher = "Bash|Read|Write|Edit|Grep|Glob|NotebookEdit|mcp__.*";
  return {
    SessionStart: [{ hooks: [{ type: 'command', command: commandFor('session-start') }] }],
    PreToolUse: [{ matcher: matcher, hooks: [{ type: 'command', command: commandFor('pre-tool') }] }],
    Stop: [{ hooks: [{ type: 'command', command: commandFor('stop') }] }],
    SessionEnd: [{ hooks: [{ type: 'command', command: commandFor('session-end') }] }]
  };
}
function ensureRules(dir) {
  const rules = path.join(dir, '.skillcanary', 'hook-rules.json');
  if (fs.existsSync(rules)) return { file: rules, created: false };
  const example = path.join(dir, '.skillcanary', 'hook-rules.example.json');
  fs.mkdirSync(path.dirname(rules), { recursive: true });
  if (fs.existsSync(example)) fs.copyFileSync(example, rules);
  else fs.writeFileSync(rules, JSON.stringify({ preTool: [] }, null, 2) + '\n', 'utf8');
  return { file: rules, created: true };
}
function install(args) {
  const host = args.host || (fs.existsSync(path.join(os.homedir(), '.claude')) ? 'claude' : 'codex');
  const file = hostFile(host);
  const dir = path.resolve(args.dir || '.');
  const written = args.write === true;
  const notes = [];
  const result = { schema_version: 'skillcanary/hook-install/v1', host: host, file: file, written: written, notes: notes, block: '', ok: true };
  if (!file) { result.ok = false; notes.push("unknown host: " + host + " (use --host claude|codex)"); return result; }
  if (host === 'claude') {
    result.block = JSON.stringify({ hooks: claudeWiring() }, null, 2);
    if (written) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      const backup = file + '.bak-' + stamp;
      if (fs.existsSync(file)) fs.copyFileSync(file, backup); else fs.writeFileSync(file, '{}\n', 'utf8');
      const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
      settings.hooks = settings.hooks || {};
      let added = 0;
      const wiring = claudeWiring();
      for (const event of Object.keys(wiring)) {
        const current = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
        if (JSON.stringify(current).indexOf('skillcanary') === -1) { settings.hooks[event] = current.concat(wiring[event]); added += wiring[event].length; }
      }
      fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n', 'utf8');
      const rules = ensureRules(dir);
      notes.push('backup: ' + backup);
      notes.push('wired ' + added + ' hook entr(ies) into ' + file);
      notes.push((rules.created ? 'created ' : 'kept ') + rules.file);
    } else {
      notes.push('dry run: nothing was written. Re-run with --write to apply after a backup.');
    }
  } else {
    result.block = codexDispatcher();
    if (written) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, codexDispatcher(), 'utf8');
      const rules = ensureRules(dir);
      notes.push('wrote dispatcher ' + file);
      notes.push((rules.created ? 'created ' : 'kept ') + rules.file);
      notes.push('Codex host wiring is owned by the host: point your hook config at this file the way ~/.codex/hooks/guard-codex.js is wired.');
    } else {
      notes.push('dry run: nothing was written. Re-run with --write to drop the dispatcher in place.');
    }
  }
  notes.push('verify with: skillcanary hook doctor');
  return result;
}

module.exports = function run(argv) {
  const args = parseArgs(argv);
  const event = args._[0];
  const input = readInput();

  if (event === 'install') {
    const result = install(args);
    if (args.json) printJson(result);
    else {
      process.stdout.write('SkillCanary hook install (' + (result.written ? 'written' : 'dry run') + ') host=' + result.host + String.fromCharCode(10));
      for (const note of result.notes) process.stdout.write('  ' + note + String.fromCharCode(10));
      if (result.block) process.stdout.write(String.fromCharCode(10) + result.block + String.fromCharCode(10));
    }
    return result.ok ? 0 : 1;
  }

  if (event === 'doctor') {
    const result = doctor();
    if (args.json) printJson(result);
    else {
      process.stdout.write('SkillCanary hook doctor @ ' + result.file + '\n');
      for (const warning of result.warnings) process.stdout.write('  ! ' + warning + '\n');
      for (const error of result.errors) process.stdout.write('  x ' + error + '\n');
      process.stdout.write('  Result: ' + (result.ok ? 'PASS' : 'FAIL') + ' (' + result.rules + ' rule(s))\n');
    }
    return result.ok ? 0 : 1;
  }

  if (event === 'pre-tool') {
    process.stdout.write(JSON.stringify(preTool(input)) + '\n');
    return 0;
  }
  if (event === 'session-start') {
    const active = readArmor().filter(function (item) { return item.status === 'warning' || item.status === 'blocking'; });
    process.stdout.write(JSON.stringify({ continue: true, context: active.length ? 'SkillCanary armor active: ' + active.map(function (item) { return item.id + ':' + item.status; }).join(', ') : '' }) + '\n');
    return 0;
  }
  if (event === 'stop') {
    process.stdout.write(JSON.stringify(stopCheck()) + '\n');
    return 0;
  }
  if (event === 'session-end') {
    const out = path.resolve('.skillcanary/outcomes.jsonl');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const record = {
      session_id: input.session_id || input.sessionId || 'unknown',
      skill: input.skill || 'unknown',
      skill_hash: input.skill_hash || input.skillHash || 'unknown',
      observed_at: new Date().toISOString(),
      signals: input.signals || {}
    };
    fs.appendFileSync(out, JSON.stringify(record) + '\n', 'utf8');
    process.stdout.write(JSON.stringify({ continue: true, recorded: out }) + '\n');
    return 0;
  }

  process.stderr.write('Usage: skillcanary hook <doctor|install|session-start|pre-tool|stop|session-end>\n');
  return 2;
};

module.exports.doctor = doctor;
module.exports.install = install;
module.exports.preTool = preTool;
import React, { useMemo, useState } from "react";
import { request } from "./api";

const demoAccount = {
  username: "zhixingheyi",
  password: "321654987"
};

const processNames = {
  import: "导入",
  encrypt: "加密",
  trade: "交易",
  auth: "授权",
  chain: "上链",
  compute: "风控",
  audit: "审计",
  output: "输出"
};

const emptyProcess = {
  import: { status: "等待", summary: "等待数据导入", detail: [] },
  auth: { status: "等待", summary: "等待用户授权", detail: [] },
  trade: { status: "等待", summary: "等待创建交易", detail: [] },
  encrypt: { status: "等待", summary: "等待生成可信数据资产", detail: [] },
  chain: { status: "等待", summary: "等待链上存证", detail: [] },
  compute: { status: "等待", summary: "等待风险计算", detail: [] },
  output: { status: "等待", summary: "等待最终输出", detail: [] },
  audit: { status: "等待", summary: "等待自动审计", detail: [] }
};

const progressSteps = ["导入", "加密", "交易", "授权", "风控", "审计", "输出"];

const processCards = [
  { key: "auth", title: "用户授权" },
  { key: "trade", title: "交易管理" },
  { key: "encrypt", title: "数据加密" },
  { key: "chain", title: "数据上链" },
  { key: "compute", title: "风险计算" },
  { key: "output", title: "输出结果" },
  { key: "audit", title: "审计中心" }
];

const riskOrder = ["低风险", "中风险", "高风险"];

const cityTiers = ["一线城市", "新一线城市", "二线城市", "三线城市", "县域城市"];
const jobTypes = ["国企事业", "制造业", "互联网平台", "金融服务", "物流运输", "教育培训", "个体经营", "自由职业"];
const mortgageStatuses = ["无房贷", "按揭正常", "房贷结清", "租住"];
const productMixes = ["信用卡+消费贷", "信用卡+车贷", "消费贷+经营贷", "信用卡+按揭贷", "信用卡+小额贷", "综合授信"];
const regions = ["华东", "华南", "华中", "华北", "西南", "西北"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fixed(value) {
  return Number(value.toFixed(2));
}

function makeProfile(index, level) {
  const isHigh = level === "high" || level === "overdue" || level === "debt";
  return {
    age: 24 + (index % 35),
    city_tier: cityTiers[index % cityTiers.length],
    region: regions[index % regions.length],
    job_type: jobTypes[index % jobTypes.length],
    employment_years: clamp(1 + (index % 19), 1, 25),
    mortgage_status: mortgageStatuses[index % mortgageStatuses.length],
    credit_history_months: isHigh ? 18 + (index % 72) : 48 + (index % 156),
    monthly_income: isHigh ? 4200 + (index % 18) * 360 : 7600 + (index % 26) * 520,
    available_credit_limit: isHigh ? 12000 + (index % 20) * 1500 : 36000 + (index % 35) * 2600,
    existing_credit_products: productMixes[index % productMixes.length],
    public_record_flag: isHigh && index % 7 === 0 ? "yes" : "no",
    last_loan_status: isHigh ? (index % 3 === 0 ? "逾期关注" : "正常结清") : "正常结清",
    bank_relationship_years: clamp(1 + (index % 12), 1, 16)
  };
}

function makeRecord(prefix, namePrefix, index, level, overrides = {}) {
  const mod = index % 12;
  const presets = {
    low: [
      0,
      fixed(0.96 + (mod % 4) * 0.01),
      1 + (mod % 2),
      fixed(0.18 + (mod % 5) * 0.025),
      fixed(0.16 + (mod % 5) * 0.025),
      mod % 2,
      mod % 5 === 0 ? "medium" : "high"
    ],
    medium: [
      1,
      fixed(0.95 + (mod % 2) * 0.01),
      2 + (mod % 2),
      fixed(0.30 + (mod % 3) * 0.025),
      fixed(0.24 + (mod % 4) * 0.02),
      1,
      "medium"
    ],
    high: [
      3 + (mod % 3),
      fixed(0.55 + (mod % 5) * 0.04),
      6 + (mod % 5),
      fixed(0.72 + (mod % 5) * 0.04),
      fixed(0.62 + (mod % 5) * 0.05),
      3 + (mod % 4),
      mod % 2 === 0 ? "low" : "medium"
    ],
    overdue: [
      3 + (mod % 5),
      fixed(0.40 + (mod % 6) * 0.045),
      6 + (mod % 6),
      fixed(0.70 + (mod % 5) * 0.045),
      fixed(0.62 + (mod % 6) * 0.055),
      4 + (mod % 5),
      mod % 3 === 0 ? "low" : "medium"
    ],
    debt: [
      1 + (mod % 3),
      fixed(0.67 + (mod % 5) * 0.035),
      7 + (mod % 6),
      fixed(0.80 + (mod % 5) * 0.035),
      fixed(0.70 + (mod % 6) * 0.04),
      5 + (mod % 5),
      "medium"
    ]
  };
  const [overdue, repay, loans, util, debt, inquiries, income] = presets[level];
  return {
    customer_id: `${prefix}-${String(index).padStart(3, "0")}`,
    customer_name: `${namePrefix}${String(index).padStart(3, "0")}`,
    overdue_count_12m: overdue,
    credit_card_repayment_rate: repay,
    loan_count: loans,
    credit_utilization: util,
    debt_to_income_ratio: debt,
    recent_credit_inquiries_3m: inquiries,
    income_level: income,
    ...makeProfile(index, level),
    ...overrides
  };
}

function repeatLevels(groups) {
  return groups.flatMap(([level, count]) => Array(count).fill(level));
}

function buildCase(prefix, namePrefix, levels, options = {}) {
  const records = levels.map((level, index) => makeRecord(prefix, namePrefix, index + 1, level));
  if (options.tamperIndex !== undefined && records[options.tamperIndex]) {
    records[options.tamperIndex].tamper_attempt = true;
  }
  return records;
}

const cases = [
  {
    name: "简易案例：三类评级样本",
    tag: "混合评级",
    tone: "mixed",
    format: "CSV",
    coverage: "低 / 中 / 高",
    description: "三类评级客户均衡分布，适合快速检查批量评级结果是否完整。",
    records: buildCase("CUST-SIMPLE", "样本客户", repeatLevels([
      ["low", 12],
      ["medium", 12],
      ["high", 12]
    ]))
  },
  {
    name: "正常案例：稳定还款客户",
    tag: "正常评级",
    tone: "normal",
    format: "CSV",
    coverage: "低风险",
    description: "稳定还款、信用历史较长的批量客户库，适合演示低风险集中评级。",
    records: buildCase("CUST-NORMAL", "稳定客户", Array(120).fill("low"))
  },
  {
    name: "正常案例：轻度波动客户",
    tag: "正常评级",
    tone: "normal",
    format: "JSON",
    coverage: "低 / 中",
    description: "轻度逾期和授信波动客户混合记录，用于展示 JSON 批量导入。",
    records: buildCase("CUST-FLOAT", "波动客户", repeatLevels([
      ["low", 72],
      ["medium", 36]
    ]))
  },
  {
    name: "复杂案例：多指标混合客户库",
    tag: "混合评级",
    tone: "mixed",
    format: "JSON",
    coverage: "低 / 中 / 高",
    description: "多字段、多等级、大批量客户库，用于展示一次导入后批量生成不同风险评级。",
    records: buildCase("CUST-MIX", "混合客户", repeatLevels([
      ["low", 60],
      ["medium", 60],
      ["high", 60]
    ]))
  },
  {
    name: "高风险案例：逾期客户库",
    tag: "高风险案例",
    tone: "danger",
    format: "CSV",
    coverage: "高风险",
    description: "逾期、负债和近期查询偏高的客户库，用于一次性输出多名客户的高风险评级。",
    records: buildCase("CUST-WARN-OD", "逾期客户", Array(150).fill("overdue"))
  },
  {
    name: "复杂高风险案例：高负债高查询客户",
    tag: "高风险案例",
    tone: "danger",
    format: "JSON",
    coverage: "中 / 高",
    description: "高查询、高授信使用率和较高债务收入比记录，用于复杂客户库批量评级。",
    records: buildCase("CUST-WARN-DEBT", "高负债客户", repeatLevels([
      ["medium", 48],
      ["debt", 96]
    ]))
  }
];

function toCsv(records) {
  const keys = [
    "customer_id",
    "customer_name",
    "overdue_count_12m",
    "credit_card_repayment_rate",
    "loan_count",
    "credit_utilization",
    "debt_to_income_ratio",
    "recent_credit_inquiries_3m",
    "income_level",
    "age",
    "city_tier",
    "region",
    "job_type",
    "employment_years",
    "mortgage_status",
    "credit_history_months",
    "monthly_income",
    "available_credit_limit",
    "existing_credit_products",
    "public_record_flag",
    "last_loan_status",
    "bank_relationship_years",
    "tamper_attempt"
  ];
  return [
    keys.join(","),
    ...records.map((record) => keys.map((key) => record[key] ?? "").join(","))
  ].join("\n");
}

function formatCaseData(item) {
  if (item.format === "JSON") {
    return JSON.stringify(item.records, null, 2);
  }
  return toCsv(item.records);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(",").map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((item) => item.trim());
    return headers.reduce((record, header, index) => {
      record[header] = normalizeValue(values[index]);
      return record;
    }, {});
  });
}

function parseJson(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.records)) {
    return data.records;
  }
  return [data];
}

function parseRecords(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJson(trimmed);
  }
  return parseCsv(trimmed);
}

function normalizeValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

function countRecords(text) {
  try {
    return parseRecords(text).length;
  } catch {
    return 0;
  }
}

function ratingDistribution(results) {
  return riskOrder.reduce((acc, rating) => {
    acc[rating] = results.filter((item) => item.rating === rating).length;
    return acc;
  }, {});
}

function nextRating(rating) {
  if (rating === "低风险") return "高风险";
  return "低风险";
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function DetailTable({ rows }) {
  const data = toArray(rows);
  if (!data.length) {
    return <p className="muted">暂无明细数据。</p>;
  }
  const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row || {})))).slice(0, 10);
  return (
    <div className="detail-table">
      <table>
        <thead>
          <tr>{keys.map((key) => <th key={key}>{key}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={`${row.customer_id || row.data_id || index}`}>
              {keys.map((key) => <td key={key}>{String(row[key] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem("trusted_credit_logged_in") === "true");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [activeView, setActiveView] = useState("result");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [autoAudit, setAutoAudit] = useState(false);
  const [simulateTamper, setSimulateTamper] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [process, setProcess] = useState(emptyProcess);
  const [result, setResult] = useState(null);
  const [resultModal, setResultModal] = useState(false);
  const [alarm, setAlarm] = useState("");
  const [detailKey, setDetailKey] = useState("");
  const [error, setError] = useState("");

  const recordCount = useMemo(() => countRecords(rawText), [rawText]);

  function submitLogin(event) {
    event.preventDefault();
    if (loginForm.username === demoAccount.username && loginForm.password === demoAccount.password) {
      sessionStorage.setItem("trusted_credit_logged_in", "true");
      setLoggedIn(true);
      setLoginError("");
      return;
    }
    setLoginError("用户名或密码错误。");
  }

  function logout() {
    sessionStorage.removeItem("trusted_credit_logged_in");
    setLoggedIn(false);
    setLoginForm({ username: "", password: "" });
  }

  function loadCase(item) {
    setRawText(formatCaseData(item));
    setFileName(`${item.name} ${item.format} ${item.records.length} 条记录`);
    setResult(null);
    setAlarm("");
    setError("");
    setProgress(0);
    setProcess(emptyProcess);
  }

  function updateStep(key, patch) {
    setProcess((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch
      }
    }));
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    setFileName(file.name);
    setResult(null);
    setAlarm("");
    setError("");
    setProgress(0);
    setProcess(emptyProcess);
  }

  async function runFlow() {
    setRunning(true);
    setError("");
    setAlarm("");
    setResult(null);
    setResultModal(false);
    setProgress(0);
    setProcess(emptyProcess);

    try {
      const records = parseRecords(rawText);
      if (!records.length) {
        throw new Error("请先上传或粘贴 CSV / JSON 数据。");
      }

      updateStep("import", {
        status: "完成",
        summary: `已读取 ${records.length} 条客户记录`,
        detail: records
      });
      setProgress(14);

      const imported = await request("/data/database/import", {
        method: "POST",
        body: JSON.stringify({
          source_name: fileName || "browser_import",
          records
        })
      });
      updateStep("encrypt", {
        status: "完成",
        summary: `完成 AES-256-GCM 加密，生成 ${imported.imported_count} 条可信数据资产。`,
        detail: imported.assets
      });
      setProgress(30);

      const trade = await request("/trade/create", {
        method: "POST",
        body: JSON.stringify({
          data_ids: imported.assets.map((asset) => asset.data_id),
          purpose: "credit_risk_rating"
        })
      });
      updateStep("trade", {
        status: "完成",
        summary: `已创建并支付 ${records.length} 笔交易。`,
        detail: trade
      });
      setProgress(45);

      const auth = await request("/auth/sign", {
        method: "POST",
        body: JSON.stringify({
          trade_id: trade.trade_id,
          user_did: "did:demo:credit-user"
        })
      });
      updateStep("auth", {
        status: "完成",
        summary: `用户授权完成，${records.length} 个任务已进入可计算状态。`,
        detail: auth
      });
      setProgress(60);

      updateStep("chain", {
        status: "完成",
        summary: "数据哈希已完成链上存证，后续风险计算会校验链上链下一致性。",
        detail: imported.assets.map((asset) => ({
          data_id: asset.data_id,
          customer_id: asset.customer_id,
          data_hash: asset.data_hash,
          tx_hash: asset.data_hash,
          status: "已上链"
        }))
      });

      const computed = await request("/compute/run", {
        method: "POST",
        body: JSON.stringify({ records })
      });
      updateStep("compute", {
        status: "完成",
        summary: `风险计算完成，最高等级为${highestRisk(computed.results)}。`,
        detail: computed.results
      });
      setProgress(76);

      const hasTamperSignal = records.some((record) => record.tamper_attempt === true || record.tamper_attempt === "true");
      const submittedResults = computed.results.map((item, index) => {
        if (autoAudit && (simulateTamper || hasTamperSignal) && index === 0) {
          return { ...item, rating: nextRating(item.rating) };
        }
        return item;
      });

      if (autoAudit) {
        const audit = await request("/audit/check", {
          method: "POST",
          body: JSON.stringify({
            expected_results: computed.results,
            submitted_results: submittedResults
          })
        });
        if (audit.blocked) {
          updateStep("audit", {
            status: "已阻断",
            summary: `自动审计发现 ${audit.tampered_count} 条评级结果被篡改，已冻结交易并停止输出。`,
            detail: audit.tampered.map((item, index) => ({
              序号: index + 1,
              客户名: customerLabel(item),
              真实评级: item.expected,
              订单评级: item.submitted,
              审计结论: "不一致，阻断输出",
              任务编号: `task_${String(401 + index).padStart(3, "0")}`
            }))
          });
          updateStep("output", {
            status: "已停止",
            summary: "审计未通过，不输出评级结果",
            detail: []
          });
          setProgress(100);
          setAlarm(`审计 Agent 检测到评级结果篡改尝试，已阻断交易并停止输出。冻结交易：${audit.tampered_count} 笔。`);
          setRunning(false);
          return;
        }
        updateStep("audit", {
          status: "完成",
          summary: "自动审计已核对真实评级和交易订单评级，未发现本次结果被篡改。",
          detail: computed.results.map((item, index) => ({
            序号: index + 1,
            客户名: item.customer_name || item.customer_id,
            真实评级: item.rating,
            订单评级: item.rating,
            审计结论: "一致，允许输出",
            任务编号: `task_${String(402 + index).padStart(3, "0")}`
          }))
        });
      } else {
        updateStep("audit", {
          status: "未开启",
          summary: "本次流程未启用自动审计",
          detail: []
        });
      }
      setProgress(90);

      const finalReport = {
        createdAt: new Date().toLocaleString("zh-CN"),
        count: computed.results.length,
        distribution: computed.distribution,
        results: computed.results
      };
      updateStep("output", {
        status: "完成",
        summary: `输出 ${finalReport.count} 名客户最终信用评级`,
        detail: finalReport.results.map((item) => ({
          客户名: item.customer_name || item.customer_id,
          信用评级: item.rating
        }))
      });
      setResult(finalReport);
      setProgress(100);
      setResultModal(true);
    } catch (err) {
      setError(err.message || "流程执行失败。");
    } finally {
      setRunning(false);
    }
  }

  function exportPdf() {
    if (!result) return;
    const rows = result.results
      .map((item) => `<tr><td>${item.customer_name || item.customer_id}</td><td>${item.rating}</td></tr>`)
      .join("");
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>信用评级结果</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 32px; color: #111827; }
          h1 { font-size: 22px; margin: 0 0 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; font-size: 14px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>客户信用评级</h1>
        <table>
          <thead><tr><th>客户名</th><th>信用评级</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) {
      setError("浏览器阻止了打印窗口，请允许弹窗后重试。");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  if (!loggedIn) {
    return (
      <main className="login-page">
        <style>{styles}</style>
        <section className="login-card">
          <div className="logo">C4</div>
          <h1>可信征信数据交易系统</h1>
          <p>请使用项目账号登录后进入成果展示与过程展示。</p>
          <form onSubmit={submitLogin}>
            <label>
              用户名
              <input
                value={loginForm.username}
                onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                autoFocus
              />
            </label>
            <label>
              密码
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
              />
            </label>
            {loginError && <div className="error-line">{loginError}</div>}
            <button type="submit">登录系统</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <style>{styles}</style>
      <aside>
        <div className="logo">C4</div>
        <h1>可信征信数据交易系统</h1>
        <p>从导入到审计的一体化演示台</p>
        <div className="account">
          <span>当前账号</span>
          <strong>zhixingheyi</strong>
          <button onClick={logout}>退出登录</button>
        </div>
        <nav>
          <button className={activeView === "result" ? "active" : ""} onClick={() => setActiveView("result")}>成果展示</button>
          <button className={activeView === "process" ? "active" : ""} onClick={() => setActiveView("process")}>过程展示</button>
        </nav>
        <div className="hint">
          数据库导入后会自动经过加密、交易、授权、风控和审计。正常高风险评级不会报警，只有检测到评级结果被篡改时才阻断输出。
        </div>
      </aside>

      <section className="workspace">
        {activeView === "result" ? (
          <>
            <header className="hero">
              <div>
                <span>成果展示</span>
                <h2>上传数据，生成最终风险评级</h2>
                <p>系统自动完成数据加密、交易授权、上链校验、风险计算和自动审计，首页只输出最终风险评级。</p>
              </div>
              <strong>{running ? "处理中" : result ? "已完成" : "待导入"}</strong>
            </header>

            <section className="panel">
              <div className="toolbar">
                <label className="file-button">
                  上传 CSV / JSON
                  <input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} />
                </label>
                <button className="primary" onClick={runFlow} disabled={running}>
                  {running ? "流程运行中" : "开始完整流程"}
                </button>
                {result && <button onClick={exportPdf}>打印 / 保存 PDF</button>}
              </div>

              <div className="source-line">
                {fileName || "尚未导入数据"} {recordCount ? ` · ${recordCount} 条记录` : ""}
              </div>
              <textarea
                value={rawText}
                onChange={(event) => {
                  setRawText(event.target.value);
                  setFileName("手动粘贴数据");
                }}
                placeholder="可粘贴数据库导出的 CSV 或 JSON。CSV 第一行为字段名，JSON 支持对象数组或 records 数组。"
              />
              <div className="progress"><span style={{ width: `${progress}%` }} /></div>
              <div className="progress-labels">
                {progressSteps.map((name) => <span key={name}>{name}</span>)}
              </div>
              {error && <div className="error-line">{error}</div>}
              {alarm && <AlarmModal message={alarm} onClose={() => setAlarm("")} />}
            </section>

            <section className="guide">
              <span>导入格式说明</span>
              <h3>支持数据库导出的 CSV 或 JSON</h3>
              <div>
                <article>
                  <strong>CSV</strong>
                  <p>第一行必须是字段名，后续每行是一条客户征信记录。</p>
                </article>
                <article>
                  <strong>JSON</strong>
                  <p>支持对象数组、单个对象，或包含 records 数组的对象。</p>
                </article>
                <article>
                  <strong>推荐字段</strong>
                  <p>customer_id、customer_name、overdue_count_12m、credit_card_repayment_rate、loan_count、credit_utilization、debt_to_income_ratio、recent_credit_inquiries_3m、income_level。可附加 age、city_tier、job_type、monthly_income、credit_history_months 等客户画像字段。</p>
                </article>
              </div>
            </section>

            <section className="audit-module">
              <span>自动审计模块</span>
              <h3>评级结果完整性保护</h3>
              <p>开启后，系统会在输出前自动校验评级结果。若检测到评级被人为改动，交易会被冻结，本次不输出结果。</p>
              <div className="audit-controls">
                <label className="check">
                  <input type="checkbox" checked={autoAudit} onChange={(event) => setAutoAudit(event.target.checked)} />
                  开启自动审计服务
                </label>
                <label className="check">
                  <input type="checkbox" checked={simulateTamper} onChange={(event) => setSimulateTamper(event.target.checked)} />
                  模拟有人篡改评级结果
                </label>
              </div>
            </section>

            <section className="cases">
              <div className="section-title-row">
                <div>
                  <span>案例数据库</span>
                  <h3>选择一个案例数据库快速演示</h3>
                </div>
                <em>已扩容为批量样例；审计篡改测试在自动审计模块中开启</em>
              </div>
              <div>
                {cases.map((item) => (
                  <button className={`case-card ${item.tone}`} key={item.name} onClick={() => loadCase(item)}>
                    <small>{item.tag}</small>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                    <em>{item.format} / {item.records.length} 条记录 / 评级覆盖：{item.coverage}</em>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="process-view">
            <header className="hero">
              <div>
                <span>过程展示</span>
                <h2>完整流程分块演示</h2>
                <p>这里展示授权、交易、加密、上链、风险计算和自动审计如何被系统串联执行。</p>
              </div>
            </header>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="progress-labels">
              {progressSteps.map((name) => <span key={name}>{name}</span>)}
            </div>
            <section className="audit-status">
              <span>自动审计</span>
              <h3>触发方式：系统自动执行结果完整性校验</h3>
              <p>触发节点：评级结果输出前　当前状态：{autoAudit ? "本次已启用" : "本次未启用"}　审计模块：{process.audit.status}</p>
              <strong>{process.audit.summary}</strong>
            </section>
            <div className="stage-grid">
              {processCards.map((card) => {
                const item = process[card.key];
                return (
                <button key={card.key} onClick={() => setDetailKey(card.key)}>
                  <span>{card.title}</span>
                  <strong>{item.status}</strong>
                  <p>{item.summary}</p>
                  <b>{detailCount(item.detail)} 条数据</b>
                  <em>查看全部数据</em>
                </button>
                );
              })}
            </div>
          </section>
        )}
      </section>

      {resultModal && result && (
        <ResultModal result={result} onClose={() => setResultModal(false)} onExport={exportPdf} />
      )}

      {detailKey && (
        <div className="modal-backdrop">
          <section className="modal wide">
            <span className="modal-eyebrow">过程明细</span>
            <h3>{processCardTitle(detailKey)}演示结果</h3>
            <p>{process[detailKey].summary}</p>
            <DetailTable rows={process[detailKey].detail} />
            <button className="primary" onClick={() => setDetailKey("")}>关闭</button>
          </section>
        </div>
      )}
    </main>
  );
}

function distributionText(distribution = {}) {
  return riskOrder.map((rating) => `${rating} ${distribution[rating] || 0} 人`).join("，");
}

function highestRisk(results = []) {
  if (results.some((item) => item.rating === "高风险")) return "高风险";
  if (results.some((item) => item.rating === "中风险")) return "中风险";
  return "低风险";
}

function customerLabel(item) {
  return item.customer_name || item.customer_id || item["客户名"] || "未知客户";
}

function detailCount(detail) {
  if (Array.isArray(detail)) return detail.length;
  if (detail && typeof detail === "object") return Object.keys(detail).length;
  return 0;
}

function processCardTitle(key) {
  return processCards.find((card) => card.key === key)?.title || processNames[key] || "流程";
}

function ResultModal({ result, onClose, onExport }) {
  return (
    <div className="modal-backdrop">
      <section className="modal wide">
        <span className="modal-eyebrow">输出结果</span>
        <h3>客户信用评级</h3>
        <DetailTable rows={result.results.map((item) => ({ 客户名: item.customer_name || item.customer_id, 信用评级: item.rating }))} />
        <div className="modal-actions">
          <button className="primary" onClick={onExport}>下载评级 PDF</button>
          <button onClick={onClose}>关闭</button>
        </div>
      </section>
    </div>
  );
}

function AlarmModal({ message, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <span className="alarm-dot">!</span>
        <h3>自动审计警示</h3>
        <p>{message}</p>
        <button className="primary" onClick={onClose}>我已知晓</button>
      </section>
    </div>
  );
}

const styles = `
* { box-sizing: border-box; }
body { margin: 0; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; color: #111827; background: #eef4f2; }
button, input, textarea { font: inherit; }
button { border: 1px solid #b8c7c4; background: #fff; color: #0f2b36; border-radius: 8px; padding: 12px 18px; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .6; cursor: not-allowed; }
.primary, form button { background: #0f766e; border-color: #0f766e; color: #fff; }
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: linear-gradient(135deg, #0f3b44, #0f766e); }
.login-card { width: min(440px, 100%); background: #fff; border-radius: 14px; padding: 34px; box-shadow: 0 28px 80px rgba(0,0,0,.22); }
.logo { width: 54px; height: 54px; border-radius: 12px; display: grid; place-items: center; background: #d6ebe7; color: #0b525b; font-weight: 900; font-size: 20px; }
.login-card h1 { margin: 20px 0 8px; font-size: 28px; }
.login-card p, .muted { color: #60717d; }
form { display: grid; gap: 16px; margin-top: 26px; }
label { display: grid; gap: 8px; font-weight: 800; color: #263848; }
input, textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 13px 14px; background: #fff; outline: none; }
textarea { min-height: 210px; resize: vertical; font-family: Consolas, "Microsoft YaHei", monospace; line-height: 1.6; }
.error-line { color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-weight: 700; margin-top: 14px; }
.app-shell { min-height: 100vh; display: grid; grid-template-columns: 260px 1fr; }
aside { background: #0e3740; color: #d7eef0; padding: 28px 22px; }
aside h1 { font-size: 24px; line-height: 1.25; margin: 22px 0 8px; }
aside p, aside span { color: #a8c4c8; }
.account { border: 1px solid rgba(255,255,255,.15); border-radius: 10px; padding: 14px; margin: 28px 0; display: grid; gap: 8px; }
.account button, nav button { width: 100%; background: transparent; color: #d7eef0; border-color: rgba(255,255,255,.18); text-align: left; }
.account button { text-align: center; }
nav { display: grid; gap: 10px; }
nav button.active { background: #d6ebe7; color: #0f2b36; }
.hint { margin-top: 28px; color: #b9d1d5; line-height: 1.7; border: 1px solid rgba(255,255,255,.13); border-radius: 10px; padding: 14px; }
.workspace { padding: 28px clamp(20px, 4vw, 56px); }
.hero, .panel, .guide, .audit-module, .cases, .process-view { background: rgba(255,255,255,.72); border: 1px solid #dbe7e5; border-radius: 10px; padding: 24px 28px; margin-bottom: 22px; }
.hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
.hero span, .guide span, .audit-module span, .cases span, .modal-eyebrow { color: #0f766e; font-weight: 900; }
.hero h2 { margin: 8px 0; font-size: clamp(28px, 4vw, 44px); line-height: 1.1; }
.hero p { margin: 0; color: #435466; font-weight: 700; }
.hero strong { background: #d6ebe7; color: #0b525b; border-radius: 8px; padding: 14px 18px; white-space: nowrap; }
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 18px; }
.file-button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #0f766e; color: #0f766e; border-radius: 8px; padding: 12px 18px; background: #eefaf8; cursor: pointer; }
.file-button input { display: none; }
.check { display: flex; align-items: center; gap: 8px; width: auto; }
.check input { width: 18px; height: 18px; }
.source-line { font-weight: 800; margin-bottom: 10px; color: #172033; }
.progress { height: 12px; border-radius: 999px; background: #d8e5e2; overflow: hidden; margin-top: 18px; }
.progress span { display: block; height: 100%; background: #0f766e; transition: width .3s ease; }
.progress-labels { display: flex; justify-content: space-between; color: #0f766e; font-weight: 800; margin-top: 8px; font-size: 14px; }
.guide > div { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
.cases > div:last-child { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; }
.guide article, .cases button, .stage-grid button { background: #fff; border: 1px solid #dbe7e5; border-radius: 8px; padding: 18px; text-align: left; }
.guide p, .audit-module p, .cases button span, .stage-grid p { color: #526171; line-height: 1.65; }
.cases button { display: grid; gap: 8px; }
.cases em, .stage-grid em, .stage-grid b { color: #0f766e; font-style: normal; font-weight: 900; }
.case-card small { width: max-content; border-radius: 999px; padding: 5px 10px; background: #e6f4f1; color: #0f766e; font-weight: 900; }
.case-card.mixed { background: #f0f6ff; border-color: #b7cff8; }
.case-card.normal { background: #effcf7; border-color: #9be0cb; }
.case-card.danger { background: #fff4f4; border-color: #fecaca; }
.case-card.danger small { background: #ffe4e6; color: #9f1239; }
.section-title-row { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 14px; }
.section-title-row h3, .guide h3, .audit-module h3 { margin: 8px 0 0; font-size: 24px; }
.section-title-row em { color: #526171; font-style: normal; font-weight: 800; }
.audit-controls { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 18px; }
.audit-status { margin: 18px 0; border: 1px solid #9be0cb; background: #effcf7; border-radius: 8px; padding: 20px; }
.audit-status span { color: #0f766e; font-weight: 900; }
.audit-status h3 { margin: 8px 0; font-size: 24px; }
.audit-status p, .audit-status strong { display: block; color: #334155; line-height: 1.7; }
.stage-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; margin-top: 18px; }
.stage-grid button { min-height: 160px; }
.stage-grid span { color: #0f766e; font-weight: 900; }
.stage-grid strong { display: block; font-size: 24px; margin: 14px 0 8px; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; padding: 20px; z-index: 10; }
.modal { width: min(760px, 100%); background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 30px 90px rgba(0,0,0,.26); }
.modal.wide { width: min(980px, 100%); }
.modal h3 { font-size: 28px; margin: 18px 0 10px; }
.modal p { font-size: 18px; line-height: 1.65; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 18px; }
.alarm-dot, .success-dot { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; font-size: 28px; font-weight: 900; }
.alarm-dot { background: #fee2e2; color: #b91c1c; }
.success-dot { background: #dcfce7; color: #15803d; }
.modal-eyebrow { display: block; margin-bottom: 10px; }
.detail-table { overflow: auto; max-height: 420px; border: 1px solid #e5e7eb; border-radius: 8px; }
table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; white-space: nowrap; }
th { background: #f8fafc; color: #334155; }
@media (max-width: 900px) {
  .app-shell { grid-template-columns: 1fr; }
  aside { position: static; }
  .guide > div, .cases > div:last-child, .stage-grid { grid-template-columns: 1fr; }
  .hero { display: block; }
}
`;

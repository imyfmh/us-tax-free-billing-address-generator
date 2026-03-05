#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const TAX_FREE_STATES = new Set(["AK", "DE", "MT", "NH", "OR"]);
const DEFAULT_OUTPUT = "data/openaddresses-samples.json";

function parseArgs(argv) {
  const args = { perState: 40, out: DEFAULT_OUTPUT };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--url" && value) {
      args.url = value;
      index += 1;
    } else if (key === "--input" && value) {
      args.input = value;
      index += 1;
    } else if (key === "--out" && value) {
      args.out = value;
      index += 1;
    } else if (key === "--per-state" && value) {
      args.perState = Number(value);
      index += 1;
    } else if (key === "--help") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "用法：",
      "  node scripts/update-openaddresses.mjs --url <csv_url> [--per-state 40] [--out data/openaddresses-samples.json]",
      "  node scripts/update-openaddresses.mjs --input <local_csv_file> [--per-state 40] [--out data/openaddresses-samples.json]",
      "",
      "说明：",
      "  该脚本从 OpenAddresses CSV 中提取 AK/DE/MT/NH/OR 地址样本，供前端 OpenAddresses 模式使用。",
    ].join("\n"),
  );
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((item) => item.trim());
}

function pickKey(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

function normalizeState(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text.length === 2) {
    return text;
  }
  const map = {
    ALASKA: "AK",
    DELAWARE: "DE",
    MONTANA: "MT",
    "NEW HAMPSHIRE": "NH",
    OREGON: "OR",
  };
  return map[text] || "";
}

function normalizeZip(value) {
  const match = String(value || "").match(/\d{5}/);
  return match ? match[0] : "";
}

function toRowObject(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || "";
  });
  return row;
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temp;
  }
  return copy;
}

function extractRecords(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV 内容为空或缺少数据行");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const records = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const row = toRowObject(headers, values);

    const state = normalizeState(
      pickKey(row, ["region", "state", "state_code", "province", "province_code"]),
    );
    if (!TAX_FREE_STATES.has(state)) {
      continue;
    }

    const city = pickKey(row, ["city", "locality", "town", "municipality"]);
    const postcode = normalizeZip(pickKey(row, ["postcode", "postalcode", "zip", "zip_code"]));
    const number = pickKey(row, ["number", "housenumber", "house_number"]);
    const street = pickKey(row, ["street", "road", "street_name", "address"]);
    const fullStreet = `${number} ${street}`.trim();

    if (!city || !postcode || !fullStreet) {
      continue;
    }

    records.push({
      state,
      city,
      zip: postcode,
      street: fullStreet,
    });
  }
  return records;
}

function toStateMap(records, perState) {
  const output = { AK: [], DE: [], MT: [], NH: [], OR: [] };
  for (const state of Object.keys(output)) {
    const oneState = records.filter((record) => record.state === state);
    const unique = [];
    const seen = new Set();
    for (const item of shuffle(oneState)) {
      const key = `${item.street}|${item.city}|${item.zip}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push({ street: item.street, city: item.city, zip: item.zip });
      if (unique.length >= perState) {
        break;
      }
    }
    output[state] = unique;
  }
  return output;
}

async function readSourceText(args) {
  if (args.input) {
    return fs.readFile(args.input, "utf8");
  }
  if (args.url) {
    const response = await fetch(args.url);
    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }
    return response.text();
  }
  throw new Error("请传入 --url 或 --input");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!Number.isInteger(args.perState) || args.perState <= 0) {
    throw new Error("--per-state 必须是正整数");
  }

  const sourceText = await readSourceText(args);
  const records = extractRecords(sourceText);
  const stateMap = toStateMap(records, args.perState);

  for (const [state, items] of Object.entries(stateMap)) {
    if (items.length === 0) {
      throw new Error(`状态 ${state} 未提取到任何记录，请检查 CSV 数据源`);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: args.url || path.resolve(args.input),
    perState: args.perState,
    states: stateMap,
  };

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("写入完成：", args.out);
  for (const [state, items] of Object.entries(stateMap)) {
    console.log(`${state}: ${items.length}`);
  }
}

main().catch((error) => {
  console.error("更新失败：", error.message);
  process.exit(1);
});

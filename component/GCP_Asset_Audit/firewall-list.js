import * as googleApis from "../../api/googleApis/gsCustom.js";
import { getGsAuth } from "../../api/googleApis/googleApis.js";
import { execFile } from "child_process";
import util from "util";
import config from "../../config.js";

const execFileAsync = util.promisify(execFile);
const NOTE_COLUMN_NAME = "用途";
const HEADERS = ["NAME", "NETWORK", "DIRECTION", "PRIORITY", "ALLOW", "DISABLED", "TARGET_TAGS", "DENY", NOTE_COLUMN_NAME, "IP範圍"];

export async function updateFirewallRulesToSheet(sheetId, projectList = config.stg_project) {
  try {
    const existingNotesByProject = await getExistingNotesByProject(sheetId);

    for (const projectName of Object.keys(projectList)) {
      console.log("寫入的專案: " + projectName);

      const projectId = projectList[projectName];
      await googleApis.createGsSheet(sheetId, projectName);
      const noteByFirewallKey = existingNotesByProject.get(projectName) || new Map();
      await googleApis.clearGsSheet(sheetId, `${projectName}!A1:Z`);

      const firewallRules = await getFirewallRules(projectId);
      const rows = buildFirewallRows(firewallRules, noteByFirewallKey);
      await googleApis.updateGsSheet(sheetId, `${projectName}!A1`, rows);

      console.log(`Updated ${projectName}: ${rows.length - 1} firewall rules`);
    }
    console.log("Firewall update complete.");
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getFirewallRules(projectId) {
  const { stdout } = await execFileAsync(
    "gcloud",
    [
      "compute",
      "firewall-rules",
      "list",
      "--project",
      projectId,
      "--format=json(name,network.basename(),direction,priority,allowed,denied,disabled,targetTags,sourceRanges,destinationRanges)",
    ],
    { maxBuffer: 1024 * 1024 * 20 }
  );

  return JSON.parse(stdout || "[]");
}

async function getExistingNotesByProject(sheetId) {
  const gsapi = await getGsAuth();
  const spreadsheet = await gsapi.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  const sheetNames = spreadsheet.data.sheets.map((sheet) => sheet.properties.title);
  if (sheetNames.length === 0) return new Map();

  const response = await gsapi.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: sheetNames.map((sheetName) => `${sheetName}!A1:Z`),
  });

  const notesByProject = new Map();
  for (const valueRange of response.data.valueRanges || []) {
    const projectName = valueRange.range.split("!")[0].replace(/^'|'$/g, "");
    const noteByFirewallKey = buildNoteMap(valueRange.values || []);
    if (noteByFirewallKey.size > 0) notesByProject.set(projectName, noteByFirewallKey);
  }

  console.log(`Loaded firewall usage notes from ${notesByProject.size} sheets`);
  return notesByProject;
}

function buildNoteMap(rows) {
  if (rows.length === 0) return new Map();

  const headers = rows[0];
  const nameIndex = headers.indexOf("NAME");
  const noteIndex = headers.indexOf(NOTE_COLUMN_NAME);
  if (nameIndex === -1 || noteIndex === -1) return new Map();

  const noteByFirewallKey = new Map();
  for (const row of rows.slice(1)) {
    const name = row[nameIndex];
    const note = row[noteIndex];
    if (!name || !note) continue;
    noteByFirewallKey.set(getFirewallKey(name), note);
  }

  return noteByFirewallKey;
}

function buildFirewallRows(firewallRules, noteByFirewallKey = new Map()) {
  const rows = [HEADERS];

  firewallRules.sort(compareFirewallRules).forEach((rule) => {
    rows.push([
      rule.name || "",
      rule.network || "",
      rule.direction || "",
      rule.priority ?? "",
      formatFirewallEntries(rule.allowed),
      rule.disabled ?? "",
      formatList(rule.targetTags),
      formatFirewallEntries(rule.denied),
      noteByFirewallKey.get(getFirewallKey(rule.name)) || "",
      formatIpRanges(rule),
    ]);
  });

  return rows;
}

function getFirewallKey(name) {
  return name || "";
}

function compareFirewallRules(a, b) {
  const disabledCompare = Number(Boolean(a.disabled)) - Number(Boolean(b.disabled));
  if (disabledCompare !== 0) return disabledCompare;

  const directionCompare = String(a.direction || "").localeCompare(String(b.direction || ""));
  if (directionCompare !== 0) return directionCompare;

  const priorityCompare = Number(a.priority || 0) - Number(b.priority || 0);
  if (priorityCompare !== 0) return priorityCompare;

  return String(a.name || "").localeCompare(String(b.name || ""));
}

function formatFirewallEntries(entries = []) {
  return entries
    .map((entry) => {
      const protocol = entry.IPProtocol || "";
      const ports = entry.ports?.length ? `:${entry.ports.join(",")}` : "";
      return `${protocol}${ports}`;
    })
    .filter(Boolean)
    .join("; ");
}

function formatList(values = []) {
  return values.filter(Boolean).join(", ");
}

function formatIpRanges(rule) {
  return [...(rule.sourceRanges || []), ...(rule.destinationRanges || [])].filter(Boolean).join(", ");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const projectListName = process.argv[2] || "stg_project";
  const projectList = config[projectListName];

  if (!projectList) {
    console.error(`Project list not found: config.${projectListName}`);
    process.exit(1);
  }

  updateFirewallRulesToSheet(config.sheetId.gcp_firewall, projectList).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

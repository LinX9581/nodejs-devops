import * as googleApis from "../../api/googleApis/gsCustom.js";
import { execFile } from "child_process";
import util from "util";
import config from "../../config.js";

const execFileAsync = util.promisify(execFile);
const HEADERS = ["NAME", "NETWORK", "DIRECTION", "PRIORITY", "ALLOW", "DISABLED", "TARGET_TAGS", "DENY", "用途", "IP範圍"];

export async function updateFirewallRulesToSheet(sheetId, projectList = config.stg_project) {
  try {
    for (const projectName of Object.keys(projectList)) {
      console.log("寫入的專案: " + projectName);

      const projectId = projectList[projectName];
      await googleApis.createGsSheet(sheetId, projectName);
      await googleApis.clearGsSheet(sheetId, `${projectName}!A1:Z`);

      const firewallRules = await getFirewallRules(projectId);
      const rows = buildFirewallRows(firewallRules);
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

function buildFirewallRows(firewallRules) {
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
      "",
      formatIpRanges(rule),
    ]);
  });

  return rows;
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

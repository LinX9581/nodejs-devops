import * as googleApis from "../../api/googleApis/gsCustom.js";
import { execFile } from "child_process";
import util from "util";
import config from "../../config.js";

const execFileAsync = util.promisify(execFile);
const HEADERS = ["NAME", "STATUS", "ZONE", "MACHINE_TYPE", "INTERNAL_IP", "EXTERNAL_IP"];

export async function updateVmlistToSheet(sheetId, projectList = config.stg_project) {
  try {
    for (const projectName of Object.keys(projectList)) {
      console.log("Project -> " + projectName);

      const projectId = projectList[projectName];
      await googleApis.createGsSheet(sheetId, projectName);
      await googleApis.clearGsSheet(sheetId, `${projectName}!A1:Z`);

      const instances = await getVmInstances(projectId);
      const rows = buildVmRows(instances);
      await googleApis.updateGsSheet(sheetId, `${projectName}!A1`, rows);

      console.log(`Updated ${projectName}: ${rows.length - 1} VMs`);
    }
    console.log("VM update complete.");
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getVmInstances(projectId) {
  const { stdout } = await execFileAsync(
    "gcloud",
    [
      "compute",
      "instances",
      "list",
      "--project",
      projectId,
      "--format=json(name,status,zone.basename(),machineType.basename(),networkInterfaces[].networkIP,networkInterfaces[].accessConfigs[].natIP)",
    ],
    { maxBuffer: 1024 * 1024 * 20 }
  );

  return JSON.parse(stdout || "[]");
}

function buildVmRows(instances) {
  const rows = [HEADERS];

  instances.sort(compareInstances).forEach((instance) => {
    const networkInterfaces = instance.networkInterfaces || [];
    rows.push([
      instance.name || "",
      instance.status || "",
      instance.zone || "",
      instance.machineType || "",
      getInternalIps(networkInterfaces),
      getExternalIps(networkInterfaces),
    ]);
  });

  return rows;
}

function compareInstances(a, b) {
  const statusCompare = String(a.status || "").localeCompare(String(b.status || ""));
  if (statusCompare !== 0) return statusCompare;

  return String(a.name || "").localeCompare(String(b.name || ""));
}

function getInternalIps(networkInterfaces) {
  return networkInterfaces.map((item) => item.networkIP).filter(Boolean).join(", ");
}

function getExternalIps(networkInterfaces) {
  return networkInterfaces
    .flatMap((item) => item.accessConfigs || [])
    .map((item) => item.natIP)
    .filter(Boolean)
    .join(", ");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const projectListName = process.argv[2] || "stg_project";
  const projectList = config[projectListName];

  if (!projectList) {
    console.error(`Project list not found: config.${projectListName}`);
    process.exit(1);
  }

  updateVmlistToSheet(config.sheetId.gcp_all_vm_details, projectList).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

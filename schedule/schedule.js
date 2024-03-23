import schedule from "node-schedule";
import { exec, spawn } from "child_process";
import { updateFirewallRulesToSheet } from "../component/GCP_Asset_Audit/firewall-list";
import { updateIamPolicies } from "../component/GCP_Asset_Audit/iam-list";
import { updateVmlistToSheet } from "../component/GCP_Asset_Audit/vm-list";
import util from "util";
const execProm = util.promisify(exec);

// updateGcpToSheet();
async function updateGcpToSheet() {
  try {
    await updateVmlistToSheet(config.sheetId.test);
    // await updateFirewallRulesToSheet(config.sheetId.test);
    // await updateIamPolicies(config.sheetId.test);
  } catch (error) {
    console.log(error);
  }
}

// 每日執行shell
schedule.scheduleJob("1 0 * * *", async function () {
  try {
    await execProm(`sh /devops/nginx_log_to_gcs.sh`);
    console.log("每日執行shell完成");
  } catch (error) {
    console.log(error);
  }
});

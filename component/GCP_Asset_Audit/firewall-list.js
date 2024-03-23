import * as googleApis from "../../api/googleApis/gsCustom";
import { exec, spawn } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

// updateFirewallRulesToSheet();
export async function updateFirewallRulesToSheet(sheetId) {
  try {
    // Iterate over the values of the config.stg_project object
    for (const projectName of Object.keys(config.stg_project)) {
      console.log("寫入的專案: " + projectName);

      // Clear the Google Sheet for each project, and set the project
      const projectId = config.stg_project[projectName];
      await execAsync(`gcloud config set project ${config.stg_project[projectName]}`);
      await googleApis.createGsSheet(sheetId, projectName);
      await sleep(2000);
      await googleApis.clearGsSheet(sheetId, projectName + "!A1:Z");

      // Get the list of firewall rules for the project
      const { stdout: firewallRulesList } = await execAsync(
        `gcloud compute firewall-rules list --format="table(name,network,DIRECTION,PRIORITY,ALLOW,DISABLED,targetTags.list():label=TARGET_TAGS,DENY)"`
      );
      const firewallRulesLines = firewallRulesList.split(/\n/);
      const headers = firewallRulesLines[0].replace(/, /g, ":").replace(/,t/g, "-t").replace(/\s+/g, ",").split(",");
      headers.push("用途", "IP範圍");
      await googleApis.updateGsSheet(sheetId, projectName + "!A" + 1, [headers]);

      // Process each firewall rule
      for (let i = 1; i < firewallRulesLines.length - 1; i++) {
        await sleep(300);
        let ruleDetails = firewallRulesLines[i].replace(/, /g, ":").replace(/,t/g, "-t").replace(/\s+/g, ",").split(",");

        const firewallRuleName = ruleDetails[0];
        const { stdout: firewallDetails } = await execAsync(
          `gcloud compute firewall-rules describe ${firewallRuleName} --format="value(sourceRanges.list(),destinationRanges.list())"`
        );
        const firewallDetailsArray = firewallDetails.trim().split(",");
        ruleDetails.push(...firewallDetailsArray);
        await googleApis.updateGsSheet(sheetId, projectName + "!A" + (i + 1), [ruleDetails]);
      }
    }
    console.log("Firewall update complete.");
  } catch (error) {
    console.error(error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

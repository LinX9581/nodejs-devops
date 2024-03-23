import * as googleApis from "../api/googleApis/gsCustom";
import { exec, spawn } from "child_process";
import util from "util";
const execProm = util.promisify(exec);

async function listFirewallRules() {
  try {
    // 執行 gcloud 指令來獲取防火牆規則列表
    let { stdout } = await execProm(`gcloud compute firewall-rules list --format="value(name)"`);
    
    // 分割輸出以獲取個別防火牆規則 ID
    let firewallRuleIds = stdout.split('\n').filter(id => id);

    // 輸出或處理防火牆規則 ID
    console.log("Firewall Rule IDs:", firewallRuleIds);

    // 為每個防火牆規則 ID 準備 pulumi import 命令（示例）
    for (let id of firewallRuleIds) {
      console.log(`pulumi import google-native:compute/v1:Firewall myFirewall ${id}`);
      // 實際上這裡你可能需要將命令儲存起來或直接執行
    }
  } catch (error) {
    console.error("Error listing firewall rules:", error);
  }
}

// listFirewallRules();

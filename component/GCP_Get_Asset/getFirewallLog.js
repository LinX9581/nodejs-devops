import { Logging } from "@google-cloud/logging";

async function queryLogs() {
  // 使用 moment 計算當前時間和 30 分鐘前的時間
  const currentTime = moment().toISOString();
  const halfHourAgo = moment().subtract(30, "minutes").toISOString();

  const logging = new Logging({ projectId: config.test_gcp_project.nownews_website });
  const logName = `projects/${config.test_gcp_project.nownews_website}/logs/compute.googleapis.com%2Ffirewall`;
  const filter = `logName=("${logName}") 
  AND jsonPayload.rule_details.reference=("network:default/firewall:default-allow-other") 
  AND timestamp >= "${halfHourAgo}" 
  AND timestamp <= "${currentTime}"`;

  const [entries] = await logging.getEntries({ filter });
  // 使用一個物件來記錄每個 IP 的出現次數
  const ipCounts = {};

  entries.forEach((entry) => {
    const ip = entry.data.connection.src_ip;
    if (ip) {
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    }
  });

  console.log(ipCounts);
}

// queryLogs().catch(console.error);

const fetch = require("node-fetch");

const API_ENDPOINT = config.cloudflare.api_endpoint;
const CF_API_TOKEN = config.cf_api_token;
const ZONE_ID = config.zone_id;

// 增加 DNS A 記錄的函式
async function createDnsRecord(ipAddress, hostname) {
  const path = `/zones/${ZONE_ID}/dns_records`;
  const data = {
    type: "A",
    name: hostname,
    content: ipAddress,
    proxied: true,
    ttl: 1, // TTL 時間（秒）
  };
  const response = await callCloudflareAPI(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const record = response.result;
  return record;
}

// 呼叫 Cloudflare API 的函式
async function callCloudflareAPI(path, options = {}) {
  const url = `${API_ENDPOINT}${path}`;
  const headers = {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    "Content-Type": "application/json",
  };
  const requestOptions = {
    headers: headers,
    ...options,
  };
  const response = await fetch(url, requestOptions);
  const json = await response.json();
  return json;
}

// createRecord()
async function createRecord() {
  try {
    const ipAddress = "34.80.207.55";
    const hostname = "testseasdft.linx.website";
    const record = await createDnsRecord(ipAddress, hostname);
    console.log("DNS Record:", record);
  } catch (error) {
    console.error(error);
  }
}

async function updateDnsRecordProxyStatus(recordId, newProxyStatus) {
  const path = `/zones/${ZONE_ID}/dns_records/${recordId}`;
  const data = {
    proxied: newProxyStatus,
  };
  const response = await callCloudflareAPI(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const record = response.result;
  return record;
}

// updateRecord();
async function updateRecord() {
  try {
    const recordId = await findDnsRecordIdByIpAddress("34.80.207.50", "testset.linx.website");
    console.log(recordId);
    const newProxyStatus = true;
    const updateStatus = await updateDnsRecordProxyStatus(recordId, newProxyStatus);
    console.log("DNS Record:", updateStatus);
  } catch (error) {
    console.error(error);
  }
}

// 查詢 DNS 記錄的函式
async function listDnsRecords() {
  const path = `/zones/${ZONE_ID}/dns_records`;
  const response = await callCloudflareAPI(path);
  const records = response.result;
  return records;
}

// 找出特定 IP 位址所對應的 DNS 記錄 ID
async function findDnsRecordIdByIpAddress(ipAddress, domainName) {
  const records = await listDnsRecords();
  //   console.log(records);
  const record = records.find((record) => record.type === "A" && record.content === ipAddress && record.name === domainName);
  const recordId = record ? record.id : null;
  return recordId;
}

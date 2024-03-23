import { google } from "googleapis";

let { client_email, private_key } = config.google;
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

const jwt = new google.auth.JWT(client_email, null, private_key, scopes);
jwt.authorize(function (err) {
  if (err) {
    console.log("Google Api Err" + err);
    return;
  }
});

// Google Sheet
export async function getGsAuth() {
  const gsapi = await google.sheets({ version: "v4", auth: jwt });
  return gsapi;
}

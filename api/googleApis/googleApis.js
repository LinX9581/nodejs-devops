import { google } from "googleapis";
import config from "../../config.js";

const { client_email, private_key } = config.google;
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

const jwt = new google.auth.JWT({
  email: client_email,
  key: private_key,
  scopes,
});
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

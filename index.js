import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import './global'
import indexRouter from './route/indexRouter';
import './component/GCP_Asset_Audit/vm-list';
import './component/GCP_Asset_Audit/iam-list';
import './component/GCP_Asset_Audit/firewall-list';
import './component/GCP_Get_Asset/getSecretManager';
import './component/GCP_Get_Asset/getFirewallLog';
import './schedule/schedule';
// import './component/pulumi-firewall-import';
// import './component/cloudflare-import2terraform';

const app = express();
const http = require('http').Server(app);

app.set("views", "views/");
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));

app.use('/', indexRouter);

const host = '0.0.0.0';
const port = process.env.PORT || 3005;

http.listen(port, host, function() {
    console.log("Server started on " + port);
});
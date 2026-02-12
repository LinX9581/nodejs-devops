import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import indexRouter from './route/indexRouter.js';
import './component/GCP_Asset_Audit/vm-list.js';
import './component/GCP_Asset_Audit/iam-list.js';
import './component/GCP_Asset_Audit/firewall-list.js';
import './schedule/schedule.js';

const app = express();
app.set("views", "views/");
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.use('/', indexRouter);

const host = "0.0.0.0";
const port = process.env.PORT || 3005;

app.listen(port, host, function () {
  console.log("nodejs-devops listening on " + port);
});
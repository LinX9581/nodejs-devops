#!/bin/bash
CURRENT_DATE=$(date -d '1 day ago' +"%Y-%m-%d")
gcloud config set project nownews-prod-deploy

rsync -avh --progress ansible@35.201.237.98:/var/log/nginx/access.log.2.gz /devops/sub/nginx_log/onepage-nginx-log-${CURRENT_DATE}.gz
gsutil cp -r /devops/sub/nginx_log/onepage-nginx-log-${CURRENT_DATE}.gz gs://nownews-log/nownews-nginx-log/onepage

rm -rf /devops/sub/nginx_log/*.gz
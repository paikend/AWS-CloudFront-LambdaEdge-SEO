'use strict';
const axios = require('axios');
const UrlPattern = require('url-pattern');
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
require('dotenv').config();

//origin-request
module.exports.metaTagOriginRequest = async (event, context, callback) => {
  const options = {
    headers: {
      'api-key':process.env.API_KEY
    }
  };
  const request = event.Records[0].cf.request;
  const pattern = new UrlPattern(process.env.VALID_PATTERN);
  const { headers, origin, uri } = request;
  if(pattern.match(uri)){
    let is_crawler = undefined;
    if ('is-crawler' in headers) {
      is_crawler = headers['is-crawler'][0].value.toLowerCase();
    }
    if (is_crawler === 'true') {
      const reqPath = uri.split('/');
      const apiRes = await axios.get(process.env.CH_API+reqPath[2] , options)
      .then(res => res.data[0])
      .catch(err => {console.log(err)});  
      let html = await S3.getObject({Bucket:process.env.S3_BUCKET, Key: process.env.S3_FILE}).promise()
      .then(data => data.Body.toString())
      .catch(err => {console.log(err);});
      let title = apiRes.snippet.title;
      title = "Some title"+title
      html = html.replace(/<title>(.*)<\/title>/,'<title>'+title+'<\/title>');
      await S3.putObject({
        Bucket: process.env.SEO_BUCKET,
        Key: uri.substring(1)+ "/" +process.env.S3_FILE,
        Body: html,
        ContentType: 'text/html', 
        ACL: 'public-read'
    }).promise().then(html => html).catch(err => {console.log(err);})
      headers['host'] = [{key: 'Host', value: process.env.DOMAIN_NAME}];
      origin.s3.domainName = process.env.DOMAIN_NAME;
      request.uri = uri + "/"+ process.env.S3_FILE
      console.log(JSON.stringify(request));
      callback(null, request);
      return;
    }
  }
    console.log(JSON.stringify(request));
    callback(null, request);
};


//viewer-request
// 용량 제한이 있어서 node_module을 제거하고 배포해야합니다
// const regex = /aolbuild|baidu|bingbot|bingpreview|msnbot|duckduckgo|adsbot-google|googlebot|mediapartners-google|teoma|slurp|yandex|bot|crawl|spider/g;
// module.exports.metaTagViewerRequestRewriter = (event, context, callback) => {
//   const request = event.Records[0].cf.request;
//   const user_agent = request['headers']['user-agent'][0]['value'].toLowerCase();
//   if(user_agent !== undefined) {
//     const found = user_agent.match(regex);
//     request['headers']['is-crawler'] = [
//       {
//         key: 'is-crawler',
//         value: `${found !== null}`
//       } 
//     ]
//   }
// callback(null, request);
// };
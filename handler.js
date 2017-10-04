'use strict';

var AWS = require("aws-sdk");
var route53 = new AWS.Route53();

module.exports.update = (event, context, cb) => {
  if (!event.headers.Authorization || event.headers.Authorization != process.env.SHARED_SECRET) {
    cb(null,  { statusCode: 400, body: 'Missing or invalid authorization token'});
    return false; 
  }
  if (!event.queryStringParameters.hosted_zone_id) { cb(null,  { statusCode: 400, body: 'Missing hosted_zone_id param'}); return false; }
  if (!event.queryStringParameters.name) { cb(null,  { statusCode: 400, body:'Missing name param'}); return false; }

  /*
  options = {
    hosted_zone_id: event.queryStringParameters.hosted_zone_id,
    name: event.queryStringParameters.name
  }

  hashed

 */

  route53.changeResourceRecordSets({
    HostedZoneId: event.queryStringParameters.hosted_zone_id,
    ChangeBatch: {
      Changes: [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: event.queryStringParameters.name,
            Type: 'A',
            ResourceRecords: [ { Value: event.requestContext.identity.sourceIp } ],
            TTL: 300
          }
        }
      ],
      Comment: 'ddns update'
    }
  }, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      cb(null, { statusCode: 500, body: JSON.stringify({ message: 'FAIL', err: err.stack })})
    } else {
      cb(null, { body: JSON.stringify({message: 'OK' })})
    }
  });
}

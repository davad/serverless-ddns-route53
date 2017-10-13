'use strict';

const dynamodb = require('./dynamodb');

var AWS = require("aws-sdk");
var route53 = new AWS.Route53();

function validInput (event,context, cb) {
  if (!event.headers.Authorization) {
    cb(null,  { statusCode: 400, body: 'Missing or invalid authorization token'});
    return false; 
  }
  if (!event.queryStringParameters.name) { cb(null,  { statusCode: 400, body:'Missing name param'}); return false; }
  return true
}

function validAuth (payload, cb) {
  // Authenticate client
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      fqdn: payload.name,
      client_id: payload.id,
    },
  };



 return dynamodb.get(params, (error, result) => {
    // handle potential errors
    var valid = false;
    if (error) {
      console.error(error);
      valid = false;
    }

    if(result.hasOwnProperty("Item")
       && result.Item.hasOwnProperty("api_keys")
       && result.Item.api_keys.includes(payload.key)) {

      valid = true;
    }

    if(!valid) {
      cb(null, {
        statusCode: 403,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t authenticate the request.',
      });
    }

    return valid;

  });
}

function updateRecord(payload, cb) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      fqdn: payload.name,
      client_id: payload.id,
    },
  };

  dynamodb.get(params, (error, result) => {
    var valid = false;
    if (error) {
      console.error(error);
    }

    var hosted_zone_id = '';
    if (result.hasOwnProperty("Item") 
        && result.Item.hasOwnProperty("hosted_zone_id")){
        hosted_zone_id = result.Item.hosted_zone_id;
    }

    if (hosted_zone_id == '') {
      cb(null, { statusCode: 500, body: JSON.stringify({ message: 'FAIL', error: error })})
      return
    }

    route53.changeResourceRecordSets({
      HostedZoneId: hosted_zone_id,
      ChangeBatch: {
        Changes: [
          {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: payload.name,
            Type: 'A',
            ResourceRecords: [ { Value: payload.ip } ],
            TTL: 300
          }
        }
        ],
        Comment: 'ddns update'
      }
    }, function (err, data) {
      if (err) {
        console.error(err, err.stack);
        cb(null, { statusCode: 500, body: JSON.stringify({ message: 'FAIL', err: err.stack })})
      } else {
        cb(null, { body: JSON.stringify({message: 'OK' })})
      }
    });
  });
}

module.exports.update = (event, context, cb) => {
  var authorization = event.headers.Authorization.split(":");

  var payload = {
    auth: event.headers.Authorization,
    id: authorization[0],
    key: authorization[1],
    name: event.queryStringParameters.name,
    ip: event.requestContext.identity.sourceIp
  };

  // Validate input and authenticate client
  if (!validInput(event, context, cb)
    || !validAuth(payload, cb)) { return false; }

  updateRecord(payload, cb);

}

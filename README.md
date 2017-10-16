# Serverless Route53 DDNS Service

This is a [serverless](https://github.com/serverless/serverless) service that
provides DDNS functionality for AWS Route53.

To use it, you need a Route53 hosted zone. The service creates a DyanomoDB
table. Items in this table limit who can update which domains. An item looks
like this:

```json
{
  "fqdn": "example.com", 
  "client_id": "123",
  "api_keys": [
    "456"
  ],
  "hosted_zone_id": "ABCD1234567890"
}
```

To update the domain, call the function from a system with a dynamic IP address. Here's an example cron job:
```sh
30 * * * * /opt/bin/curl -H "Authorization: 123:456 https://your-endpoint.execute-api.us-east-1.amazonaws.com/dev/ddns/update?name=example.com 2>&1 > /dev/null
```

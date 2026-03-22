global with sharing class OutboundCallFlow {
    @InvocableMethod(label='Create Outbound SPOT FLOW' description='Create Outbound SPOT FLOW')
    global static List<response> createOutboundCall(List<Request> items){
        Request req = items[0];
        // Generate 16 random bytes
        Blob b = Crypto.generateDigest('SHA-256', Blob.valueOf(String.valueOf(Datetime.now().getTime()) + Math.random()));
        String hex = EncodingUtil.convertToHex(b);

        // Insert dashes in the correct places for a UUID
        String randomGuid =  hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-' + hex.substring(12, 16) + '-' + hex.substring(16, 20) + '-' + hex.substring(20, 32);

        Nebula.Logger.debug('Endpoint: ' + req.endpoint);
        HttpRequest request = new HttpRequest();
        request.setEndpoint('callout:RGF_SPOT_BaseURL' +req.endpoint);
        request.setMethod(req.method);
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Authorization', 'Bearer ' + req.token);
        if(req.callerRef == null){
            req.callerRef = 'BHS';
        }
        if(req.identity == null){
            req.identity = randomGuid;
        }
        if(req.targetRef != null){
            request.setHeader('X-Target-Ref', req.targetRef);
        }
        if(req.xMessageIdIsRequired == True){
            request.setHeader('X-Message-Id', UUID.randomUUID().toString());
            request.setHeader('Accept-Language', 'NL');
        }
        if(req.routing != null){
            request.setHeader('X-Routing-Allowed',req.routing);
        }
        request.setHeader('X-Caller-Ref', req.callerRef);
        request.setHeader('X-Identity', req.identity);
        request.setHeader('X-Correlation-ID', req.identity);
        request.setTimeout(120000);
        if(req.json != null){
            String body = req.json;
            request.setBody(body);
            Nebula.Logger.debug('Body: ' + body);

        }

        HttpResponse response = new Http().send(request);
        //Read header location
        List<String> headerKeys = response.getHeaderKeys();
        response result = new response();
        // Loop through the header keys to retrieve and debug the header values
        for (String headerKey : headerKeys) {
            String headerValue = response.getHeader(headerKey);
            if(headerKey == 'Location'){
                result.headerLocation = headerValue;
            }
        }

        result.httpCode = Integer.valueOf(response.getStatusCode());
        Nebula.Logger.info('HTTP Code: ' + result.httpCode);
         result.result = response.getBody();
        if(response.getStatusCode() != 202 && response.getStatusCode() != 200){
            result.success = false;
            Nebula.Logger.error('Error: ' + result.result + 'Body: ' + response.getBody());
        }else{
            result.success = true;
        }
        List<response> resultList = new List<response>();
        resultList.add(result);
        Nebula.Logger.saveLog();
        return resultList;
    }
    global class Request{
        @InvocableVariable(label='Token Authorization')
        global String token;
        @InvocableVariable(label='Body in JSON Format')
        global String json;
        @InvocableVariable(label='POST/GET/PUT/DELETE/PATCH')
        global String method;
        @InvocableVariable(label='Endpoint URL')
        global String endpoint;
        @InvocableVariable(label='X-Identity')
        global String identity;
        @InvocableVariable(label='X-Caller-Ref')
        global String callerRef;

        @InvocableVariable(label='X-Target-Ref')
        global String targetRef;

        @InvocableVariable(label='X-Routing-Allowed')
        global String routing;

        @InvocableVariable(label='X-Message-Id-Is-Required')
        global Boolean xMessageIdIsRequired;
    }
    global class response{
        @InvocableVariable global Boolean success;
        @InvocableVariable global String error;
        @InvocableVariable global String result;
        @InvocableVariable global Integer httpCode;
        @InvocableVariable global String headerLocation;
    }
}

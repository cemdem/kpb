global with sharing class OutboundCallFlow {
    @InvocableMethod(label='Create Outbound SPOT FLOW' description='Create Outbound SPOT FLOW')
    global static List<response> createOutboundCall(List<Request> items){
        Request req = items[0];
        Blob b = Crypto.generateDigest('SHA-256', Blob.valueOf(String.valueOf(Datetime.now().getTime()) + Math.random()));
        String hex = EncodingUtil.convertToHex(b);
        String randomGuid =  hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-' + hex.substring(12, 16) + '-' + hex.substring(16, 20) + '-' + hex.substring(20, 32);

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
        request.setHeader('x-userrole', 'CONSULENT');
        request.setTimeout(120000);
        if(req.json != null){
            request.setBody(req.json);
        }

        HttpResponse response = new Http().send(request);
        List<String> headerKeys = response.getHeaderKeys();
        response result = new response();
        for (String headerKey : headerKeys) {
            String headerValue = response.getHeader(headerKey);
            if(headerKey == 'Location'){
                result.headerLocation = headerValue;
            }
        }

        result.httpCode = Integer.valueOf(response.getStatusCode());
        result.result = response.getBody();
        result.success = (response.getStatusCode() == 202 || response.getStatusCode() == 200);
        List<response> resultList = new List<response>();
        resultList.add(result);
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

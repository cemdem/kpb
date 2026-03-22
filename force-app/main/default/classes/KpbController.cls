public with sharing class KpbController {

    @AuraEnabled
    public static String getSpotToken() {
        return OAuthFlowController.getToken();
    }

    @AuraEnabled
    public static KpbCallResult callSpot(String endpoint, String method, String body) {
        String token = OAuthFlowController.getToken();

        OutboundCallFlow.Request req = new OutboundCallFlow.Request();
        req.token    = token;
        req.endpoint = endpoint;
        req.method   = method;
        req.json     = body;

        List<OutboundCallFlow.response> results =
            OutboundCallFlow.createOutboundCall(new List<OutboundCallFlow.Request>{ req });

        OutboundCallFlow.response r = results[0];

        KpbCallResult out = new KpbCallResult();
        out.success        = r.success;
        out.httpCode       = r.httpCode;
        out.result         = r.result;
        out.headerLocation = r.headerLocation;
        return out;
    }

    public class KpbCallResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Integer httpCode;
        @AuraEnabled public String  result;
        @AuraEnabled public String  headerLocation;
    }
}

public with sharing class KpbController {

    @AuraEnabled(cacheable=false)
    public static String getSpotToken() {
        SPOT_Settings__c s = SPOT_Settings__c.getInstance();
        OAuthFlowController.Request req = new OAuthFlowController.Request();
        req.client_id     = s.client_id__c;
        req.client_secret = s.client_secret__c;
        req.grant_type    = s.grant_type__c;
        req.URL           = s.url__c;
        List<OAuthFlowController.Results> results =
            OAuthFlowController.OauthToken(new List<OAuthFlowController.Request>{ req });
        OAuthFlowController.Results res = results[0];
        if (!res.success) {
            throw new AuraHandledException(res.error);
        }
        return res.token;
    }

    @AuraEnabled
    public static KpbCallResult callSpot(String endpoint, String method, String body, Boolean xMessageIdIsRequired) {
        SPOT_Settings__c s = SPOT_Settings__c.getInstance();
        OAuthFlowController.Request oauthReq = new OAuthFlowController.Request();
        oauthReq.client_id     = s.client_id__c;
        oauthReq.client_secret = s.client_secret__c;
        oauthReq.grant_type    = s.grant_type__c;
        oauthReq.URL           = s.url__c;
        List<OAuthFlowController.Results> oauthResults =
            OAuthFlowController.OauthToken(new List<OAuthFlowController.Request>{ oauthReq });
        OAuthFlowController.Results oauthRes = oauthResults[0];
        if (!oauthRes.success) {
            throw new AuraHandledException(oauthRes.error);
        }
        String token = oauthRes.token;

        OutboundCallFlow.Request req = new OutboundCallFlow.Request();
        req.token                = token;
        req.endpoint             = endpoint;
        req.method               = method;
        req.json                 = body;
        req.xMessageIdIsRequired = xMessageIdIsRequired;

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

    @AuraEnabled
    public static KpbCallResult getKpb(String recordId) {
        String endpoint = '/candidate-simulations/v1/candidate-costs/' + recordId;
        return callSpot(endpoint, 'GET', null, true);
    }

    public class KpbCallResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Integer httpCode;
        @AuraEnabled public String  result;
        @AuraEnabled public String  headerLocation;
    }
}

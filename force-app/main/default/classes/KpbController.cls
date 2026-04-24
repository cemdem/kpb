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

        Blob b = Crypto.generateDigest('SHA-256', Blob.valueOf(String.valueOf(Datetime.now().getTime()) + Math.random()));
        String guid = EncodingUtil.convertToHex(b).substring(0, 8) + '-' +
                      EncodingUtil.convertToHex(b).substring(8, 12) + '-' +
                      EncodingUtil.convertToHex(b).substring(12, 16) + '-' +
                      EncodingUtil.convertToHex(b).substring(16, 20) + '-' +
                      EncodingUtil.convertToHex(b).substring(20, 32);

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:RGF_SPOT_BaseURL' + endpoint);
        req.setMethod(method);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + oauthRes.token);
        req.setHeader('X-Caller-Ref', 'BHS');
        req.setHeader('X-Identity', guid);
        req.setHeader('X-Correlation-ID', guid);
        req.setHeader('x-userrole', 'CONSULENT');
        req.setHeader('Accept-Language', 'NL');
        if (xMessageIdIsRequired) req.setHeader('X-Message-Id', UUID.randomUUID().toString());
        req.setTimeout(120000);
        if (body != null) req.setBody(body);

        HttpResponse response = new Http().send(req);

        KpbCallResult out = new KpbCallResult();
        out.httpCode = response.getStatusCode();
        out.result   = response.getBody();
        out.success  = (out.httpCode == 200 || out.httpCode == 201 || out.httpCode == 202);
        for (String key : response.getHeaderKeys()) {
            if (key == 'Location') out.headerLocation = response.getHeader(key);
        }
        return out;
    }

    @AuraEnabled
    public static KpbCallResult getKpb(String recordId) {
        String endpoint = '/candidate-simulations/v1/candidate-costs/' + recordId;
        return callSpot(endpoint, 'GET', null, true);
    }

    @AuraEnabled
    public static KpbCallResult createKpb(String body) {
        return callSpot('/candidate-simulations/v1/candidate-costs', 'POST', body, true);
    }

    @AuraEnabled
    public static KpbCallResult updateKpb(String kpbId, String body) {
        return callSpot('/candidate-simulations/v1/candidate-costs/' + kpbId, 'PUT', body, true);
    }

    @AuraEnabled
    public static KpbCallResult deleteKpb(String kpbId) {
        String endpoint = '/candidate-simulations/v1/candidate-costs/' + kpbId;
        return callSpot(endpoint, 'DELETE', null, true);
    }

    @AuraEnabled
    public static KpbCallResult requestApproval(String kpbId, String body) {
        String endpoint = '/candidate-simulations/v1/candidate-costs/' + kpbId + '/request-approval';
        return callSpot(endpoint, 'POST', body, true);
    }

    @AuraEnabled(cacheable=true)
    public static List<Contact> getContactsByBrand(String brand) {
        if (String.isBlank(brand)) return new List<Contact>();
        return [
            SELECT Id, Name
            FROM Contact
            WHERE RGF_Brand__c = :brand
            ORDER BY Name
            LIMIT 200
        ];
    }

    @AuraEnabled(cacheable=true)
    public static String getConsultantName() {
        return [SELECT Name FROM User WHERE Id = :UserInfo.getUserId()].Name;
    }

    public class KpbCallResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Integer httpCode;
        @AuraEnabled public String  result;
        @AuraEnabled public String  headerLocation;
    }
}

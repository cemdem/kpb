public with sharing class KpbController {

    @AuraEnabled
    public static KpbCallResult callSpot(String endpoint, String method, String body, Boolean xMessageIdIsRequired) {
        String token = getSpotAccessToken();

        Blob b = Crypto.generateDigest('SHA-256', Blob.valueOf(String.valueOf(Datetime.now().getTime()) + Math.random()));
        String hex = EncodingUtil.convertToHex(b);
        String guid = hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-' +
                      hex.substring(12, 16) + '-' + hex.substring(16, 20) + '-' + hex.substring(20, 32);

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:RGF_SPOT_BaseURL' + endpoint);
        req.setMethod(method);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + token);
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

    // Returns a cached OAuth access token; fetches a fresh one only on cache miss.
    // Uses Platform Cache (Cache.Org) so the token is shared across requests and
    // automatically expires rather than making a new OAuth call on every callout.
    private static String getSpotAccessToken() {
        final String CACHE_KEY = 'local.KpbSpot.accessToken';
        String cached;
        try { cached = (String) Cache.Org.get(CACHE_KEY); } catch (Exception ignored) {}
        if (String.isNotBlank(cached)) return cached;

        SPOT_Settings__c s = SPOT_Settings__c.getInstance();
        OAuthFlowController.Request req = new OAuthFlowController.Request();
        req.client_id     = s.client_id__c;
        req.client_secret = s.client_secret__c;
        req.grant_type    = s.grant_type__c;
        req.URL           = s.url__c;
        List<OAuthFlowController.Results> results =
            OAuthFlowController.OauthToken(new List<OAuthFlowController.Request>{ req });
        OAuthFlowController.Results res = results[0];
        if (!res.success) throw new AuraHandledException(res.error);

        try { Cache.Org.put(CACHE_KEY, res.token, 3000); } catch (Exception ignored) {}
        return res.token;
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
    public static KpbCallResult listCandidateCosts(String employeeId, String payrollId) {
        String endpoint = '/candidate-simulations/v1/candidate-costs?employee_id=' + employeeId
                        + '&payroll_id=' + payrollId
                        + '&simulation_type=OVK';
        return callSpot(endpoint, 'GET', null, true);
    }

    @AuraEnabled
    public static KpbCallResult triggerPjsCreation(String employeeId, String payrollId, String contactSfId) {
        // Fire the actual HTTP callout asynchronously. @future(callout=true) runs in a separate
        // execution context where named credential External Credential Principal resolution may
        // succeed even when it fails in @AuraEnabled context (where @InvocableMethod-from-Flow
        // works but direct @AuraEnabled does not).
        triggerPjsCreationAsync(employeeId, payrollId, contactSfId);
        // The LWC already waits 5 seconds and polls Contact.RGF_IFOrce_Number_PJS__c, so the
        // synchronous response from this method doesn't carry the actual API status.
        KpbCallResult out = new KpbCallResult();
        out.httpCode = 202;
        out.success  = true;
        out.result   = '{"async":true}';
        return out;
    }

    @future(callout=true)
    public static void triggerPjsCreationAsync(String employeeId, String payrollId, String contactSfId) {
        String token = getSpotAccessToken();

        Blob b = Crypto.generateDigest('SHA-256', Blob.valueOf(String.valueOf(Datetime.now().getTime()) + Math.random()));
        String hex = EncodingUtil.convertToHex(b);
        String guid = hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-' + hex.substring(12, 16) + '-' + hex.substring(16, 20) + '-' + hex.substring(20, 32);

        String now = Datetime.now().format('yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
        String body = JSON.serialize(new Map<String, Object>{
            'payload' => new Map<String, Object>{
                'employee_id' => employeeId,
                'payroll_id'  => payrollId,
                'applications' => new List<Object>{
                    new Map<String, Object>{
                        'internal'       => true,
                        'modified_on'    => now,
                        'application_id' => 'no application',
                        'op'             => 'add'
                    }
                },
                'external_system_ids' => new List<Object>{
                    new Map<String, Object>{
                        'external_system_identifier' => contactSfId,
                        'external_system'            => 'BHS'
                    }
                }
            },
            'datetime' => now,
            'type'     => 'push_to_ifo_event_v1',
            'source'   => 'BHS'
        });

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:RGF_SPOT_BaseURL/ingress-event-gateway/v1/ats');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + token);
        req.setHeader('X-Caller-Ref', 'bullhorn_for_salesforce');
        req.setHeader('X-Identity', guid);
        req.setHeader('X-Correlation-ID', guid);
        req.setHeader('X-Message-Id', UUID.randomUUID().toString());
        req.setHeader('Accept-Language', 'NL');
        req.setTimeout(120000);
        req.setBody(body);

        HttpResponse response = new Http().send(req);
        Integer code = response.getStatusCode();
        String responseBody = response.getBody();
        System.debug('triggerPjsCreationAsync httpCode: ' + code + ' body: ' + responseBody);
        if (code != 200 && code != 201 && code != 202) {
            throw new CalloutException('triggerPjsCreationAsync HTTP ' + code + ': ' + responseBody);
        }
    }

    @AuraEnabled
    public static String getContactPjsNumber(String contactId) {
        List<Contact> contacts = [SELECT RGF_IFOrce_Number_PJS__c FROM Contact WHERE Id = :contactId LIMIT 1];
        return contacts.isEmpty() ? null : contacts[0].RGF_IFOrce_Number_PJS__c;
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

@IsTest
private class KpbControllerTest {

    private class MultiMock implements HttpCalloutMock {
        private Integer callCount = 0;

        public HttpResponse respond(HttpRequest req) {
            callCount++;
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            if (callCount == 1) {
                // OAuth token request
                res.setStatusCode(200);
                res.setBody('{"access_token":"test-token","token_type":"Bearer","expires_in":3600}');
            } else {
                // SPOT API request
                res.setStatusCode(200);
                res.setBody('{"result":"ok"}');
            }
            return res;
        }
    }

    private class ErrorMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(401);
            res.setBody('{"error":"unauthorized"}');
            return res;
        }
    }

    private static void setupSettings() {
        SPOT_Settings__c s = new SPOT_Settings__c(
            SetupOwnerId     = UserInfo.getOrganizationId(),
            client_id__c     = 'test-client-id',
            client_secret__c = 'test-secret',
            grant_type__c    = 'client_credentials',
            url__c           = 'https://auth.example.com/token'
        );
        insert s;
    }

    @IsTest
    static void testGetKpb_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.getKpb('test-record-id');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testCallSpot_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.callSpot('/test/endpoint', 'GET', null, true);
        Test.stopTest();

        System.assert(result.success);
        System.assertEquals(200, result.httpCode);
    }

    @IsTest
    static void testCallSpot_withBody() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.callSpot('/test/endpoint', 'POST', '{"key":"value"}', false);
        Test.stopTest();

        System.assertNotEquals(null, result);
    }

    @IsTest
    static void testCallSpot_oauthFailure() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new ErrorMock());

        Test.startTest();
        try {
            KpbController.callSpot('/test/endpoint', 'GET', null, false);
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();
    }
}

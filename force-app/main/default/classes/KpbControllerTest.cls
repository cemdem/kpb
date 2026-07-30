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
        KpbController.KpbCallResult result = KpbController.getKpb('test-record-id', 'P-1234');
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

    @IsTest
    static void testCreateKpb_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.createKpb('{"costgroup":{}}', 'P-1234', '22');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testUpdateKpb_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.updateKpb('123', '{"costgroup":{}}', 'P-1234', '22');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testDeleteKpb_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.deleteKpb('123', 'P-1234', '22');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testListCandidateCosts_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.listCandidateCosts('emp-123', '6', 'P-1234');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testRequestApproval_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.requestApproval('123', '{"reason":"test"}', 'P-1234', '22');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testApproveSimulation_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.approveSimulation('123', 'P-1234', '22');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testGetContactPjsNumber_found() {
        Contact c = new Contact(LastName = 'Test', RGF_IFOrce_Number_PJS__c = 'P-9999');
        insert c;

        Test.startTest();
        String pjs = KpbController.getContactPjsNumber(c.Id);
        Test.stopTest();

        System.assertEquals('P-9999', pjs);
    }

    @IsTest
    static void testGetContactPjsNumber_notFound() {
        Contact c = new Contact(LastName = 'NoPjs');
        insert c;

        Test.startTest();
        String pjs = KpbController.getContactPjsNumber(c.Id);
        Test.stopTest();

        System.assertEquals(null, pjs);
    }

    @IsTest
    static void testGetContactsByBrand_blank() {
        Test.startTest();
        List<Contact> contacts = KpbController.getContactsByBrand('');
        Test.stopTest();

        System.assertEquals(0, contacts.size());
    }

    @IsTest
    static void testGetContactsByBrand_withBrand() {
        // RGF_Brand__c is a restricted picklist so we cannot insert a Contact with
        // an arbitrary value. Verify the method runs the SOQL without error and
        // returns a list (empty in test context is fine).
        Test.startTest();
        List<Contact> contacts = KpbController.getContactsByBrand('UNQ');
        Test.stopTest();

        System.assertNotEquals(null, contacts);
    }

    @IsTest
    static void testGetConsultantName() {
        Test.startTest();
        String name = KpbController.getConsultantName();
        Test.stopTest();

        System.assertNotEquals(null, name);
    }

    @IsTest
    static void testLinkKpbToApplication_invalidId() {
        // TR1__Application_V2__c has a managed-package trigger that requires fields
        // we cannot set in test context, so we cannot insert a test record.
        // Verify the method executes (DML is attempted) and throws on invalid ID.
        Test.startTest();
        try {
            KpbController.linkKpbToApplication('INVALID', 12345, 45.6789, 22.50);
            System.assert(false, 'Expected DmlException');
        } catch (Exception e) {
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();
    }

    @IsTest
    static void testUnlinkKpbFromApplication_invalidId() {
        Test.startTest();
        try {
            KpbController.unlinkKpbFromApplication('INVALID');
            System.assert(false, 'Expected DmlException');
        } catch (Exception e) {
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();
    }
}

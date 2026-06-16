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
        KpbController.KpbCallResult result = KpbController.createKpb('{"costgroup":{}}', 'P-1234');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testUpdateKpb_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.updateKpb('123', '{"costgroup":{}}', 'P-1234');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testDeleteKpb_success() {
        setupSettings();
        Test.setMock(HttpCalloutMock.class, new MultiMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.deleteKpb('123', 'P-1234');
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
        KpbController.KpbCallResult result = KpbController.requestApproval('123', '{"reason":"test"}', 'P-1234');
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
        Contact c = new Contact(LastName = 'BrandTest', RGF_Brand__c = 'UNQ');
        insert c;

        Test.startTest();
        List<Contact> contacts = KpbController.getContactsByBrand('UNQ');
        Test.stopTest();

        System.assert(contacts.size() >= 1);
    }

    @IsTest
    static void testGetConsultantName() {
        Test.startTest();
        String name = KpbController.getConsultantName();
        Test.stopTest();

        System.assertNotEquals(null, name);
    }

    @IsTest
    static void testLinkAndUnlinkKpbFromApplication() {
        TR1__Application_V2__c app = new TR1__Application_V2__c();
        insert app;

        Test.startTest();
        KpbController.linkKpbToApplication(app.Id, 12345, 45.6789, 22.50);
        TR1__Application_V2__c linked = [SELECT RGF_KPB_Id__c, RGF_KPB_Cost__c, RGF_KPB_Margin__c FROM TR1__Application_V2__c WHERE Id = :app.Id];
        System.assertEquals(12345, linked.RGF_KPB_Id__c);
        System.assertEquals(45.6789, linked.RGF_KPB_Cost__c);
        System.assertEquals(22.50, linked.RGF_KPB_Margin__c);

        KpbController.unlinkKpbFromApplication(app.Id);
        TR1__Application_V2__c unlinked = [SELECT RGF_KPB_Id__c FROM TR1__Application_V2__c WHERE Id = :app.Id];
        System.assertEquals(null, unlinked.RGF_KPB_Id__c);
        Test.stopTest();
    }
}

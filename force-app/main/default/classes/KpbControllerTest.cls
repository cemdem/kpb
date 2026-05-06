@IsTest
private class KpbControllerTest {

    private class SuccessMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(200);
            res.setBody('{"result":"ok"}');
            return res;
        }
    }

    private class ErrorMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(500);
            res.setBody('{"error":"server error"}');
            return res;
        }
    }

    @IsTest
    static void testGetKpb_success() {
        Test.setMock(HttpCalloutMock.class, new SuccessMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.getKpb('test-record-id');
        Test.stopTest();

        System.assertNotEquals(null, result);
        System.assert(result.success);
    }

    @IsTest
    static void testCallSpot_success() {
        Test.setMock(HttpCalloutMock.class, new SuccessMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.callSpot('/test/endpoint', 'GET', null, true);
        Test.stopTest();

        System.assert(result.success);
        System.assertEquals(200, result.httpCode);
    }

    @IsTest
    static void testCallSpot_withBody() {
        Test.setMock(HttpCalloutMock.class, new SuccessMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.callSpot('/test/endpoint', 'POST', '{"key":"value"}', false);
        Test.stopTest();

        System.assertNotEquals(null, result);
    }

    @IsTest
    static void testCallSpot_failure() {
        Test.setMock(HttpCalloutMock.class, new ErrorMock());

        Test.startTest();
        KpbController.KpbCallResult result = KpbController.callSpot('/test/endpoint', 'GET', null, false);
        Test.stopTest();

        System.assert(!result.success);
        System.assertEquals(500, result.httpCode);
    }
}

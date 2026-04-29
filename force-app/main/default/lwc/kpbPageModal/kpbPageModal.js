import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import KpbApprovalModal from 'c/kpbApprovalModal';
import requestApproval from '@salesforce/apex/KpbController.requestApproval';

export default class KpbPageModal extends LightningModal {
    @api recordId;
    @api action;
    @api brand;
    @api candidateName;
    @api pNumber;

    get title() {
        if (this.action === 'EDIT') return 'Edit Cost Group';
        return 'New Cost Group';
    }

    handleClose(event) {
        this.close(event?.detail ?? {});
    }

    async handleApprove(event) {
        console.log('[kpbPageModal] handleApprove — event received, kpbId:', event.detail?.kpbId);
        const { kpbId } = event.detail;
        let reason;
        try {
            reason = await KpbApprovalModal.open({ size: 'small' });
        } catch (modalErr) {
            console.error('[kpbPageModal] KpbApprovalModal.open failed (nested modal not supported?):', modalErr);
            return;
        }
        if (!reason) return;
        try {
            const body = JSON.stringify({ reason });
            const result = await requestApproval({ kpbId: String(kpbId), body });
            const kpbPage = this.template.querySelector('c-kpb-page');
            if (result.success) {
                kpbPage?.showApproveResult(true, null);
            } else {
                const err = this._apiError(result);
                kpbPage?.showApproveResult(false, err);
            }
        } catch (e) {
            const kpbPage = this.template.querySelector('c-kpb-page');
            kpbPage?.showApproveResult(false, e.body?.message ?? e.message ?? 'Onbekende fout');
        }
    }

    _apiError(result) {
        try {
            const body = JSON.parse(result.result);
            const errors = body?.error_message?.errors;
            if (Array.isArray(errors) && errors.length) return errors.map(e => e.error_message).join(' | ');
        } catch (_) { /* fall through */ }
        return `HTTP ${result.httpCode}: ${result.result}`;
    }
}

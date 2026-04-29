import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class KpbApprovalModal extends LightningModal {
    reason = '';

    get submitDisabled() {
        return !this.reason.trim();
    }

    handleReasonChange(event) {
        this.reason = event.target.value;
    }

    handleCancel() {
        this.close(null);
    }

    handleSubmit() {
        if (!this.reason.trim()) return;
        this.close(this.reason.trim());
    }
}

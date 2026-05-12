import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class KpbPageModal extends LightningModal {
    @api recordId;
    @api action;
    @api brand;
    @api candidateName;
    @api pNumber;
    @api genericEmployeeId;
    @api genericEmployeeNumber;
    @api contactId;
    @api contactType;

    renderedCallback() {
        if (!this.contactType) return;
        const page = this.template.querySelector('c-kpb-page');
        if (page && page.contactType !== this.contactType) {
            page.contactType = this.contactType;
        }
    }

    get title() {
        if (this.action === 'EDIT') return 'Edit Cost Group';
        return 'New Cost Group';
    }

    handleClose(event) {
        this.close(event?.detail ?? {});
    }
}

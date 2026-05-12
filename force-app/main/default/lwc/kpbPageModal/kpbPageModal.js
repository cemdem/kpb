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
    @api isFreelance = false;

    renderedCallback() {
        const page = this.template.querySelector('c-kpb-page');
        if (page && page.isFreelance !== this.isFreelance) {
            page.isFreelance = this.isFreelance;
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

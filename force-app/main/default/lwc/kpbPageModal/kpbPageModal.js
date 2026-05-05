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

    connectedCallback() {
        console.log('[kpbPageModal] connectedCallback — contactId:', this.contactId, '| genericEmployeeId:', this.genericEmployeeId, '| genericEmployeeNumber:', this.genericEmployeeNumber);
    }

    get title() {
        if (this.action === 'EDIT') return 'Edit Cost Group';
        return 'New Cost Group';
    }

    handleClose(event) {
        this.close(event?.detail ?? {});
    }
}

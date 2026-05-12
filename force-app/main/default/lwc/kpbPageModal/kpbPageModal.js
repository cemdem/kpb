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

    _freelance;
    @api
    get freelance() {
        console.log('[kpbPageModal] freelance GETTER returning:', this._freelance);
        return this._freelance;
    }
    set freelance(v) {
        console.log('[kpbPageModal] freelance SETTER called with:', v, '| typeof:', typeof v);
        this._freelance = v;
    }

    get freelanceBool() {
        const bool = this._freelance === 'true' || this._freelance === true;
        console.log('[kpbPageModal] freelanceBool getter — _freelance:', this._freelance, '→ bool:', bool);
        return bool;
    }

    connectedCallback() {
        console.log('[kpbPageModal] connectedCallback — freelance:', this._freelance, '| pNumber:', this.pNumber, '| brand:', this.brand, '| contactId:', this.contactId);
    }

    renderedCallback() {
        console.log('[kpbPageModal] renderedCallback — freelance:', this._freelance, '| freelanceBool:', this.freelanceBool, '| pNumber:', this.pNumber);
    }

    get title() {
        if (this.action === 'EDIT') return 'Edit Cost Group';
        return 'New Cost Group';
    }

    handleClose(event) {
        this.close(event?.detail ?? {});
    }
}

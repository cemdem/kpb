import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import { LABELS } from 'c/kpbLabels';

export default class KpbPageModal extends LightningModal {
    @api recordId;
    @api action;
    @api brand;
    @api candidateName;
    @api pNumber;
    @api genericEmployeeId;
    @api genericEmployeeNumber;
    @api contactId;
    @api office;
    @api payrollId;

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

    // Remove the framework's top-right X (and ESC / click-outside dismiss).
    // Those paths close the modal without running kpbPage.handleClose, so they
    // skip the navigation/reload and leave the record page showing stale KPB
    // cost/margin values. Forcing every close through the in-page Sluiten button
    // guarantees the page reloads and reflects the latest values.
    get disableClose() {
        return true;
    }

    get title() {
        if (this.action === 'EDIT') return LABELS.Mdl_EditCostGroup;
        return LABELS.Mdl_NewCostGroup;
    }

    handleClose(event) {
        this.close(event?.detail ?? {});
    }
}

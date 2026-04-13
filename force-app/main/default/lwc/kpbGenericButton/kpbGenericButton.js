import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import KpbPageModal from 'c/kpbPageModal';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;
    @api selectionCount = 0;

    get _safeRecordId() {
        if (!this.recordId) return null;
        const match = this.recordId.match(/\/([a-zA-Z0-9]{15,18})\/view/);
        return match ? match[1] : this.recordId;
    }

    get hasSelection() {
        return Number(this.selectionCount) === 1;
    }

    _validate() {
        const count = Number(this.selectionCount);
        if (count === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer eerst een rij in één van de tabellen.',
                variant: 'warning'
            }));
            return false;
        }
        if (count > 1) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer een rij in slechts één tabel.',
                variant: 'warning'
            }));
            return false;
        }
        return true;
    }

    _open(action) {
        KpbPageModal.open({ recordId: this._safeRecordId, action, size: 'large' });
    }

    handleNew() {
        this._open('NEW');
    }

    handleCopy() {
        if (this._validate()) this._open('COPY');
    }

    handleEdit() {
        if (this._validate()) this._open('EDIT');
    }
}

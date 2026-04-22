import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import KpbPageModal from 'c/kpbPageModal';
import deleteKpb from '@salesforce/apex/KpbController.deleteKpb';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;
    @api selectionCount = 0;
    @api brand;
    @api candidateName;

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
        console.log('[kpbGenericButton] _open — action:', action, '| brand:', this.brand, '| candidateName:', this.candidateName, '| recordId:', this.recordId);
        KpbPageModal.open({ recordId: this.recordId, action, brand: this.brand, candidateName: this.candidateName, size: 'large' });
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

    _apiError(result) {
        try {
            const body = JSON.parse(result.result);
            const errors = body?.error_message?.errors;
            if (Array.isArray(errors) && errors.length) {
                return errors.map(e => e.error_message).join(' | ');
            }
        } catch (e) { /* fall through */ }
        return `HTTP ${result.httpCode}: ${result.result}`;
    }

    async handleDelete() {
        if (!this._validate()) return;
        try {
            const result = await deleteKpb({ kpbId: this.recordId });
            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Kostprijsberekening verwijderd.',
                    variant: 'success'
                }));
                this.dispatchEvent(new FlowNavigationNextEvent());
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Kostprijsberekening verwijderen niet toegelaten.',
                    message: this._apiError(result),
                    variant: 'error'
                }));
            }
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Kostprijsberekening verwijderen niet toegelaten.',
                message: e.body?.message ?? e.message ?? 'Onbekende fout',
                variant: 'error'
            }));
        }
    }
}

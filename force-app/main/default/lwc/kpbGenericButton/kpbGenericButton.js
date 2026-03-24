import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import KpbPageModal from 'c/kpbPageModal';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;
    @api selectedRows1;
    @api selectedRows2;
    @api selectedRows3;
    @api selectedRows4;

    get _filledSelections() {
        return [this.selectedRows1, this.selectedRows2, this.selectedRows3, this.selectedRows4]
            .filter(s => s && s.trim() !== '[]' && s.trim() !== '');
    }

    handleClick() {
        const filled = this._filledSelections;
        if (filled.length !== 1) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: filled.length === 0
                    ? 'Selecteer eerst een rij in één van de tabellen.'
                    : 'Selecteer een rij in slechts één tabel.',
                variant: 'warning'
            }));
            return;
        }
        KpbPageModal.open({
            recordId: this.recordId,
            action: this.action,
            size: 'large'
        });
    }
}

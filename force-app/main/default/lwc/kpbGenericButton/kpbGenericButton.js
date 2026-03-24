import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import KpbPageModal from 'c/kpbPageModal';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;
    @api selectedRowId1;
    @api selectedRowId2;
    @api selectedRowId3;
    @api selectedRowId4;

    get _filledCount() {
        return [this.selectedRowId1, this.selectedRowId2, this.selectedRowId3, this.selectedRowId4]
            .filter(id => id && id.trim() !== '').length;
    }

    handleClick() {
        const count = this._filledCount;
        if (count === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer eerst een rij in één van de tabellen.',
                variant: 'warning'
            }));
            return;
        }
        if (count > 1) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer een rij in slechts één tabel.',
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

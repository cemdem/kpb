import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import KpbPageModal from 'c/kpbPageModal';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;

    handleClick() {
        if (!this.recordId || this.recordId.trim() === '') {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Ongeldige selectie',
                message: 'Selecteer eerst een rij in één van de tabellen.',
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

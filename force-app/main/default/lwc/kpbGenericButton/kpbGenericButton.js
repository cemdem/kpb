import { LightningElement, api } from 'lwc';
import KpbPageModal from 'c/kpbPageModal';

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;
    @api recordId;

    handleClick() {
        KpbPageModal.open({
            recordId: this.recordId,
            action: this.action,
            size: 'large'
        });
    }
}

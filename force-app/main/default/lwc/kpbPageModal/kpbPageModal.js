import { api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class KpbPageModal extends LightningModal {
    @api recordId;
    @api action;
    @api json;

    get title() {
        return this.action === 'NEW' ? 'New Cost Group' : 'Edit Cost Group';
    }

    handleClose() {
        this.close();
    }
}

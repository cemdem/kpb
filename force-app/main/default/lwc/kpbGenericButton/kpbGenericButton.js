import { LightningElement, api } from 'lwc';
import KpbPageModal from 'c/kpbPageModal';

// Valid values for the action property
const VALID_ACTIONS = ['EDIT', 'COPY', 'NEW'];

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;        // EDIT | COPY | NEW
    @api recordId;      // Record Id passed in from the current flow
    @api json;          // Cost group JSON passed in from the current flow

    handleClick() {
        if (!VALID_ACTIONS.includes(this.action)) {
            console.error(`kpbGenericButton: invalid action "${this.action}". Must be one of ${VALID_ACTIONS.join(', ')}.`);
        }

        KpbPageModal.open({
            recordId: this.recordId,
            action: this.action,
            json: this.json,
            size: 'large'
        });
    }
}

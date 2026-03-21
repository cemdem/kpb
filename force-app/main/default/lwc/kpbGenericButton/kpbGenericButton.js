import { LightningElement, api } from 'lwc';

// Valid values for the action property
const VALID_ACTIONS = ['EDIT', 'COPY', 'NEW'];

export default class KpbGenericButton extends LightningElement {
    @api label = 'Start';
    @api action;        // EDIT | COPY | NEW
    @api flowApiName;   // API name of the flow to launch
    @api recordId;      // Record Id passed in from the current flow

    handleClick() {
        if (!VALID_ACTIONS.includes(this.action)) {
            console.error(`kpbGenericButton: invalid action "${this.action}". Must be one of ${VALID_ACTIONS.join(', ')}.`);
        }

        // Dispatch finish event so the current flow screen closes cleanly
        this.dispatchEvent(new CustomEvent('finish'));

        if (this.flowApiName) {
            setTimeout(() => {
                let url = `/flow/${this.flowApiName}`;

                const params = new URLSearchParams();
                if (this.recordId) {
                    params.set('recordId', this.recordId);
                }
                if (this.action) {
                    params.set('action', this.action);
                }
                const qs = params.toString();
                if (qs) {
                    url += `?${qs}`;
                }

                window.location.href = url;
            }, 200);
        }
    }
}

import { LightningElement, api } from 'lwc';

export default class KpbPage extends LightningElement {
    @api recordId;
    @api action;

    // Kept for backwards compatibility — referenced in existing flow versions
    @api json;
}

import { SlaService } from './sla.service';
export declare class SlaController {
    private readonly slaService;
    constructor(slaService: SlaService);
    trigger(): Promise<void>;
}

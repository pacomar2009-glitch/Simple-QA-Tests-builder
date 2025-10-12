import { Logger } from '@n8n/backend-common';
import { DataStoreProxyProvider, IDataStoreProjectAggregateService, IDataStoreProjectService, INode, Workflow } from 'n8n-workflow';
import { OwnershipService } from '../../services/ownership.service';
import { DataStoreService } from './data-store.service';
declare const ALLOWED_NODES: readonly ["n8n-nodes-base.dataTable", "n8n-nodes-base.dataTableTool", "n8n-nodes-base.evaluationTrigger", "n8n-nodes-base.evaluation"];
type AllowedNode = (typeof ALLOWED_NODES)[number];
export declare function isAllowedNode(s: string): s is AllowedNode;
export declare class DataStoreProxyService implements DataStoreProxyProvider {
    private readonly dataStoreService;
    private readonly ownershipService;
    private readonly logger;
    constructor(dataStoreService: DataStoreService, ownershipService: OwnershipService, logger: Logger);
    private validateRequest;
    private getProjectId;
    getDataStoreAggregateProxy(workflow: Workflow, node: INode, projectId?: string): Promise<IDataStoreProjectAggregateService>;
    getDataStoreProxy(workflow: Workflow, node: INode, dataStoreId: string, projectId?: string): Promise<IDataStoreProjectService>;
    private makeAggregateOperations;
    private makeDataStoreOperations;
}
export {};

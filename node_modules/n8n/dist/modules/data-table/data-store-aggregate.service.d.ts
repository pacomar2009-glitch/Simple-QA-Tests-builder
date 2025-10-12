import type { ListDataStoreQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { ProjectService } from '../../services/project.service.ee';
import { DataStoreRepository } from './data-store.repository';
export declare class DataStoreAggregateService {
    private readonly dataStoreRepository;
    private readonly projectService;
    private readonly logger;
    constructor(dataStoreRepository: DataStoreRepository, projectService: ProjectService, logger: Logger);
    start(): Promise<void>;
    shutdown(): Promise<void>;
    getManyAndCount(user: User, options: ListDataStoreQueryDto): Promise<{
        count: number;
        data: import("./data-table.entity").DataTable[];
    }>;
}

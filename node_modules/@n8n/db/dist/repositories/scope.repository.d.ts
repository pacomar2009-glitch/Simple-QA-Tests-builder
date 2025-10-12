import { DataSource, Repository } from '@n8n/typeorm';
import { Scope } from '../entities';
export declare class ScopeRepository extends Repository<Scope> {
    constructor(dataSource: DataSource);
    findByList(slugs: string[]): Promise<Scope[]>;
}

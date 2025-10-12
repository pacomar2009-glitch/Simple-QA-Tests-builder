import { Logger } from '@n8n/backend-common';
import { type Variables, type TagEntity, FolderRepository, TagRepository, type User } from '@n8n/db';
import { SourceControlGitService } from './source-control-git.service.ee';
import { SourceControlImportService } from './source-control-import.service.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import type { StatusExportableCredential } from './types/exportable-credential';
import type { ExportableFolder } from './types/exportable-folders';
import type { SourceControlGetStatus } from './types/source-control-get-status';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';
import { EventService } from '../../events/event.service';
export declare class SourceControlStatusService {
    private readonly logger;
    private readonly gitService;
    private readonly sourceControlImportService;
    private readonly sourceControlPreferencesService;
    private readonly tagRepository;
    private readonly folderRepository;
    private readonly eventService;
    constructor(logger: Logger, gitService: SourceControlGitService, sourceControlImportService: SourceControlImportService, sourceControlPreferencesService: SourceControlPreferencesService, tagRepository: TagRepository, folderRepository: FolderRepository, eventService: EventService);
    private get gitFolder();
    getStatus(user: User, options: SourceControlGetStatus): Promise<{
        type: "workflow" | "credential" | "file" | "tags" | "variables" | "folders";
        status: "unknown" | "new" | "modified" | "deleted" | "created" | "renamed" | "conflicted" | "ignored" | "staged";
        id: string;
        name: string;
        updatedAt: string;
        file: string;
        location: "local" | "remote";
        conflict: boolean;
        pushed?: boolean | undefined;
        owner?: {
            type: "personal" | "team";
            projectId: string;
            projectName: string;
        } | undefined;
    }[] | {
        wfRemoteVersionIds: SourceControlWorkflowVersionId[];
        wfLocalVersionIds: SourceControlWorkflowVersionId[];
        wfMissingInLocal: SourceControlWorkflowVersionId[];
        wfMissingInRemote: SourceControlWorkflowVersionId[];
        wfModifiedInEither: SourceControlWorkflowVersionId[];
        credMissingInLocal: StatusExportableCredential[];
        credMissingInRemote: StatusExportableCredential[];
        credModifiedInEither: StatusExportableCredential[];
        varMissingInLocal: Variables[];
        varMissingInRemote: Variables[];
        varModifiedInEither: Variables[];
        tagsMissingInLocal: TagEntity[];
        tagsMissingInRemote: TagEntity[];
        tagsModifiedInEither: TagEntity[];
        mappingsMissingInLocal: import("@n8n/db").WorkflowTagMapping[];
        mappingsMissingInRemote: import("@n8n/db").WorkflowTagMapping[];
        foldersMissingInLocal: ExportableFolder[];
        foldersMissingInRemote: ExportableFolder[];
        foldersModifiedInEither: ExportableFolder[];
        sourceControlledFiles: {
            type: "workflow" | "credential" | "file" | "tags" | "variables" | "folders";
            status: "unknown" | "new" | "modified" | "deleted" | "created" | "renamed" | "conflicted" | "ignored" | "staged";
            id: string;
            name: string;
            updatedAt: string;
            file: string;
            location: "local" | "remote";
            conflict: boolean;
            pushed?: boolean | undefined;
            owner?: {
                type: "personal" | "team";
                projectId: string;
                projectName: string;
            } | undefined;
        }[];
    }>;
    private resetWorkfolder;
    private getStatusWorkflows;
    private getStatusCredentials;
    private getStatusVariables;
    private getStatusTagsMappings;
    private getStatusFoldersMapping;
}

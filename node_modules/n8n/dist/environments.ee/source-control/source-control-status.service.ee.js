"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceControlStatusService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const n8n_workflow_1 = require("n8n-workflow");
const source_control_git_service_ee_1 = require("./source-control-git.service.ee");
const source_control_helper_ee_1 = require("./source-control-helper.ee");
const source_control_import_service_ee_1 = require("./source-control-import.service.ee");
const source_control_preferences_service_ee_1 = require("./source-control-preferences.service.ee");
const source_control_context_1 = require("./types/source-control-context");
const forbidden_error_1 = require("../../errors/response-errors/forbidden.error");
const event_service_1 = require("../../events/event.service");
let SourceControlStatusService = class SourceControlStatusService {
    constructor(logger, gitService, sourceControlImportService, sourceControlPreferencesService, tagRepository, folderRepository, eventService) {
        this.logger = logger;
        this.gitService = gitService;
        this.sourceControlImportService = sourceControlImportService;
        this.sourceControlPreferencesService = sourceControlPreferencesService;
        this.tagRepository = tagRepository;
        this.folderRepository = folderRepository;
        this.eventService = eventService;
    }
    get gitFolder() {
        return this.sourceControlPreferencesService.gitFolder;
    }
    async getStatus(user, options) {
        const context = new source_control_context_1.SourceControlContext(user);
        if (options.direction === 'pull' && !(0, permissions_1.hasGlobalScope)(user, 'sourceControl:pull')) {
            throw new forbidden_error_1.ForbiddenError('You do not have permission to pull from source control');
        }
        const sourceControlledFiles = [];
        await this.resetWorkfolder();
        const { wfRemoteVersionIds, wfLocalVersionIds, wfMissingInLocal, wfMissingInRemote, wfModifiedInEither, } = await this.getStatusWorkflows(options, context, sourceControlledFiles);
        const { credMissingInLocal, credMissingInRemote, credModifiedInEither } = await this.getStatusCredentials(options, context, sourceControlledFiles);
        const { varMissingInLocal, varMissingInRemote, varModifiedInEither } = await this.getStatusVariables(options, sourceControlledFiles);
        const { tagsMissingInLocal, tagsMissingInRemote, tagsModifiedInEither, mappingsMissingInLocal, mappingsMissingInRemote, } = await this.getStatusTagsMappings(options, context, sourceControlledFiles);
        const { foldersMissingInLocal, foldersMissingInRemote, foldersModifiedInEither } = await this.getStatusFoldersMapping(options, context, sourceControlledFiles);
        if (options.direction === 'push') {
            this.eventService.emit('source-control-user-started-push-ui', (0, source_control_helper_ee_1.getTrackingInformationFromPrePushResult)(user.id, sourceControlledFiles));
        }
        else if (options.direction === 'pull') {
            this.eventService.emit('source-control-user-started-pull-ui', (0, source_control_helper_ee_1.getTrackingInformationFromPullResult)(user.id, sourceControlledFiles));
        }
        if (options?.verbose) {
            return {
                wfRemoteVersionIds,
                wfLocalVersionIds,
                wfMissingInLocal,
                wfMissingInRemote,
                wfModifiedInEither,
                credMissingInLocal,
                credMissingInRemote,
                credModifiedInEither,
                varMissingInLocal,
                varMissingInRemote,
                varModifiedInEither,
                tagsMissingInLocal,
                tagsMissingInRemote,
                tagsModifiedInEither,
                mappingsMissingInLocal,
                mappingsMissingInRemote,
                foldersMissingInLocal,
                foldersMissingInRemote,
                foldersModifiedInEither,
                sourceControlledFiles,
            };
        }
        else {
            return sourceControlledFiles;
        }
    }
    async resetWorkfolder() {
        if (!this.gitService.git) {
            throw new Error('Git service not initialized');
        }
        try {
            await this.gitService.resetBranch();
            await this.gitService.pull();
        }
        catch (error) {
            this.logger.error(`Failed to reset workfolder: ${error instanceof Error ? error.message : String(error)}`);
            throw new n8n_workflow_1.UserError(`Unable to fetch updates from git - your folder might be out of sync. Try reconnecting from the Source Control settings page. Git error message: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getStatusWorkflows(options, context, sourceControlledFiles) {
        const wfRemoteVersionIds = await this.sourceControlImportService.getRemoteVersionIdsFromFiles(context);
        const wfLocalVersionIds = await this.sourceControlImportService.getLocalVersionIdsFromDb(context);
        let outOfScopeWF = [];
        if (!context.hasAccessToAllProjects()) {
            outOfScopeWF = await this.sourceControlImportService.getAllLocalVersionIdsFromDb();
            outOfScopeWF = outOfScopeWF.filter((wf) => !wfLocalVersionIds.some((local) => local.id === wf.id));
        }
        const wfMissingInLocal = wfRemoteVersionIds
            .filter((remote) => wfLocalVersionIds.findIndex((local) => local.id === remote.id) === -1)
            .filter((remote) => !outOfScopeWF.some((outOfScope) => outOfScope.id === remote.id));
        const wfMissingInRemote = wfLocalVersionIds.filter((local) => wfRemoteVersionIds.findIndex((remote) => remote.id === local.id) === -1);
        const wfModifiedInEither = [];
        wfLocalVersionIds.forEach((localWorkflow) => {
            const remoteWorkflowWithSameId = wfRemoteVersionIds.find((removeWorkflow) => removeWorkflow.id === localWorkflow.id);
            if (!remoteWorkflowWithSameId) {
                return;
            }
            if ((0, source_control_helper_ee_1.isWorkflowModified)(localWorkflow, remoteWorkflowWithSameId)) {
                let name = (options?.preferLocalVersion ? localWorkflow?.name : remoteWorkflowWithSameId?.name) ??
                    'Workflow';
                if (localWorkflow.name &&
                    remoteWorkflowWithSameId?.name &&
                    localWorkflow.name !== remoteWorkflowWithSameId.name) {
                    name = options?.preferLocalVersion
                        ? `${localWorkflow.name} (Remote: ${remoteWorkflowWithSameId.name})`
                        : (name = `${remoteWorkflowWithSameId.name} (Local: ${localWorkflow.name})`);
                }
                wfModifiedInEither.push({
                    ...localWorkflow,
                    name,
                    versionId: options.preferLocalVersion
                        ? localWorkflow.versionId
                        : remoteWorkflowWithSameId.versionId,
                    localId: localWorkflow.versionId,
                    remoteId: remoteWorkflowWithSameId.versionId,
                });
            }
        });
        wfMissingInLocal.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name ?? 'Workflow',
                type: 'workflow',
                status: options.direction === 'push' ? 'deleted' : 'created',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: false,
                file: item.filename,
                updatedAt: item.updatedAt ?? new Date().toISOString(),
                owner: item.owner,
            });
        });
        wfMissingInRemote.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name ?? 'Workflow',
                type: 'workflow',
                status: options.direction === 'push' ? 'created' : 'deleted',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: options.direction === 'push' ? false : true,
                file: item.filename,
                updatedAt: item.updatedAt ?? new Date().toISOString(),
                owner: item.owner,
            });
        });
        wfModifiedInEither.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name ?? 'Workflow',
                type: 'workflow',
                status: 'modified',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: true,
                file: item.filename,
                updatedAt: item.updatedAt ?? new Date().toISOString(),
                owner: item.owner,
            });
        });
        return {
            wfRemoteVersionIds,
            wfLocalVersionIds,
            wfMissingInLocal,
            wfMissingInRemote,
            wfModifiedInEither,
        };
    }
    async getStatusCredentials(options, context, sourceControlledFiles) {
        const credRemoteIds = await this.sourceControlImportService.getRemoteCredentialsFromFiles(context);
        const credLocalIds = await this.sourceControlImportService.getLocalCredentialsFromDb(context);
        const credMissingInLocal = credRemoteIds.filter((remote) => credLocalIds.findIndex((local) => local.id === remote.id) === -1);
        const credMissingInRemote = credLocalIds.filter((local) => credRemoteIds.findIndex((remote) => remote.id === local.id) === -1);
        const credModifiedInEither = [];
        credLocalIds.forEach((local) => {
            const mismatchingCreds = credRemoteIds.find((remote) => {
                return remote.id === local.id && (remote.name !== local.name || remote.type !== local.type);
            });
            if (mismatchingCreds) {
                credModifiedInEither.push({
                    ...local,
                    name: options?.preferLocalVersion ? local.name : mismatchingCreds.name,
                });
            }
        });
        credMissingInLocal.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name ?? 'Credential',
                type: 'credential',
                status: options.direction === 'push' ? 'deleted' : 'created',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: false,
                file: item.filename,
                updatedAt: new Date().toISOString(),
                owner: item.ownedBy,
            });
        });
        credMissingInRemote.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name ?? 'Credential',
                type: 'credential',
                status: options.direction === 'push' ? 'created' : 'deleted',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: options.direction === 'push' ? false : true,
                file: item.filename,
                updatedAt: new Date().toISOString(),
                owner: item.ownedBy,
            });
        });
        credModifiedInEither.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name ?? 'Credential',
                type: 'credential',
                status: 'modified',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: true,
                file: item.filename,
                updatedAt: new Date().toISOString(),
                owner: item.ownedBy,
            });
        });
        return {
            credMissingInLocal,
            credMissingInRemote,
            credModifiedInEither,
        };
    }
    async getStatusVariables(options, sourceControlledFiles) {
        const varRemoteIds = await this.sourceControlImportService.getRemoteVariablesFromFile();
        const varLocalIds = await this.sourceControlImportService.getLocalVariablesFromDb();
        const varMissingInLocal = varRemoteIds.filter((remote) => varLocalIds.findIndex((local) => local.id === remote.id) === -1);
        const varMissingInRemote = varLocalIds.filter((local) => varRemoteIds.findIndex((remote) => remote.id === local.id) === -1);
        const varModifiedInEither = [];
        varLocalIds.forEach((local) => {
            const mismatchingIds = varRemoteIds.find((remote) => (remote.id === local.id && remote.key !== local.key) ||
                (remote.id !== local.id && remote.key === local.key));
            if (mismatchingIds) {
                varModifiedInEither.push(options.preferLocalVersion ? local : mismatchingIds);
            }
        });
        varMissingInLocal.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.key,
                type: 'variables',
                status: options.direction === 'push' ? 'deleted' : 'created',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: false,
                file: (0, source_control_helper_ee_1.getVariablesPath)(this.gitFolder),
                updatedAt: new Date().toISOString(),
            });
        });
        varMissingInRemote.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.key,
                type: 'variables',
                status: options.direction === 'push' ? 'created' : 'deleted',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: options.direction === 'push' ? false : true,
                file: (0, source_control_helper_ee_1.getVariablesPath)(this.gitFolder),
                updatedAt: new Date().toISOString(),
            });
        });
        varModifiedInEither.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.key,
                type: 'variables',
                status: 'modified',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: true,
                file: (0, source_control_helper_ee_1.getVariablesPath)(this.gitFolder),
                updatedAt: new Date().toISOString(),
            });
        });
        return {
            varMissingInLocal,
            varMissingInRemote,
            varModifiedInEither,
        };
    }
    async getStatusTagsMappings(options, context, sourceControlledFiles) {
        const lastUpdatedTag = await this.tagRepository.find({
            order: { updatedAt: 'DESC' },
            take: 1,
            select: ['updatedAt'],
        });
        const lastUpdatedDate = lastUpdatedTag[0]?.updatedAt ?? new Date();
        const tagMappingsRemote = await this.sourceControlImportService.getRemoteTagsAndMappingsFromFile(context);
        const tagMappingsLocal = await this.sourceControlImportService.getLocalTagsAndMappingsFromDb(context);
        const tagsMissingInLocal = tagMappingsRemote.tags.filter((remote) => tagMappingsLocal.tags.findIndex((local) => local.id === remote.id) === -1);
        const tagsMissingInRemote = tagMappingsLocal.tags.filter((local) => tagMappingsRemote.tags.findIndex((remote) => remote.id === local.id) === -1);
        const tagsModifiedInEither = [];
        tagMappingsLocal.tags.forEach((local) => {
            const mismatchingIds = tagMappingsRemote.tags.find((remote) => remote.id === local.id && remote.name !== local.name);
            if (!mismatchingIds) {
                return;
            }
            tagsModifiedInEither.push(options.preferLocalVersion ? local : mismatchingIds);
        });
        const mappingsMissingInLocal = tagMappingsRemote.mappings.filter((remote) => tagMappingsLocal.mappings.findIndex((local) => local.tagId === remote.tagId && local.workflowId === remote.workflowId) === -1);
        const mappingsMissingInRemote = tagMappingsLocal.mappings.filter((local) => tagMappingsRemote.mappings.findIndex((remote) => remote.tagId === local.tagId && remote.workflowId === remote.workflowId) === -1);
        tagsMissingInLocal.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name,
                type: 'tags',
                status: options.direction === 'push' ? 'deleted' : 'created',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: false,
                file: (0, source_control_helper_ee_1.getTagsPath)(this.gitFolder),
                updatedAt: lastUpdatedDate.toISOString(),
            });
        });
        tagsMissingInRemote.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name,
                type: 'tags',
                status: options.direction === 'push' ? 'created' : 'deleted',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: options.direction === 'push' ? false : true,
                file: (0, source_control_helper_ee_1.getTagsPath)(this.gitFolder),
                updatedAt: lastUpdatedDate.toISOString(),
            });
        });
        tagsModifiedInEither.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name,
                type: 'tags',
                status: 'modified',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: true,
                file: (0, source_control_helper_ee_1.getTagsPath)(this.gitFolder),
                updatedAt: lastUpdatedDate.toISOString(),
            });
        });
        return {
            tagsMissingInLocal,
            tagsMissingInRemote,
            tagsModifiedInEither,
            mappingsMissingInLocal,
            mappingsMissingInRemote,
        };
    }
    async getStatusFoldersMapping(options, context, sourceControlledFiles) {
        const lastUpdatedFolder = await this.folderRepository.find({
            order: { updatedAt: 'DESC' },
            take: 1,
            select: ['updatedAt'],
        });
        const lastUpdatedDate = lastUpdatedFolder[0]?.updatedAt ?? new Date();
        const foldersMappingsRemote = await this.sourceControlImportService.getRemoteFoldersAndMappingsFromFile(context);
        const foldersMappingsLocal = await this.sourceControlImportService.getLocalFoldersAndMappingsFromDb(context);
        const foldersMissingInLocal = foldersMappingsRemote.folders.filter((remote) => foldersMappingsLocal.folders.findIndex((local) => local.id === remote.id) === -1);
        const foldersMissingInRemote = foldersMappingsLocal.folders.filter((local) => foldersMappingsRemote.folders.findIndex((remote) => remote.id === local.id) === -1);
        const foldersModifiedInEither = [];
        foldersMappingsLocal.folders.forEach((local) => {
            const mismatchingIds = foldersMappingsRemote.folders.find((remote) => remote.id === local.id &&
                (remote.name !== local.name || remote.parentFolderId !== local.parentFolderId));
            if (!mismatchingIds) {
                return;
            }
            foldersModifiedInEither.push(options.preferLocalVersion ? local : mismatchingIds);
        });
        foldersMissingInLocal.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name,
                type: 'folders',
                status: options.direction === 'push' ? 'deleted' : 'created',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: false,
                file: (0, source_control_helper_ee_1.getFoldersPath)(this.gitFolder),
                updatedAt: lastUpdatedDate.toISOString(),
            });
        });
        foldersMissingInRemote.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name,
                type: 'folders',
                status: options.direction === 'push' ? 'created' : 'deleted',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: options.direction === 'push' ? false : true,
                file: (0, source_control_helper_ee_1.getFoldersPath)(this.gitFolder),
                updatedAt: lastUpdatedDate.toISOString(),
            });
        });
        foldersModifiedInEither.forEach((item) => {
            sourceControlledFiles.push({
                id: item.id,
                name: item.name,
                type: 'folders',
                status: 'modified',
                location: options.direction === 'push' ? 'local' : 'remote',
                conflict: true,
                file: (0, source_control_helper_ee_1.getFoldersPath)(this.gitFolder),
                updatedAt: lastUpdatedDate.toISOString(),
            });
        });
        return {
            foldersMissingInLocal,
            foldersMissingInRemote,
            foldersModifiedInEither,
        };
    }
};
exports.SourceControlStatusService = SourceControlStatusService;
exports.SourceControlStatusService = SourceControlStatusService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        source_control_git_service_ee_1.SourceControlGitService,
        source_control_import_service_ee_1.SourceControlImportService,
        source_control_preferences_service_ee_1.SourceControlPreferencesService,
        db_1.TagRepository,
        db_1.FolderRepository,
        event_service_1.EventService])
], SourceControlStatusService);
//# sourceMappingURL=source-control-status.service.ee.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportEntitiesCommand = void 0;
const decorators_1 = require("@n8n/decorators");
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const di_1 = require("@n8n/di");
const base_command_1 = require("../base-command");
const export_service_1 = require("../../services/export.service");
const flagsSchema = zod_1.z.object({
    outputDir: zod_1.z
        .string()
        .describe('Output directory path')
        .default(path_1.default.join(__dirname, './outputs')),
});
let ExportEntitiesCommand = class ExportEntitiesCommand extends base_command_1.BaseCommand {
    async run() {
        const outputDir = this.flags.outputDir;
        await di_1.Container.get(export_service_1.ExportService).exportEntities(outputDir);
    }
    catch(error) {
        this.logger.error('❌ Error exporting entities. See log messages for details. \n');
        this.logger.error('Error details:');
        this.logger.error('\n====================================\n');
        this.logger.error(`${error.message} \n`);
    }
};
exports.ExportEntitiesCommand = ExportEntitiesCommand;
exports.ExportEntitiesCommand = ExportEntitiesCommand = __decorate([
    (0, decorators_1.Command)({
        name: 'export:entities',
        description: 'Export database entities to JSON files',
        examples: ['', '--outputDir=./exports', '--outputDir=/path/to/backup'],
        flagsSchema,
    })
], ExportEntitiesCommand);
//# sourceMappingURL=entities.js.map
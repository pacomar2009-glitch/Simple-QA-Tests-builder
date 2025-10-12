"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var VectorStoreMongoDBAtlas_node_exports = {};
__export(VectorStoreMongoDBAtlas_node_exports, {
  EMBEDDING_NAME: () => EMBEDDING_NAME,
  METADATA_FIELD_NAME: () => METADATA_FIELD_NAME,
  MONGODB_COLLECTION_NAME: () => MONGODB_COLLECTION_NAME,
  MONGODB_CREDENTIALS: () => MONGODB_CREDENTIALS,
  POST_FILTER_NAME: () => POST_FILTER_NAME,
  PRE_FILTER_NAME: () => PRE_FILTER_NAME,
  VECTOR_INDEX_NAME: () => VECTOR_INDEX_NAME,
  VectorStoreMongoDBAtlas: () => VectorStoreMongoDBAtlas,
  getCollectionName: () => getCollectionName,
  getCollections: () => getCollections,
  getDatabase: () => getDatabase,
  getEmbeddingFieldName: () => getEmbeddingFieldName,
  getFilterValue: () => getFilterValue,
  getMetadataFieldName: () => getMetadataFieldName,
  getMongoClient: () => getMongoClient,
  getParameter: () => getParameter,
  getVectorIndexName: () => getVectorIndexName,
  mongoConfig: () => mongoConfig
});
module.exports = __toCommonJS(VectorStoreMongoDBAtlas_node_exports);
var import_mongodb = require("@langchain/mongodb");
var import_mongodb2 = require("mongodb");
var import_n8n_workflow = require("n8n-workflow");
var import_sharedFields = require("../../../utils/sharedFields");
var import_createVectorStoreNode = require("../shared/createVectorStoreNode/createVectorStoreNode");
const MONGODB_CREDENTIALS = "mongoDb";
const MONGODB_COLLECTION_NAME = "mongoCollection";
const VECTOR_INDEX_NAME = "vectorIndexName";
const EMBEDDING_NAME = "embedding";
const METADATA_FIELD_NAME = "metadata_field";
const PRE_FILTER_NAME = "preFilter";
const POST_FILTER_NAME = "postFilterPipeline";
const mongoCollectionRLC = {
  displayName: "MongoDB Collection",
  name: MONGODB_COLLECTION_NAME,
  type: "resourceLocator",
  default: { mode: "list", value: "" },
  required: true,
  modes: [
    {
      displayName: "From List",
      name: "list",
      type: "list",
      typeOptions: {
        searchListMethod: "mongoCollectionSearch"
        // Method to fetch collections
      }
    },
    {
      displayName: "Name",
      name: "name",
      type: "string",
      placeholder: "e.g. my_collection"
    }
  ]
};
const vectorIndexName = {
  displayName: "Vector Index Name",
  name: VECTOR_INDEX_NAME,
  type: "string",
  default: "",
  description: "The name of the vector index",
  required: true
};
const embeddingField = {
  displayName: "Embedding",
  name: EMBEDDING_NAME,
  type: "string",
  default: "embedding",
  description: "The field with the embedding array",
  required: true
};
const metadataField = {
  displayName: "Metadata Field",
  name: METADATA_FIELD_NAME,
  type: "string",
  default: "text",
  description: "The text field of the raw data",
  required: true
};
const sharedFields = [
  mongoCollectionRLC,
  embeddingField,
  metadataField,
  vectorIndexName
];
const mongoNamespaceField = {
  displayName: "Namespace",
  name: "namespace",
  type: "string",
  description: "Logical partition for documents. Uses metadata.namespace field for filtering.",
  default: ""
};
const preFilterField = {
  displayName: "Pre Filter",
  name: PRE_FILTER_NAME,
  type: "json",
  typeOptions: {
    alwaysOpenEditWindow: true
  },
  default: "",
  placeholder: '{ "key": "value" }',
  hint: 'This is a filter applied in the $vectorSearch stage <a href="https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#atlas-vector-search-pre-filter">here</a>',
  required: true,
  description: "MongoDB Atlas Vector Search pre-filter"
};
const postFilterField = {
  displayName: "Post Filter Pipeline",
  name: POST_FILTER_NAME,
  type: "json",
  typeOptions: {
    alwaysOpenEditWindow: true
  },
  default: "",
  placeholder: '[{ "$match": { "$gt": "1950-01-01" }, ... }]',
  hint: 'Learn more about aggregation pipeline <a href="https://docs.mongodb.com/manual/core/aggregation-pipeline/">here</a>',
  required: true,
  description: "MongoDB aggregation pipeline in JSON format"
};
const retrieveFields = [
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    placeholder: "Add Option",
    default: {},
    options: [mongoNamespaceField, import_sharedFields.metadataFilterField, preFilterField, postFilterField]
  }
];
const insertFields = [
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    placeholder: "Add Option",
    default: {},
    options: [
      {
        displayName: "Clear Namespace",
        name: "clearNamespace",
        type: "boolean",
        default: false,
        description: "Whether to clear documents in the namespace before inserting new data"
      },
      mongoNamespaceField
    ]
  }
];
const mongoConfig = {
  client: null,
  connectionString: "",
  nodeVersion: 0
};
async function getMongoClient(context, version) {
  const credentials = await context.getCredentials(MONGODB_CREDENTIALS);
  const connectionString = credentials.connectionString;
  if (!mongoConfig.client || mongoConfig.connectionString !== connectionString || mongoConfig.nodeVersion !== version) {
    if (mongoConfig.client) {
      await mongoConfig.client.close();
    }
    mongoConfig.connectionString = connectionString;
    mongoConfig.nodeVersion = version;
    mongoConfig.client = new import_mongodb2.MongoClient(connectionString, {
      appName: "devrel.integration.n8n_vector_integ",
      driverInfo: {
        name: "n8n_vector",
        version: version.toString()
      }
    });
    await mongoConfig.client.connect();
  }
  return mongoConfig.client;
}
async function getDatabase(context, client) {
  const credentials = await context.getCredentials(MONGODB_CREDENTIALS);
  return client.db(credentials.database);
}
async function getCollections() {
  try {
    const client = await getMongoClient(this, this.getNode().typeVersion);
    const db = await getDatabase(this, client);
    const collections = await db.listCollections().toArray();
    const results = collections.map((collection) => ({
      name: collection.name,
      value: collection.name
    }));
    return { results };
  } catch (error) {
    throw new import_n8n_workflow.NodeOperationError(this.getNode(), `Error: ${error.message}`);
  }
}
function getParameter(key, context, itemIndex) {
  const value = context.getNodeParameter(key, itemIndex, "", {
    extractValue: true
  });
  if (typeof value !== "string") {
    throw new import_n8n_workflow.NodeOperationError(context.getNode(), `Parameter ${key} must be a string`);
  }
  return value;
}
const getCollectionName = getParameter.bind(null, MONGODB_COLLECTION_NAME);
const getVectorIndexName = getParameter.bind(null, VECTOR_INDEX_NAME);
const getEmbeddingFieldName = getParameter.bind(null, EMBEDDING_NAME);
const getMetadataFieldName = getParameter.bind(null, METADATA_FIELD_NAME);
function getFilterValue(name, context, itemIndex) {
  const options = context.getNodeParameter("options", itemIndex, {});
  if (options[name]) {
    if (typeof options[name] === "string") {
      try {
        return JSON.parse(options[name]);
      } catch (error) {
        throw new import_n8n_workflow.NodeOperationError(context.getNode(), `Error: ${error.message}`, {
          itemIndex,
          description: `Could not parse JSON for ${name}`
        });
      }
    }
    throw new import_n8n_workflow.NodeOperationError(context.getNode(), "Error: No JSON string provided.", {
      itemIndex,
      description: `Could not parse JSON for ${name}`
    });
  }
  return void 0;
}
class ExtendedMongoDBAtlasVectorSearch extends import_mongodb.MongoDBAtlasVectorSearch {
  constructor(embeddings, options, preFilter, postFilterPipeline) {
    super(embeddings, options);
    this.preFilter = preFilter;
    this.postFilterPipeline = postFilterPipeline;
  }
  async similaritySearchVectorWithScore(query, k) {
    const mergedFilter = {
      preFilter: this.preFilter,
      postFilterPipeline: this.postFilterPipeline
    };
    return await super.similaritySearchVectorWithScore(query, k, mergedFilter);
  }
}
class VectorStoreMongoDBAtlas extends (0, import_createVectorStoreNode.createVectorStoreNode)({
  meta: {
    displayName: "MongoDB Atlas Vector Store",
    name: "vectorStoreMongoDBAtlas",
    description: "Work with your data in MongoDB Atlas Vector Store",
    icon: { light: "file:mongodb.svg", dark: "file:mongodb.dark.svg" },
    docsUrl: "https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoremongodbatlas/",
    credentials: [
      {
        name: "mongoDb",
        required: true
      }
    ],
    operationModes: ["load", "insert", "retrieve", "update", "retrieve-as-tool"]
  },
  methods: { listSearch: { mongoCollectionSearch: getCollections } },
  retrieveFields,
  loadFields: retrieveFields,
  insertFields,
  sharedFields,
  async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
    try {
      const client = await getMongoClient(context, context.getNode().typeVersion);
      const db = await getDatabase(context, client);
      const collectionName = getCollectionName(context, itemIndex);
      const mongoVectorIndexName = getVectorIndexName(context, itemIndex);
      const embeddingFieldName = getEmbeddingFieldName(context, itemIndex);
      const metadataFieldName = getMetadataFieldName(context, itemIndex);
      const collection = db.collection(collectionName);
      const indexes = await collection.listSearchIndexes().toArray();
      const indexExists = indexes.some((index) => index.name === mongoVectorIndexName);
      if (!indexExists) {
        throw new import_n8n_workflow.NodeOperationError(context.getNode(), `Index ${mongoVectorIndexName} not found`, {
          itemIndex,
          description: "Please check that the index exists in your collection"
        });
      }
      const preFilter = getFilterValue(PRE_FILTER_NAME, context, itemIndex);
      const postFilterPipeline = getFilterValue(
        POST_FILTER_NAME,
        context,
        itemIndex
      );
      return new ExtendedMongoDBAtlasVectorSearch(
        embeddings,
        {
          collection,
          indexName: mongoVectorIndexName,
          // Default index name
          textKey: metadataFieldName,
          // Field containing raw text
          embeddingKey: embeddingFieldName
          // Field containing embeddings
        },
        preFilter ?? {},
        postFilterPipeline
      );
    } catch (error) {
      if (error instanceof import_n8n_workflow.NodeOperationError) {
        throw error;
      }
      throw new import_n8n_workflow.NodeOperationError(context.getNode(), `Error: ${error.message}`, {
        itemIndex,
        description: "Please check your MongoDB Atlas connection details"
      });
    }
  },
  async populateVectorStore(context, embeddings, documents, itemIndex) {
    try {
      const client = await getMongoClient(context, context.getNode().typeVersion);
      const db = await getDatabase(context, client);
      const collectionName = getCollectionName(context, itemIndex);
      const mongoVectorIndexName = getVectorIndexName(context, itemIndex);
      const embeddingFieldName = getEmbeddingFieldName(context, itemIndex);
      const metadataFieldName = getMetadataFieldName(context, itemIndex);
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        await db.createCollection(collectionName);
      }
      const collection = db.collection(collectionName);
      await ExtendedMongoDBAtlasVectorSearch.fromDocuments(documents, embeddings, {
        collection,
        indexName: mongoVectorIndexName,
        // Default index name
        textKey: metadataFieldName,
        // Field containing raw text
        embeddingKey: embeddingFieldName
        // Field containing embeddings
      });
    } catch (error) {
      throw new import_n8n_workflow.NodeOperationError(context.getNode(), `Error: ${error.message}`, {
        itemIndex,
        description: "Please check your MongoDB Atlas connection details"
      });
    }
  }
}) {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EMBEDDING_NAME,
  METADATA_FIELD_NAME,
  MONGODB_COLLECTION_NAME,
  MONGODB_CREDENTIALS,
  POST_FILTER_NAME,
  PRE_FILTER_NAME,
  VECTOR_INDEX_NAME,
  VectorStoreMongoDBAtlas,
  getCollectionName,
  getCollections,
  getDatabase,
  getEmbeddingFieldName,
  getFilterValue,
  getMetadataFieldName,
  getMongoClient,
  getParameter,
  getVectorIndexName,
  mongoConfig
});
//# sourceMappingURL=VectorStoreMongoDBAtlas.node.js.map
import { MongoClient, WithId, Document, Collection } from "mongodb";
import { ArchiveSource, InputSource } from "./types";
import moment from 'moment';

const setupMongoConnection = (uri: string): MongoClient => {
  const client = new MongoClient(uri);
  client.connect();
  return client;
}

const processDocumentMove = async (document: WithId<Document>, destCol: Collection<Document>, database: string, collection: string): Promise<boolean> => {
  try {
    await destCol.updateOne({ _id: document._id }, { $set: document }, { upsert: true });
  } catch (e) {
    console.log(`${database}.${collection}: Failed to upsert ${document._id} to the archive DB`, e);
    return false;
  }
  return true;
}

const processSingularSource = async (sourceClient: MongoClient, destClient: MongoClient, archiveSource: ArchiveSource) => {
  const { database, collection, field, archiveDays } = archiveSource;

  const srcDB = sourceClient.db(database);
  const destDB = destClient.db(database);

  const srcCol = srcDB.collection(collection);
  const destCol = destDB.collection(collection);

  const archiveBeforeTS = moment().subtract(archiveDays, 'days').toDate();
  const olderDocuments = await srcCol.find({ [field]: { $lt: archiveBeforeTS } }).toArray();
  console.log(`${database}.${collection}: Found ${olderDocuments.length} to archive`);
  if (olderDocuments.length == 0) {
    return;
  }

  // Only process 1 at a time to ensure order
  const executors = [...new Array(1)];
  let i = 0;
  await Promise.all(executors.map(async () => {
    do {
      const document = olderDocuments[i];
      i++;

      const moveOk = await processDocumentMove(document, destCol, database, collection);
      if (moveOk) {
        console.log(`${database}.${collection}: Move OK; Removing document ${document._id} from source collection`);
        await srcCol.deleteOne(document);
      } else {
        console.log(`${database}.${collection}: Move failed, not processing any more documents`);
        return;
      }
    } while (i < olderDocuments.length)
  }))
}

const processArchiving = async (sourceClient: MongoClient, destClient: MongoClient, archiveSources: ArchiveSource[]) => {
  const executors = [...new Array(Math.min(5, archiveSources.length))];
  let i = 0;
  await Promise.all(executors.map(async () => {
    do {
      const archiveSource = archiveSources[i];
      i++;

      await processSingularSource(sourceClient, destClient, archiveSource);
    } while (i < archiveSources.length)
  }));
}

(async () => {
  const archiveConfig = JSON.parse(process.env.ARCHIVE_CONFIGURATION!) as InputSource;

  const sourceClient = setupMongoConnection(archiveConfig.sourceCluster);
  const destClient = setupMongoConnection(archiveConfig.destinationCluster);

  await processArchiving(sourceClient, destClient, archiveConfig.archiveSources);

  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
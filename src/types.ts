export interface InputSource {
  sourceCluster: string;
  destinationCluster: string;
  archiveSources: ArchiveSource[];
}

export interface ArchiveSource {
  database: string;
  collection: string;
  field: string;
  archiveDays: number;
  username: string;
  password: string;
}
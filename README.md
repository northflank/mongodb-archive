#### MongoDB Archive Tool

This tool can be run as a cron-job on Northflank to perform an archive setup similar to the Atlas offering.

This requires the environment variable `ARCHIVE_CONFIGURATION` which is a json string with the following type:

```
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
}
```

- `sourceCluster` should be the `MONGO_SRV_ADMIN` of the source cluster which data will be taken from
- `destinationCluster` should be the `MONGO_SRV_ADMIN` of the archive cluster
- `archiveSources` is an 
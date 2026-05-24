// The legacy single-document API (saveDocument / loadDocument / clearDocument)
// is gone in Phase 7. The runtime persistence path now goes through
// ./documentStore which manages a multi-document index, and the v1 → v2
// migration happens automatically inside documentRegistry.migrateLegacyV1.
//
// This file is kept as a deprecation marker — re-exporting the new entry
// points under the old names would tempt callers back into a "one active
// document" mental model. Use useDocumentStore directly instead.

export {} // intentional empty module

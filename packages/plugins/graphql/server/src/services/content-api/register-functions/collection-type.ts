import type { Strapi, Schema } from '@strapi/types';
import type { TypeRegistry } from '../../type-registry';

const registerCollectionType = (
  contentType: Schema.CollectionType,
  {
    registry,
    strapi,
    builders,
  }: {
    registry: TypeRegistry;
    strapi: Strapi;
    builders: any;
  }
) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { KINDS } = getService('constants');

  const extension = getService('extension');

  // Types name (as string)
  const types = {
    base: naming.getTypeName(contentType),
    response: naming.getEntityResponseName(contentType),
    responseCollection: naming.getEntityResponseCollectionName(contentType),
    queries: naming.getEntityQueriesTypeName(contentType),
    mutations: naming.getEntityMutationsTypeName(contentType),
  };

  const getConfig = (kind: string) => ({ kind, contentType });

  // Type definition
  registry.register(types.base, builders.buildTypeDefinition(contentType), getConfig(KINDS.type));

  // Responses definition
  registry.register(
    types.response,
    builders.buildResponseDefinition(contentType),
    getConfig(KINDS.entityResponse)
  );

  registry.register(
    types.responseCollection,
    builders.buildResponseCollectionDefinition(contentType),
    getConfig(KINDS.entityResponseCollection)
  );

  if (extension.shadowCRUD(contentType.uid).areQueriesEnabled()) {
    // Query extensions
    registry.register(
      types.queries,
      builders.buildCollectionTypeQueries(contentType),
      getConfig(KINDS.query)
    );
  }

  if (extension.shadowCRUD(contentType.uid).areMutationsEnabled()) {
    // Mutation extensions
    registry.register(
      types.mutations,
      builders.buildCollectionTypeMutations(contentType),
      getConfig(KINDS.mutation)
    );
  }
};

export { registerCollectionType };

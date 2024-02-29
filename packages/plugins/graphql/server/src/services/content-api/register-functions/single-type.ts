import type { Strapi, Schema } from '@strapi/types';
import type { TypeRegistry } from '../../type-registry';

const registerSingleType = (
  contentType: Schema.SingleType,
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

  const types = {
    base: naming.getTypeName(contentType),
    response: naming.getEntityResponseName(contentType),
    responseCollection: naming.getEntityResponseCollectionName(contentType),
    queries: naming.getEntityQueriesTypeName(contentType),
    mutations: naming.getEntityMutationsTypeName(contentType),
  };

  const getConfig = (kind: string) => ({ kind, contentType });

  // Single type's definition
  registry.register(types.base, builders.buildTypeDefinition(contentType), getConfig(KINDS.type));

  // Responses definition
  registry.register(
    types.response,
    builders.buildResponseDefinition(contentType),
    getConfig(KINDS.entityResponse)
  );

  if (extension.shadowCRUD(contentType.uid).areQueriesEnabled()) {
    // Queries
    registry.register(
      types.queries,
      builders.buildSingleTypeQueries(contentType),
      getConfig(KINDS.query)
    );
  }

  if (extension.shadowCRUD(contentType.uid).areMutationsEnabled()) {
    // Mutations
    registry.register(
      types.mutations,
      builders.buildSingleTypeMutations(contentType),
      getConfig(KINDS.mutation)
    );
  }
};

export { registerSingleType };
